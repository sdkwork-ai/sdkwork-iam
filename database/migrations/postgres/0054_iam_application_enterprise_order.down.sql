-- Down migration for 0054_iam_application_enterprise_order.
--
-- Drops the four tables added by the up migration in reverse dependency order.
-- No pre-existing table or column is touched, so this migration cannot destroy
-- data that predates it.

BEGIN;

DROP TABLE IF EXISTS iam_application_enterprise_order_event;
DROP TABLE IF EXISTS iam_application_enterprise_seat;
DROP TABLE IF EXISTS iam_application_enterprise_order_link;
DROP TABLE IF EXISTS iam_application_enterprise_order;

COMMIT;
