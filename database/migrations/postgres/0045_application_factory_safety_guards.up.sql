-- sdkwork:migration
-- id: 0045_application_factory_safety_guards
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Make the installation aggregate survive an operator mistake, and make
--   the application-factory uninstall contract enforceable at the database
--   boundary instead of at the caller's discretion.
--
--   APPLICATION_FACTORY_DEPLOYMENT_SPEC.md section 3 defines stage 6 (uninstall /
--   retire) as `installation disabled; credentials retired; environments
--   disabled; ... history remains readable`, and section 9 states the rule
--   directly: `Deleting a committed row is never compensation` and `Uninstall
--   disables/retires/archives; ... the uninstall path contains no DELETE on
--   installation, credentials, carrier, releases, or audits`. Until this
--   migration both installation children inherited the default
--   `ON DELETE CASCADE` of 0039, so one `DELETE FROM
--   iam_application_installation` silently destroyed every environment row and,
--   through it, every credential row: the per-environment domains, the OAuth
--   client ids, the rotation history, and the evidence of which environments a
--   token could ever have been issued for. The delete also *succeeded*, so a
--   caller could satisfy a foreign key while violating the lifecycle contract.
--
--   1. `iam_application_installation_environment.installation_id` and
--      `iam_application_installation_credential.installation_environment_id`
--      are recreated `ON DELETE RESTRICT`, keeping `ON UPDATE NO ACTION`. The
--      constraint is discovered in `pg_constraint` by its `conrelid`/`confrelid`
--      pair and `confdeltype = 'c'` — never by an assumed `_fkey` name, because
--      PostgreSQL already truncated the credential constraint's generated name.
--      The child/parent column lists and the DDL targets are read back from the
--      catalog and schema-qualified, so the same block is correct in a
--      non-public module schema and re-running it finds nothing left to change.
--      `DELETE` on an installation with children now raises a foreign-key error
--      that names the child table instead of erasing the history.
--
--   2. `env_key` gets a closed vocabulary
--      (`development`, `test`, `staging`, `demo`, `production`). That is the
--      environment set the hosting plan, the deploy plane, and the console use
--      (APPLICATION_FACTORY_DEPLOYMENT_SPEC.md section 7), and the runtime gate
--      in `installation_lifecycle.rs` decides issuance by matching it. A
--      free-form key made an installation's environment set unverifiable: the
--      gate could be satisfied by an environment no carrier hosts. Rows that
--      carry another key are reported by id *before* the ALTER runs instead of
--      surfacing as a bare constraint violation. Soft-deleted rows are included
--      in the report and labelled, because a CHECK applies to every row of the
--      table; the report says whether a live registration or only history is
--      affected.
--
--   3. `ownership_scope` becomes immutable and `owner_user_id` becomes
--      write-once at the database: a `BEFORE UPDATE OF ownership_scope,
--      owner_user_id` trigger on `iam_application_installation` refuses the
--      rewrite while the session setting `sdkwork.allow_ownership_scope_change`
--      is not `on`. APPLICATION_IDENTITY_SPEC.md section 4.1 and
--      APPLICATION_FACTORY_DEPLOYMENT_SPEC.md section 4 require the release
--      level to be fixed for the installation's lifetime, because the level is
--      the isolation key: a `TENANT` -> `USER` rewrite silently re-interprets
--      tenant-wide rows as one person's rows, and `USER` -> `TENANT` does the
--      reverse and leaks one person's data to the tenant. The setting is the
--      documented operator escape hatch for a supervised repair; it is a
--      session setting, so it cannot be enabled by a workload by accident.
--      Filling `owner_user_id` when it is currently NULL stays allowed: the
--      provisioning path fills it exactly once through `COALESCE(owner_user_id,
--      $n)` (`application_registry.rs`, the existing-installation UPDATE), and a
--      second, different owner is what the trigger refuses. The setting value
--      is read with `current_setting(..., true)` so a session that never sets it
--      is treated as "not allowed" rather than as an error.
--
--   Everything here is idempotent: the foreign-key block finds no `cascade` rule
--   left on a re-run, the CHECK is dropped and re-added by name, and the trigger
--   uses `CREATE OR REPLACE FUNCTION` plus `DROP TRIGGER IF EXISTS`.
--
--   No `.down.sql` ships with this migration. DATABASE_FRAMEWORK_SPEC.md section
--   7.1 permits a down file only for a bounded, data-preserving reversal, and
--   every reversal available here destroys the safety property this migration
--   exists to add: restoring `ON DELETE CASCADE` re-arms the destructive delete,
--   dropping the trigger re-arms scope rewriting (which invalidates the
--   isolation key of tokens already issued), and dropping the environment CHECK
--   re-allows unclassified environments. The rollback strategy is therefore
--   forward-fix: ship 0046 that corrects the guard in place.
-- reversible: false
-- rollback: forward-fix (every available down direction removes a guard and
--   re-arms the hazard it prevents; a correction is a new forward migration)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_application_installation_environment and
--   iam_application_installation_credential for the constraint replacement
--   (both are scanned once to validate the recreated foreign keys), and on
--   iam_application_installation for the CHECK and the trigger
-- lock_timeout: 2s
-- statement_timeout: 120s
-- rewrite: none. Catalog-only constraint and trigger changes; the two foreign
--   keys are re-validated by one scan each because a validated constraint is
--   what makes RESTRICT trustworthy for rows written before it existed.
-- wal: catalog updates only; no table rewrite and no row image is emitted for
--   the trigger, the CHECK, or the foreign-key swap.
-- backfill: none. No column is added and no stored value is rewritten; the
--   pre-flight report refuses the migration rather than guessing a key.
-- observability: the pre-flight failure lists every offending row with its id,
--   tenant, installation, and (for environments) whether the row is live; after
--   apply a destructive DELETE fails with a foreign-key detail naming the child
--   table, which is visible in the error log without extra instrumentation.
-- cancellation: safe. All statements share one BEGIN/COMMIT, so a cancelled or
--   failed run rolls back to the pre-migration catalog.
-- recovery: `pnpm run db:migrate` replays from `ops_schema_migration_history`;
--   a defect is fixed by a new forward migration (0046+), never by editing this
--   file.

