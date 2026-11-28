-- sdkwork:migration
-- id: 0056_iam_enterprise_seat_management
-- engine: postgres
-- module: sdkwork-iam
-- purpose: WorkBuddy-aligned seat resizing, department policies, blacklist and
--   automatic allocation/reconciliation. The database function is shared by
--   service transactions and membership/directory triggers so every write path
--   obeys the same capacity, blacklist and unique-active-seat invariants.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: row/table locks on the two new tables and membership/order triggers
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

ALTER TABLE iam_application_enterprise_order ADD COLUMN IF NOT EXISTS seat_name TEXT;
ALTER TABLE iam_application_enterprise_seat
    ADD COLUMN IF NOT EXISTS allocation_method TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS policy_id TEXT;
ALTER TABLE iam_application_enterprise_seat
    ADD CONSTRAINT ck_iam_application_enterprise_seat_allocation
    CHECK (allocation_method IN ('manual', 'department_auto', 'department_login'));
ALTER TABLE iam_application_enterprise_seat
    ADD CONSTRAINT ck_iam_application_enterprise_seat_policy_method
    CHECK ((allocation_method = 'manual' AND policy_id IS NULL)
        OR (allocation_method IN ('department_auto', 'department_login') AND policy_id IS NOT NULL));

CREATE TABLE IF NOT EXISTS iam_application_enterprise_seat_policy (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL REFERENCES iam_application_enterprise_order(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    department_id TEXT NOT NULL,
    department_name TEXT NOT NULL,
    allocation_type TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_iam_application_enterprise_seat_policy_type CHECK (allocation_type IN ('auto', 'login')),
    CONSTRAINT ck_iam_application_enterprise_seat_policy_version CHECK (version >= 0)
);
-- Recreate the pre-release index under its canonical name so an installation
-- that applied the draft 0056 cannot retain the weaker auto/login uniqueness.
DROP INDEX IF EXISTS ux_iam_application_enterprise_seat_policy_department;
CREATE UNIQUE INDEX ux_iam_application_enterprise_seat_policy_department
    ON iam_application_enterprise_seat_policy (order_id, department_id);
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_seat_policy_order
    ON iam_application_enterprise_seat_policy (tenant_id, order_id, department_id);
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_seat_policy_department
    ON iam_application_enterprise_seat_policy (tenant_id, organization_id, department_id);

CREATE TABLE IF NOT EXISTS iam_application_enterprise_seat_blacklist (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL REFERENCES iam_application_enterprise_order(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    one_id_id TEXT,
    department_name TEXT,
    reason TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_iam_application_enterprise_seat_blacklist_reason CHECK (reason IS NULL OR length(reason) <= 500)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_seat_blacklist_user
    ON iam_application_enterprise_seat_blacklist (order_id, user_id);
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_seat_blacklist_order
    ON iam_application_enterprise_seat_blacklist (tenant_id, order_id, created_at DESC, id);

ALTER TABLE iam_application_enterprise_order_event
    DROP CONSTRAINT IF EXISTS ck_iam_application_enterprise_order_event_type;
ALTER TABLE iam_application_enterprise_order_event
    ADD CONSTRAINT ck_iam_application_enterprise_order_event_type CHECK (event_type IN (
        'created', 'link_issued', 'authorized', 'termination_requested',
        'termination_confirmed', 'expired', 'cancelled', 'seat_assigned', 'seat_released',
        'order_resized', 'seat_policy_created', 'seat_policy_updated', 'seat_policy_deleted',
        'seat_blacklist_added', 'seat_blacklist_removed', 'seats_bulk_released', 'seats_exported'
    ));

COMMENT ON COLUMN iam_application_enterprise_order.seat_name IS 'Display name of the licensed seat pool; nullable for legacy orders.';
COMMENT ON COLUMN iam_application_enterprise_seat.allocation_method IS
    'manual, department_auto or department_login. Membership, primary-department, user-status and blacklist changes release policy seats; manual seats survive membership changes but are released when blacklisted.';

-- Reconcile one enterprise, optionally narrowed by application.
-- Order rows are locked in a stable order, serializing manual assignment, policy
-- changes and authorization reconciliation. Login policies run only when the
-- caller explicitly asks for authorization reconciliation.
CREATE OR REPLACE FUNCTION iam_reconcile_enterprise_seats(
    p_tenant_id TEXT, p_user_id TEXT DEFAULT NULL, p_include_login BOOLEAN DEFAULT FALSE,
    p_application_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_seat RECORD;
    v_policy RECORD;
    v_user RECORD;
    v_active BIGINT;
    v_cap BIGINT;
    v_seat_id TEXT;
BEGIN
    FOR v_order IN
        SELECT * FROM iam_application_enterprise_order o
         WHERE o.enterprise_tenant_id = p_tenant_id AND o.order_status = 'active'
           AND o.deleted_at IS NULL AND o.authorization_mode = 'seat'
           AND (o.expires_at IS NULL OR o.expires_at > NOW())
           AND (p_application_id IS NULL OR o.application_id = p_application_id)
         ORDER BY o.id FOR UPDATE
    LOOP
        -- Eligibility is evaluated on the member's active primary assignment.
        -- The nearest ancestor policy wins, then policy id provides a stable
        -- final tie-break. Manual seats are excluded unless blacklisted.
        FOR v_seat IN
            SELECT s.* FROM iam_application_enterprise_seat s
             WHERE s.tenant_id = p_tenant_id AND s.order_id = v_order.id
               AND s.seat_status = 'active'
               AND (s.allocation_method <> 'manual' OR EXISTS (
                   SELECT 1 FROM iam_application_enterprise_seat_blacklist b
                    WHERE b.tenant_id = p_tenant_id AND b.order_id = v_order.id
                      AND b.user_id = s.user_id
               ))
               AND (p_user_id IS NULL OR s.user_id = p_user_id)
             ORDER BY s.id
        LOOP
            v_policy := NULL;
            SELECT p.* INTO v_policy
              FROM iam_application_enterprise_seat_policy p
              JOIN iam_department_closure c ON c.tenant_id = p.tenant_id
               AND c.organization_id = p.organization_id AND c.ancestor_department_id = p.department_id
              JOIN iam_department_assignment da ON da.tenant_id = c.tenant_id
               AND da.organization_id = c.organization_id AND da.department_id = c.descendant_department_id
               AND da.user_id = v_seat.user_id AND da.status = 'active' AND da.is_primary = 1
               AND (da.effective_from IS NULL OR da.effective_from = '' OR (da.effective_from ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND da.effective_from::timestamptz <= NOW()))
               AND (da.effective_to IS NULL OR da.effective_to = '' OR (da.effective_to ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND da.effective_to::timestamptz > NOW()))
              JOIN iam_organization_membership om ON om.tenant_id = p.tenant_id
               AND om.organization_id = p.organization_id AND om.user_id = v_seat.user_id
               AND om.status = 'active'
              JOIN iam_organization org ON org.tenant_id = p.tenant_id
               AND org.id = p.organization_id AND org.status = 'active'
              JOIN iam_department dept ON dept.tenant_id = p.tenant_id
               AND dept.organization_id = p.organization_id AND dept.id = p.department_id
               AND dept.status = 'active'
             WHERE p.tenant_id = p_tenant_id AND p.order_id = v_order.id
               AND (v_order.enterprise_organization_id = '0'
                    OR p.organization_id = v_order.enterprise_organization_id)
             ORDER BY c.depth, p.id
             LIMIT 1;
            IF v_policy.id IS NULL OR v_policy.id <> v_seat.policy_id
               OR NOT EXISTS (SELECT 1 FROM iam_tenant_member tm WHERE tm.tenant_id = p_tenant_id AND tm.user_id = v_seat.user_id AND tm.status = 'active')
               OR NOT EXISTS (SELECT 1 FROM iam_user u WHERE u.tenant_id = p_tenant_id AND u.id = v_seat.user_id AND u.status = 'active')
               OR EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist b WHERE b.tenant_id = p_tenant_id AND b.order_id = v_order.id AND b.user_id = v_seat.user_id) THEN
                UPDATE iam_application_enterprise_seat
                   SET seat_status = 'released', released_by = 'system', released_at = NOW(),
                       updated_at = NOW(), version = version + 1
                 WHERE tenant_id = p_tenant_id AND id = v_seat.id AND seat_status = 'active';
                INSERT INTO iam_application_enterprise_order_event
                    (id, tenant_id, order_id, event_type, actor_kind, actor_id, payload_json, created_at)
                VALUES ('iaeev_' || replace(gen_random_uuid()::text, '-', ''), v_order.tenant_id,
                        v_order.id, 'seat_released', 'system', NULL,
                        json_build_object('seatId', v_seat.id, 'reason',
                            CASE WHEN EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist b
                                               WHERE b.tenant_id = p_tenant_id AND b.order_id = v_order.id
                                                 AND b.user_id = v_seat.user_id)
                                 THEN 'blacklisted' ELSE 'membership_or_department_changed' END)::text, NOW());
            END IF;
        END LOOP;

        v_active := (SELECT COUNT(*) FROM iam_application_enterprise_seat
                      WHERE tenant_id = p_tenant_id AND order_id = v_order.id AND seat_status = 'active');
        v_cap := v_order.seat_count;
        FOR v_user IN
            SELECT u.id, chosen.id AS policy_id, chosen.allocation_type, chosen.organization_id
              FROM iam_user u
              JOIN iam_tenant_member tm ON tm.tenant_id = u.tenant_id AND tm.user_id = u.id AND tm.status = 'active'
              JOIN LATERAL (
                  SELECT p.id, p.allocation_type, p.organization_id
                    FROM iam_application_enterprise_seat_policy p
                    JOIN iam_department_closure c ON c.tenant_id = p.tenant_id
                     AND c.organization_id = p.organization_id AND c.ancestor_department_id = p.department_id
                    JOIN iam_department_assignment da ON da.tenant_id = c.tenant_id
                     AND da.organization_id = c.organization_id AND da.department_id = c.descendant_department_id
                     AND da.user_id = u.id AND da.status = 'active' AND da.is_primary = 1
                     AND (da.effective_from IS NULL OR da.effective_from = '' OR (da.effective_from ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND da.effective_from::timestamptz <= NOW()))
                     AND (da.effective_to IS NULL OR da.effective_to = '' OR (da.effective_to ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND da.effective_to::timestamptz > NOW()))
                    JOIN iam_organization_membership om ON om.tenant_id = p.tenant_id
                     AND om.organization_id = p.organization_id AND om.user_id = u.id AND om.status = 'active'
                    JOIN iam_organization org ON org.tenant_id = p.tenant_id
                     AND org.id = p.organization_id AND org.status = 'active'
                    JOIN iam_department dept ON dept.tenant_id = p.tenant_id
                     AND dept.organization_id = p.organization_id AND dept.id = p.department_id
                     AND dept.status = 'active'
                   WHERE p.tenant_id = p_tenant_id AND p.order_id = v_order.id
                     AND (v_order.enterprise_organization_id = '0'
                          OR p.organization_id = v_order.enterprise_organization_id)
                   ORDER BY c.depth, p.id
                   LIMIT 1
              ) chosen ON TRUE
             WHERE u.tenant_id = p_tenant_id AND u.status = 'active'
               AND (p_user_id IS NULL OR u.id = p_user_id)
               AND (p_include_login OR chosen.allocation_type = 'auto')
               AND NOT EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist b
                                WHERE b.tenant_id = p_tenant_id AND b.order_id = v_order.id AND b.user_id = u.id)
               AND NOT EXISTS (SELECT 1 FROM iam_application_enterprise_seat s
                                WHERE s.tenant_id = p_tenant_id AND s.order_id = v_order.id
                                  AND s.user_id = u.id AND s.seat_status = 'active')
             ORDER BY u.id
             FOR UPDATE OF u SKIP LOCKED
        LOOP
            EXIT WHEN v_active >= v_cap;
            v_seat_id := 'iaest_' || replace(gen_random_uuid()::text, '-', '');
            INSERT INTO iam_application_enterprise_seat
                (id, tenant_id, organization_id, order_id, application_id, user_id, seat_status,
                 assigned_by, assigned_at, allocation_method, policy_id, created_at, updated_at, version)
            VALUES (v_seat_id, p_tenant_id, CASE WHEN v_order.enterprise_organization_id = '0' THEN v_user.organization_id ELSE v_order.enterprise_organization_id END, v_order.id,
                    v_order.application_id, v_user.id, 'active', 'system', NOW(),
                    CASE WHEN v_user.allocation_type = 'auto' THEN 'department_auto' ELSE 'department_login' END,
                    v_user.policy_id, NOW(), NOW(), 0);
            INSERT INTO iam_application_enterprise_order_event
                (id, tenant_id, order_id, event_type, actor_kind, actor_id, payload_json, created_at)
            VALUES ('iaeev_' || replace(gen_random_uuid()::text, '-', ''), v_order.tenant_id,
                    v_order.id, 'seat_assigned', 'system', NULL,
                    json_build_object('userId', v_user.id, 'policyId', v_user.policy_id,
                                      'allocationMethod', CASE WHEN v_user.allocation_type = 'auto' THEN 'department_auto' ELSE 'department_login' END)::text, NOW());
            v_active := v_active + 1;
        END LOOP;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION iam_enterprise_membership_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.user_id = OLD.user_id AND NEW.tenant_id = OLD.tenant_id
       AND NEW.status = OLD.status THEN RETURN NULL; END IF;
    PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
    IF NEW.tenant_id <> OLD.tenant_id OR NEW.user_id <> OLD.user_id THEN
        PERFORM iam_reconcile_enterprise_seats(NEW.tenant_id, NEW.user_id, FALSE);
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_tenant_member_enterprise_seats ON iam_tenant_member;
CREATE TRIGGER trg_iam_tenant_member_enterprise_seats AFTER INSERT OR UPDATE OR DELETE ON iam_tenant_member
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_membership_reconcile();

CREATE OR REPLACE FUNCTION iam_enterprise_organization_membership_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.user_id = OLD.user_id AND NEW.tenant_id = OLD.tenant_id
       AND NEW.organization_id = OLD.organization_id AND NEW.status = OLD.status THEN RETURN NULL; END IF;
    PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
    IF NEW.tenant_id <> OLD.tenant_id OR NEW.user_id <> OLD.user_id THEN
        PERFORM iam_reconcile_enterprise_seats(NEW.tenant_id, NEW.user_id, FALSE);
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_organization_membership_enterprise_seats ON iam_organization_membership;
CREATE TRIGGER trg_iam_organization_membership_enterprise_seats AFTER INSERT OR UPDATE OR DELETE ON iam_organization_membership
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_organization_membership_reconcile();

CREATE OR REPLACE FUNCTION iam_enterprise_assignment_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.user_id = OLD.user_id AND NEW.tenant_id = OLD.tenant_id
       AND NEW.organization_id = OLD.organization_id AND NEW.department_id = OLD.department_id
       AND NEW.organization_membership_id = OLD.organization_membership_id
       AND NEW.status = OLD.status AND NEW.is_primary = OLD.is_primary
       AND NEW.effective_from = OLD.effective_from AND NEW.effective_to = OLD.effective_to THEN RETURN NULL; END IF;
    PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.user_id, FALSE);
    IF NEW.tenant_id <> OLD.tenant_id OR NEW.user_id <> OLD.user_id THEN
        PERFORM iam_reconcile_enterprise_seats(NEW.tenant_id, NEW.user_id, FALSE);
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_department_assignment_enterprise_seats ON iam_department_assignment;
CREATE TRIGGER trg_iam_department_assignment_enterprise_seats AFTER INSERT OR UPDATE OR DELETE ON iam_department_assignment
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_assignment_reconcile();

