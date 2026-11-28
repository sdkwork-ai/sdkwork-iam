-- sdkwork:migration
-- id: 0054_iam_application_enterprise_order
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the application enterprise-authorization domain: an enterprise
--   order that licenses one published application to one enterprise tenant, the
--   one-time authorization/termination links that carry the enterprise
--   administrator's confirmation, the seat pool that makes a seat-mode order
--   assignable, and the lifecycle event ledger. Until now an application could
--   be installed inside its own tenant but could not be distributed to another
--   enterprise with a start, an expiry, a seat cap, or an audit trail.
--   See docs/architecture/tech/TECH-application-enterprise-authorization.md.
-- reversible: true
-- rollback: down-migration (drops the four new tables in reverse dependency
--   order; no existing table is altered)
-- transactional: true
-- lock: access-exclusive on the four newly created tables only
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- The publisher-side enterprise order.
--
-- `tenant_id` is the *publisher* (the tenant that owns the application); the
-- enterprise that receives the authorization is named by
-- `enterprise_tenant_id`. Keeping both on one row is what makes "the publisher
-- manages its orders" and "the enterprise sees what it was granted" two indexed
-- questions instead of a join through an association table.
--
-- `organization_id` narrows the publisher side; `enterprise_organization_id`
-- narrows the grantee side ('0' = the whole enterprise tenant). The two are
-- separate columns because they answer different questions and must never be
-- confused when a query binds tenant scope.
CREATE TABLE IF NOT EXISTS iam_application_enterprise_order (
    id                        TEXT PRIMARY KEY,
    -- Human-facing order number (`EO-XXXXXXXX`), unique platform-wide.
    order_no                  TEXT NOT NULL,
    tenant_id                 TEXT NOT NULL,
    organization_id           TEXT NOT NULL DEFAULT '0',
    -- The application's stable identity (`iam_application_installation.app_id`).
    application_id            TEXT NOT NULL,
    enterprise_tenant_id      TEXT NOT NULL,
    enterprise_organization_id TEXT NOT NULL DEFAULT '0',
    enterprise_name           TEXT NOT NULL,
    -- `all_members` grants every member of the enterprise; `seat` grants only
    -- the seats an administrator assigns. The vocabulary is closed here and in
    -- `ck_iam_application_enterprise_order_mode`.
    authorization_mode        TEXT NOT NULL DEFAULT 'all_members',
    -- Required for `seat`, and NULL for `all_members`: a seat cap on an
    -- all-members order would be a number nobody enforces.
    seat_count                INTEGER,
    -- Fixed duration ladder (3 / 6 / 12 months), the same choices the open
    -- platform offers; a free-form end date would let a publisher grant an
    -- unbounded term through the API.
    duration_months           INTEGER NOT NULL,
    order_status              TEXT NOT NULL DEFAULT 'pending_authorization',
    contact_name              TEXT NOT NULL,
    contact_phone             TEXT NOT NULL,
    authorized_at             TIMESTAMPTZ,
    expires_at                TIMESTAMPTZ,
    terminated_at             TIMESTAMPTZ,
    termination_reason        TEXT,
    termination_note          TEXT,
    metadata_json             TEXT NOT NULL DEFAULT '{}',
    created_by                TEXT NOT NULL,
    updated_by                TEXT NOT NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                TIMESTAMPTZ,
    version                   BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_iam_application_enterprise_order_status CHECK (order_status IN (
        'pending_authorization', 'active', 'pending_termination', 'terminated', 'cancelled'
    )),
    CONSTRAINT ck_iam_application_enterprise_order_mode CHECK (authorization_mode IN (
        'all_members', 'seat'
    )),
    CONSTRAINT ck_iam_application_enterprise_order_seat CHECK (
        (authorization_mode = 'seat' AND seat_count IS NOT NULL AND seat_count > 0)
        OR (authorization_mode = 'all_members' AND seat_count IS NULL)
    ),
    CONSTRAINT ck_iam_application_enterprise_order_duration CHECK (duration_months IN (3, 6, 12)),
    -- The lifecycle is enforced by the timestamps as well as by the status, so a
    -- row cannot claim `active` without an authorized_at, or `terminated`
    -- without a terminated_at. This is what makes the state machine a database
    -- fact rather than a service convention.
    CONSTRAINT ck_iam_application_enterprise_order_lifecycle CHECK (
        (order_status = 'pending_authorization'
            AND authorized_at IS NULL AND terminated_at IS NULL)
        OR (order_status IN ('active', 'pending_termination')
            AND authorized_at IS NOT NULL AND terminated_at IS NULL)
        OR (order_status = 'terminated'
            AND authorized_at IS NOT NULL AND terminated_at IS NOT NULL)
        OR (order_status = 'cancelled'
            AND authorized_at IS NULL AND terminated_at IS NULL)
    ),
    CONSTRAINT ck_iam_application_enterprise_order_expiry CHECK (
        expires_at IS NULL OR authorized_at IS NULL OR expires_at > authorized_at
    ),
    CONSTRAINT ck_iam_application_enterprise_order_termination CHECK (
        terminated_at IS NULL OR termination_reason IS NOT NULL
    ),
    CONSTRAINT ck_iam_application_enterprise_order_version CHECK (version >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_order_no
    ON iam_application_enterprise_order (order_no);

-- One live order per (application, enterprise). A terminated or cancelled order
-- frees the slot so the publisher can re-authorize after an expiry instead of
-- being locked out forever; the open platform's current "one order per
-- enterprise, ever" rule is a limitation this index deliberately does not copy.
CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_order_live
    ON iam_application_enterprise_order
        (tenant_id, application_id, enterprise_tenant_id)
    WHERE order_status IN ('pending_authorization', 'active', 'pending_termination')
      AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_order_publisher
    ON iam_application_enterprise_order
        (tenant_id, application_id, order_status, created_at DESC, id)
    WHERE deleted_at IS NULL;

-- The enterprise's own view: what has been granted to us, and what expires next.
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_order_enterprise
    ON iam_application_enterprise_order
        (enterprise_tenant_id, order_status, expires_at, id)
    WHERE deleted_at IS NULL;

-- The expiry sweep: only live orders can expire.
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_order_expiry_sweep
    ON iam_application_enterprise_order (expires_at, id)
    WHERE order_status = 'active' AND deleted_at IS NULL;

-- One-time authorization / termination link.
--
-- Only the hash is stored: the token is shown once to the publisher and travels
-- by mail or chat, so a database read must not be able to reconstruct a working
-- link. `link_kind` separates "the enterprise accepts the grant" from "the
-- enterprise accepts the early termination"; they have different confirmations
-- and different one-time rules.
CREATE TABLE IF NOT EXISTS iam_application_enterprise_order_link (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    order_id      TEXT NOT NULL
        REFERENCES iam_application_enterprise_order(id) ON DELETE CASCADE,
    link_kind     TEXT NOT NULL,
    token_hash    TEXT NOT NULL,
    link_status   TEXT NOT NULL DEFAULT 'active',
    issued_by     TEXT NOT NULL,
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- NULL means long-lived (the authorize link has no expiry); a non-NULL value
    -- is set only for a link kind that must be redeemed within a window.
    expires_at    TIMESTAMPTZ,
    consumed_at   TIMESTAMPTZ,
    consumed_by   TEXT,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version       BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_iam_application_enterprise_order_link_kind CHECK (link_kind IN (
        'authorize', 'terminate'
    )),
    CONSTRAINT ck_iam_application_enterprise_order_link_status CHECK (link_status IN (
        'active', 'consumed', 'revoked'
    )),
    CONSTRAINT ck_iam_application_enterprise_order_link_consumed CHECK (
        (link_status = 'consumed' AND consumed_at IS NOT NULL AND consumed_by IS NOT NULL)
        OR (link_status <> 'consumed' AND consumed_at IS NULL AND consumed_by IS NULL)
    ),
    CONSTRAINT ck_iam_application_enterprise_order_link_revoked CHECK (
        (link_status = 'revoked' AND revoked_at IS NOT NULL)
        OR (link_status <> 'revoked' AND revoked_at IS NULL)
    ),
    CONSTRAINT ck_iam_application_enterprise_order_link_version CHECK (version >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_order_link_token
    ON iam_application_enterprise_order_link (token_hash);

-- At most one redeemable link of each kind per order: issuing a replacement
-- revokes the previous one in the same transaction, so an old mail cannot be
-- redeemed after a new one was issued.
CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_order_link_active
    ON iam_application_enterprise_order_link (order_id, link_kind)
    WHERE link_status = 'active';

CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_order_link_order
    ON iam_application_enterprise_order_link (tenant_id, order_id, link_kind, issued_at DESC, id);

-- Seat assignment inside the enterprise.
--
-- `tenant_id` here is the *grantee* tenant, not the publisher: a seat is
-- assigned by the enterprise administrator against its own members, and the
-- enterprise-scoped tenant predicate must hold for every seat query. The
-- publisher-side consistency (seat.tenant_id = order.enterprise_tenant_id) is
-- enforced by the service in the same transaction that inserts the seat.
CREATE TABLE IF NOT EXISTS iam_application_enterprise_seat (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    organization_id   TEXT NOT NULL DEFAULT '0',
    order_id          TEXT NOT NULL
        REFERENCES iam_application_enterprise_order(id) ON DELETE CASCADE,
    application_id    TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    seat_status       TEXT NOT NULL DEFAULT 'active',
    assigned_by       TEXT NOT NULL,
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_by       TEXT,
    released_at       TIMESTAMPTZ,
    metadata_json     TEXT NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version           BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_iam_application_enterprise_seat_status CHECK (seat_status IN (
        'active', 'released'
    )),
    CONSTRAINT ck_iam_application_enterprise_seat_release CHECK (
        (seat_status = 'active' AND released_at IS NULL AND released_by IS NULL)
        OR (seat_status = 'released' AND released_at IS NOT NULL AND released_by IS NOT NULL)
    ),
    CONSTRAINT ck_iam_application_enterprise_seat_version CHECK (version >= 0)
);

-- One active seat per user per order; releasing frees it for reassignment.
CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_application_enterprise_seat_active
    ON iam_application_enterprise_seat (order_id, user_id)
    WHERE seat_status = 'active';

CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_seat_order
    ON iam_application_enterprise_seat
        (tenant_id, order_id, seat_status, assigned_at DESC, id);

-- Seat inventory by application, for "who in this enterprise can open it".
CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_seat_application
    ON iam_application_enterprise_seat (tenant_id, application_id, seat_status, id)
    WHERE seat_status = 'active';

-- Lifecycle event ledger. Append-only: the repository never updates or deletes a
-- row, which is what makes the order history answerable after the order itself
-- has been terminated and its seats released.
CREATE TABLE IF NOT EXISTS iam_application_enterprise_order_event (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    order_id      TEXT NOT NULL
        REFERENCES iam_application_enterprise_order(id) ON DELETE CASCADE,
    event_type    TEXT NOT NULL,
    actor_kind    TEXT NOT NULL,
    actor_id      TEXT,
    payload_json  TEXT NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_iam_application_enterprise_order_event_type CHECK (event_type IN (
        'created', 'link_issued', 'authorized', 'termination_requested',
        'termination_confirmed', 'expired', 'cancelled', 'seat_assigned', 'seat_released'
    )),
    CONSTRAINT ck_iam_application_enterprise_order_event_actor CHECK (actor_kind IN (
        'publisher', 'enterprise_admin', 'system'
    ))
);

CREATE INDEX IF NOT EXISTS ix_iam_application_enterprise_order_event_order
    ON iam_application_enterprise_order_event (tenant_id, order_id, created_at, id);

COMMENT ON TABLE iam_application_enterprise_order IS
    'Enterprise authorization order: licenses one published application to one enterprise tenant. tenant_id = publisher; enterprise_tenant_id = grantee. Status lifecycle is enforced by ck_..._lifecycle together with the timestamps.';
COMMENT ON COLUMN iam_application_enterprise_order.authorization_mode IS
    'all_members = every member of the enterprise; seat = only seats assigned by the enterprise administrator (seat_count required).';
COMMENT ON COLUMN iam_application_enterprise_order.duration_months IS
    'Fixed ladder 3 / 6 / 12. expires_at is computed from authorized_at + duration_months at authorization time.';
COMMENT ON TABLE iam_application_enterprise_order_link IS
    'One-time enterprise authorization / termination link. Only token_hash is stored; the plaintext token is shown once to the publisher.';
COMMENT ON TABLE iam_application_enterprise_seat IS
    'Seat assignment inside the grantee enterprise. tenant_id is the enterprise tenant; seat.tenant_id must equal order.enterprise_tenant_id (service-enforced).';
COMMENT ON TABLE iam_application_enterprise_order_event IS
    'Append-only enterprise-order lifecycle ledger; no UPDATE or DELETE path exists.';

COMMIT;