BEGIN;

-- 1. Turn both cascading deletes into RESTRICT.
--
--    A DO block because the constraint names are generated (and truncated) by
--    PostgreSQL, and because a drop/recreate must be a no-op once the delete
--    rule is already restrictive. Column lists and DDL targets come from the
--    catalog, so this is correct for a composite key and for a module schema
--    that is not on the default search path.
DO $$
DECLARE
    pair RECORD;
    foreign_key pg_constraint%ROWTYPE;
    child_relation REGCLASS;
    parent_relation REGCLASS;
    child_qualified TEXT;
    parent_qualified TEXT;
    child_columns TEXT;
    parent_columns TEXT;
    cascade_left BIGINT;
    foreign_keys BIGINT;
BEGIN
    FOR pair IN
        SELECT child_table, parent_table
          FROM (VALUES
                    ('iam_application_installation_environment',
                     'iam_application_installation'),
                    ('iam_application_installation_credential',
                     'iam_application_installation_environment')
               ) AS pairs (child_table, parent_table)
    LOOP
        child_relation := pair.child_table::regclass;
        parent_relation := pair.parent_table::regclass;

        SELECT FORMAT('%I.%I', namespace.nspname, relation.relname)
          INTO child_qualified
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE relation.oid = child_relation;
        SELECT FORMAT('%I.%I', namespace.nspname, relation.relname)
          INTO parent_qualified
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE relation.oid = parent_relation;

        FOR foreign_key IN
            SELECT *
              FROM pg_constraint constraint_row
             WHERE constraint_row.contype = 'f'
               AND constraint_row.conrelid = child_relation
               AND constraint_row.confrelid = parent_relation
               AND constraint_row.confdeltype = 'c'
        LOOP
            -- `ON UPDATE` is not the hazard here; refuse to silently change it
            -- if a lineage ever carried something other than the PostgreSQL
            -- default.
            IF foreign_key.confupdtype <> 'a' THEN
                RAISE EXCEPTION
                    '0045 expected ON UPDATE NO ACTION on foreign key % of % -> %, found update rule ''%''',
                    foreign_key.conname, pair.child_table, pair.parent_table,
                    foreign_key.confupdtype
                    USING ERRCODE = 'check_violation';
            END IF;

            SELECT STRING_AGG(QUOTE_IDENT(attribute.attname), ', ' ORDER BY key.ord)
              INTO child_columns
              FROM UNNEST(foreign_key.conkey) WITH ORDINALITY AS key(attnum, ord)
              JOIN pg_attribute attribute
                ON attribute.attrelid = foreign_key.conrelid
               AND attribute.attnum = key.attnum;

            SELECT STRING_AGG(QUOTE_IDENT(attribute.attname), ', ' ORDER BY key.ord)
              INTO parent_columns
              FROM UNNEST(foreign_key.confkey) WITH ORDINALITY AS key(attnum, ord)
              JOIN pg_attribute attribute
                ON attribute.attrelid = foreign_key.confrelid
               AND attribute.attnum = key.attnum;

            EXECUTE FORMAT('ALTER TABLE %s DROP CONSTRAINT %I',
                           child_qualified, foreign_key.conname);
            EXECUTE FORMAT(
                'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s (%s) '
                'ON DELETE RESTRICT ON UPDATE NO ACTION',
                child_qualified, foreign_key.conname, child_columns,
                parent_qualified, parent_columns);
        END LOOP;

        SELECT COUNT(*)
          INTO cascade_left
          FROM pg_constraint constraint_row
         WHERE constraint_row.contype = 'f'
           AND constraint_row.conrelid = child_relation
           AND constraint_row.confrelid = parent_relation
           AND constraint_row.confdeltype = 'c';
        IF cascade_left > 0 THEN
            RAISE EXCEPTION
                '0045 could not replace the cascading delete on % -> %: % constraint(s) still cascade',
                pair.child_table, pair.parent_table, cascade_left
                USING ERRCODE = 'check_violation';
        END IF;

        -- The guard must exist, not merely be absent as a cascade: a lineage
        -- without this foreign key would let an orphan environment row outlive
        -- its installation.
        SELECT COUNT(*)
          INTO foreign_keys
          FROM pg_constraint constraint_row
         WHERE constraint_row.contype = 'f'
           AND constraint_row.conrelid = child_relation
           AND constraint_row.confrelid = parent_relation;
        IF foreign_keys = 0 THEN
            RAISE EXCEPTION
                '0045 expected a foreign key from % to %; the installation child guard cannot be installed on a lineage that lacks it',
                pair.child_table, pair.parent_table
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;
END $$;