CREATE OR REPLACE FUNCTION iam_enterprise_user_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.id, FALSE);
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.tenant_id = OLD.tenant_id
       AND NEW.status = OLD.status THEN RETURN NULL; END IF;
    PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, OLD.id, FALSE);
    IF NEW.tenant_id <> OLD.tenant_id OR NEW.id <> OLD.id THEN
        PERFORM iam_reconcile_enterprise_seats(NEW.tenant_id, NEW.id, FALSE);
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_user_enterprise_seats ON iam_user;
CREATE TRIGGER trg_iam_user_enterprise_seats AFTER INSERT OR UPDATE OR DELETE ON iam_user
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_user_reconcile();

CREATE OR REPLACE FUNCTION iam_enterprise_policy_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    -- The admin service uses this transaction-local switch only while converting
    -- kept policy seats to manual. It must never suppress capacity, blacklist,
    -- membership or user-status reconciliation.
    IF current_setting('sdkwork.enterprise_seat_admin', true) = 'on' THEN RETURN NULL; END IF;
    IF TG_OP = 'DELETE' THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, NULL, FALSE, OLD.application_id);
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.tenant_id = OLD.tenant_id AND NEW.order_id = OLD.order_id
       AND NEW.application_id = OLD.application_id AND NEW.organization_id = OLD.organization_id
       AND NEW.department_id = OLD.department_id AND NEW.allocation_type = OLD.allocation_type THEN RETURN NULL; END IF;
    PERFORM iam_reconcile_enterprise_seats(NEW.tenant_id, NULL, FALSE, NEW.application_id);
    IF TG_OP = 'UPDATE' AND (NEW.tenant_id <> OLD.tenant_id OR NEW.order_id <> OLD.order_id
       OR NEW.application_id <> OLD.application_id) THEN
        PERFORM iam_reconcile_enterprise_seats(OLD.tenant_id, NULL, FALSE, OLD.application_id);
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_enterprise_seat_policy_reconcile ON iam_application_enterprise_seat_policy;
CREATE TRIGGER trg_iam_enterprise_seat_policy_reconcile AFTER INSERT OR UPDATE OR DELETE ON iam_application_enterprise_seat_policy
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_policy_reconcile();

