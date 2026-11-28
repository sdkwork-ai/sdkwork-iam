-- sdkwork:migration
-- id: 0056_iam_enterprise_seat_management
-- engine: postgres
-- module: sdkwork-iam
-- reversible: true
-- rollback: down-migration (only before 0056-owned data exists; otherwise the
--   transaction aborts and the schema/data remain intact for forward-fix)
-- transactional: true
-- lock: access-exclusive on the two 0056 tables and altered seat/order tables
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

-- A generic DROP would destroy policy/blacklist rows, allocation provenance and
-- immutable ledger events. Refuse that lossy reversal instead. The checks run
-- before any DDL, so the exception leaves the complete 0056 schema untouched.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM iam_application_enterprise_seat_policy) THEN
        RAISE EXCEPTION '0056 down migration refused: seat policies contain data; use a reviewed forward-fix or restore/cutover';
    END IF;
    IF EXISTS (SELECT 1 FROM iam_application_enterprise_seat_blacklist) THEN
        RAISE EXCEPTION '0056 down migration refused: seat blacklist contains data; use a reviewed forward-fix or restore/cutover';
    END IF;
    IF EXISTS (
        SELECT 1 FROM iam_application_enterprise_seat
         WHERE allocation_method <> 'manual' OR policy_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION '0056 down migration refused: seats retain policy allocation provenance; use a reviewed forward-fix or restore/cutover';
    END IF;
    IF EXISTS (
        SELECT 1 FROM iam_application_enterprise_order WHERE seat_name IS NOT NULL
    ) THEN
        RAISE EXCEPTION '0056 down migration refused: orders retain seat_name data; use a reviewed forward-fix or restore/cutover';
    END IF;
    IF EXISTS (
        SELECT 1 FROM iam_application_enterprise_order_event
         WHERE event_type IN ('order_resized', 'seat_policy_created', 'seat_policy_updated',
                              'seat_policy_deleted', 'seat_blacklist_added', 'seat_blacklist_removed',
                              'seats_bulk_released', 'seats_exported')
    ) THEN
        RAISE EXCEPTION '0056 down migration refused: append-only ledger contains 0056 events; use a reviewed forward-fix or restore/cutover';
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_iam_enterprise_blacklist_reconcile ON iam_application_enterprise_seat_blacklist;
DROP TRIGGER IF EXISTS trg_iam_enterprise_seat_policy_reconcile ON iam_application_enterprise_seat_policy;
DROP TRIGGER IF EXISTS trg_iam_user_enterprise_seats ON iam_user;
DROP TRIGGER IF EXISTS trg_iam_organization_membership_enterprise_seats ON iam_organization_membership;
DROP TRIGGER IF EXISTS trg_iam_department_assignment_enterprise_seats ON iam_department_assignment;
DROP TRIGGER IF EXISTS trg_iam_tenant_member_enterprise_seats ON iam_tenant_member;
DROP FUNCTION IF EXISTS iam_enterprise_blacklist_reconcile();
DROP FUNCTION IF EXISTS iam_enterprise_policy_reconcile();
DROP FUNCTION IF EXISTS iam_enterprise_user_reconcile();
DROP FUNCTION IF EXISTS iam_enterprise_organization_membership_reconcile();
DROP FUNCTION IF EXISTS iam_enterprise_assignment_reconcile();
DROP FUNCTION IF EXISTS iam_enterprise_membership_reconcile();
DROP FUNCTION IF EXISTS iam_reconcile_enterprise_seats(TEXT, TEXT, BOOLEAN, TEXT);

DROP TABLE IF EXISTS iam_application_enterprise_seat_blacklist;
DROP TABLE IF EXISTS iam_application_enterprise_seat_policy;
ALTER TABLE iam_application_enterprise_seat
    DROP CONSTRAINT IF EXISTS ck_iam_application_enterprise_seat_policy_method,
    DROP CONSTRAINT IF EXISTS ck_iam_application_enterprise_seat_allocation,
    DROP COLUMN IF EXISTS policy_id,
    DROP COLUMN IF EXISTS allocation_method;
ALTER TABLE iam_application_enterprise_order DROP COLUMN IF EXISTS seat_name;
ALTER TABLE iam_application_enterprise_order_event
    DROP CONSTRAINT IF EXISTS ck_iam_application_enterprise_order_event_type;
ALTER TABLE iam_application_enterprise_order_event
    ADD CONSTRAINT ck_iam_application_enterprise_order_event_type CHECK (event_type IN (
        'created', 'link_issued', 'authorized', 'termination_requested',
        'termination_confirmed', 'expired', 'cancelled', 'seat_assigned', 'seat_released'
    ));

COMMIT;