-- 2. Close the environment vocabulary.
--
--    Report first: a failed ADD CONSTRAINT would abort with a bare violation
--    that names no row. `check_violation` matches the pre-flight style of 0044.
DO $$
DECLARE
    offending TEXT;
BEGIN
    SELECT STRING_AGG(
               FORMAT('id=%s tenant_id=%s installation_id=%s env_key=%L row=%s',
                      id, tenant_id, installation_id, env_key,
                      CASE
                          WHEN deleted_at IS NULL THEN 'live'
                          ELSE FORMAT('deleted_at=%s', deleted_at)
                      END),
               '; ' ORDER BY id)
      INTO offending
      FROM iam_application_installation_environment
     WHERE env_key NOT IN ('development', 'test', 'staging', 'demo', 'production');

    IF offending IS NOT NULL THEN
        RAISE EXCEPTION
            '0045 cannot close the env_key vocabulary (development, test, staging, demo, production); offending environment row(s): %',
            offending
            USING ERRCODE = 'check_violation',
                  HINT = 're-register the live row under one of the five keys and re-key or remove the deleted history before applying this migration';
    END IF;
END $$;

ALTER TABLE iam_application_installation_environment
    DROP CONSTRAINT IF EXISTS chk_iam_application_installation_environment_env_key;
ALTER TABLE iam_application_installation_environment
    ADD CONSTRAINT chk_iam_application_installation_environment_env_key
    CHECK (env_key IN ('development', 'test', 'staging', 'demo', 'production'));

-- 3. Freeze the release scope, and allow the owner pointer to be filled once.
--
--    The setting is read with `missing_ok = true`: an ordinary workload never
--    sets it, and that must mean "refuse", not "error on current_setting".
CREATE OR REPLACE FUNCTION iam_application_installation_guard_release_scope()
RETURNS trigger AS $$
DECLARE
    scope_change_allowed BOOLEAN;
BEGIN
    scope_change_allowed := LOWER(BTRIM(
        COALESCE(CURRENT_SETTING('sdkwork.allow_ownership_scope_change', true), '')))
        IN ('on', 'true', '1', 'yes');

    IF NEW.ownership_scope IS DISTINCT FROM OLD.ownership_scope
       AND NOT scope_change_allowed THEN
        RAISE EXCEPTION
            'installation %: ownership_scope is immutable (% -> %); a release level change is a new application and a new installation, not an update (set sdkwork.allow_ownership_scope_change = on only for a supervised repair)',
            OLD.id, OLD.ownership_scope, NEW.ownership_scope
            USING ERRCODE = 'check_violation';
    END IF;

    IF OLD.owner_user_id IS NOT NULL
       AND NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
       AND NOT scope_change_allowed THEN
        RAISE EXCEPTION
            'installation %: owner_user_id is write-once (already %, refusing %); a personal installation belongs to the owner it was provisioned for',
            OLD.id, OLD.owner_user_id, NEW.owner_user_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_iam_application_installation_guard_release_scope
    ON iam_application_installation;
CREATE TRIGGER trg_iam_application_installation_guard_release_scope
    BEFORE UPDATE OF ownership_scope, owner_user_id
    ON iam_application_installation
    FOR EACH ROW
    EXECUTE FUNCTION iam_application_installation_guard_release_scope();

COMMIT;