CREATE OR REPLACE FUNCTION iam_enterprise_blacklist_reconcile() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_order RECORD;
    v_seat RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Removal restores only auto-policy seats and only while capacity remains.
        PERFORM iam_reconcile_enterprise_seats(
            OLD.tenant_id, OLD.user_id, FALSE, OLD.application_id
        );
        RETURN NULL;
    END IF;

    -- Insertion (or an identity-changing update) reclaims every active seat,
    -- including manual seats, even when the order is no longer reconcile-eligible.
    IF TG_OP = 'UPDATE' AND (OLD.tenant_id <> NEW.tenant_id
       OR OLD.order_id <> NEW.order_id OR OLD.user_id <> NEW.user_id) THEN
        SELECT * INTO v_order FROM iam_application_enterprise_order
         WHERE id = OLD.order_id FOR UPDATE;
        FOR v_seat IN
            SELECT id FROM iam_application_enterprise_seat
             WHERE tenant_id = OLD.tenant_id AND order_id = OLD.order_id
               AND user_id = OLD.user_id AND seat_status = 'active'
             ORDER BY id
        LOOP
            UPDATE iam_application_enterprise_seat
               SET seat_status = 'released', released_by = 'system', released_at = NOW(),
                   updated_at = NOW(), version = version + 1
             WHERE id = v_seat.id AND seat_status = 'active';
            INSERT INTO iam_application_enterprise_order_event
                (id, tenant_id, order_id, event_type, actor_kind, actor_id, payload_json, created_at)
            VALUES ('iaeev_' || replace(gen_random_uuid()::text, '-', ''), OLD.tenant_id,
                    OLD.order_id, 'seat_released', 'system', NULL,
                    json_build_object('seatId', v_seat.id, 'reason', 'blacklisted')::text, NOW());
        END LOOP;
    END IF;

    SELECT * INTO v_order FROM iam_application_enterprise_order
     WHERE id = NEW.order_id FOR UPDATE;
    FOR v_seat IN
        SELECT id FROM iam_application_enterprise_seat
         WHERE tenant_id = NEW.tenant_id AND order_id = NEW.order_id
           AND user_id = NEW.user_id AND seat_status = 'active'
         ORDER BY id
    LOOP
        UPDATE iam_application_enterprise_seat
           SET seat_status = 'released', released_by = 'system', released_at = NOW(),
               updated_at = NOW(), version = version + 1
         WHERE id = v_seat.id AND seat_status = 'active';
        INSERT INTO iam_application_enterprise_order_event
            (id, tenant_id, order_id, event_type, actor_kind, actor_id, payload_json, created_at)
        VALUES ('iaeev_' || replace(gen_random_uuid()::text, '-', ''), NEW.tenant_id,
                NEW.order_id, 'seat_released', 'system', NULL,
                json_build_object('seatId', v_seat.id, 'reason', 'blacklisted')::text, NOW());
    END LOOP;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_iam_enterprise_blacklist_reconcile ON iam_application_enterprise_seat_blacklist;
CREATE TRIGGER trg_iam_enterprise_blacklist_reconcile AFTER INSERT OR UPDATE OR DELETE ON iam_application_enterprise_seat_blacklist
    FOR EACH ROW EXECUTE FUNCTION iam_enterprise_blacklist_reconcile();

COMMIT;
