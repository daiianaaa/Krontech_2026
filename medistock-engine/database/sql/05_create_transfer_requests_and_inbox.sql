-- 05_create_transfer_requests_and_inbox.sql
-- Manual transfer workflow pentru frontend:
-- 1. transfer_requests = cereri/oferte create din frontend
-- 2. inbox_messages = mesajele vizibile intre institutii
-- 3. v_medication_availability_by_institution = cine are medicamentul pe batch-uri

BEGIN;

-- =========================
-- 1. ENUM TYPES
-- =========================

DO $$ BEGIN
    CREATE TYPE manual_transfer_type AS ENUM ('send', 'request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inbox_message_status AS ENUM ('unread', 'read', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 2. TRANSFER REQUESTS
-- =========================

CREATE TABLE IF NOT EXISTS transfer_requests (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cine trimite mesajul in sistem.
    -- Pentru SEND: sender = sursa stocului.
    -- Pentru REQUEST: sender = institutia care cere medicamentul.
    sender_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    -- Cine primeste mesajul in inbox.
    -- Pentru SEND: receiver = destinatia propusa.
    -- Pentru REQUEST: receiver = institutia care detine stocul cerut.
    receiver_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    -- Directia reala a stocului.
    -- Pentru SEND: source = sender, destination = receiver.
    -- Pentru REQUEST: source = receiver, destination = sender.
    source_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    destination_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    transaction_type manual_transfer_type NOT NULL,

    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES medication_batches(id) ON DELETE SET NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,

    status recommendation_status NOT NULL DEFAULT 'pending',
    CHECK (status IN ('pending', 'accepted', 'rejected')),

    required_storage_type storage_type NOT NULL DEFAULT 'normal',

    batch_number VARCHAR(80),
    expiry_date DATE,
    days_to_expiry INTEGER,

    expected_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    avoided_disposal_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    transport_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recommended_transfer_date DATE,

    -- Optional: daca request-ul a fost creat dintr-o recomandare.
    source_recommendation_id UUID REFERENCES transfer_recommendations(id) ON DELETE SET NULL,

    -- Snapshot-uri utile pentru frontend. FK-urile raman sursa de adevar.
    medication_code_snapshot VARCHAR(30),
    medication_name_snapshot VARCHAR(255),
    medication_category_snapshot VARCHAR(120),
    medication_criticality_snapshot criticality_level,

    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    rejected_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CHECK (sender_hospital_id <> receiver_hospital_id),
    CHECK (source_hospital_id <> destination_hospital_id),

    CHECK (
        (transaction_type = 'send'
            AND source_hospital_id = sender_hospital_id
            AND destination_hospital_id = receiver_hospital_id)
        OR
        (transaction_type = 'request'
            AND source_hospital_id = receiver_hospital_id
            AND destination_hospital_id = sender_hospital_id)
    ),

    CHECK (
        transaction_type = 'request'
        OR batch_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_sender
ON transfer_requests(sender_hospital_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_receiver
ON transfer_requests(receiver_hospital_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_source_destination
ON transfer_requests(source_hospital_id, destination_hospital_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_medication
ON transfer_requests(medication_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_batch
ON transfer_requests(batch_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_status
ON transfer_requests(status);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_created_at
ON transfer_requests(created_at DESC);

-- Optional, pentru cand veti lega transferurile manuale de miscari reale de stoc.
ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS related_transfer_request_id UUID REFERENCES transfer_requests(transaction_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_related_transfer_request
ON inventory_transactions(related_transfer_request_id);

-- =========================
-- 3. INBOX MESSAGES
-- =========================

CREATE TABLE IF NOT EXISTS inbox_messages (
    inbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transfer_request_id UUID NOT NULL REFERENCES transfer_requests(transaction_id) ON DELETE CASCADE,

    sender_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    receiver_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    source_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    destination_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    transaction_type manual_transfer_type NOT NULL,

    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES medication_batches(id) ON DELETE SET NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,

    subject VARCHAR(255),
    message TEXT,

    transfer_status recommendation_status NOT NULL DEFAULT 'pending',
    CHECK (transfer_status IN ('pending', 'accepted', 'rejected')),

    inbox_status inbox_message_status NOT NULL DEFAULT 'unread',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP,

    UNIQUE (transfer_request_id, receiver_hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_receiver_status
ON inbox_messages(receiver_hospital_id, inbox_status);

CREATE INDEX IF NOT EXISTS idx_inbox_transfer_status
ON inbox_messages(transfer_status);

CREATE INDEX IF NOT EXISTS idx_inbox_created_at
ON inbox_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_transfer_request
ON inbox_messages(transfer_request_id);

-- =========================
-- 4. AUTO CREATE INBOX MESSAGE
-- =========================

CREATE OR REPLACE FUNCTION create_inbox_message_for_transfer_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_med_name TEXT;
    v_subject TEXT;
    v_message TEXT;
BEGIN
    SELECT name
    INTO v_med_name
    FROM medications
    WHERE id = NEW.medication_id;

    IF NEW.transaction_type = 'send' THEN
        v_subject := 'Transfer offer: ' || COALESCE(v_med_name, NEW.medication_name_snapshot, 'Medication');
        v_message := 'A transfer offer was sent for ' || COALESCE(v_med_name, NEW.medication_name_snapshot, 'this medication') || '.';
    ELSE
        v_subject := 'Medication request: ' || COALESCE(v_med_name, NEW.medication_name_snapshot, 'Medication');
        v_message := 'A medication request was sent for ' || COALESCE(v_med_name, NEW.medication_name_snapshot, 'this medication') || '.';
    END IF;

    INSERT INTO inbox_messages (
        transfer_request_id,
        sender_hospital_id,
        receiver_hospital_id,
        source_hospital_id,
        destination_hospital_id,
        transaction_type,
        medication_id,
        batch_id,
        quantity,
        reason,
        subject,
        message,
        transfer_status,
        inbox_status
    )
    VALUES (
        NEW.transaction_id,
        NEW.sender_hospital_id,
        NEW.receiver_hospital_id,
        NEW.source_hospital_id,
        NEW.destination_hospital_id,
        NEW.transaction_type,
        NEW.medication_id,
        NEW.batch_id,
        NEW.quantity,
        NEW.reason,
        v_subject,
        v_message,
        NEW.status,
        'unread'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_inbox_message_for_transfer_request ON transfer_requests;

CREATE TRIGGER trg_create_inbox_message_for_transfer_request
AFTER INSERT ON transfer_requests
FOR EACH ROW
EXECUTE FUNCTION create_inbox_message_for_transfer_request();

-- =========================
-- 5. SYNC INBOX STATUS WITH TRANSFER REQUEST STATUS
-- =========================

CREATE OR REPLACE FUNCTION sync_inbox_status_from_transfer_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE inbox_messages
    SET transfer_status = NEW.status
    WHERE transfer_request_id = NEW.transaction_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inbox_status_from_transfer_request ON transfer_requests;

CREATE TRIGGER trg_sync_inbox_status_from_transfer_request
AFTER UPDATE OF status ON transfer_requests
FOR EACH ROW
EXECUTE FUNCTION sync_inbox_status_from_transfer_request();

-- =========================
-- 6. ACCEPT / REJECT FUNCTIONS
-- =========================

CREATE OR REPLACE FUNCTION accept_transfer_request(
    p_transaction_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_user RECORD;
BEGIN
    SELECT *
    INTO v_user
    FROM app_users
    WHERE id = p_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist or is inactive', p_user_id;
    END IF;

    SELECT *
    INTO v_req
    FROM transfer_requests
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request % not found', p_transaction_id;
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Transfer request % is not pending. Current status: %', p_transaction_id, v_req.status;
    END IF;

    UPDATE transfer_requests
    SET status = 'accepted',
        accepted_by = p_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE transaction_id = p_transaction_id;

    INSERT INTO audit_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        metadata,
        created_at
    )
    VALUES (
        p_user_id,
        'ACCEPT_TRANSFER_REQUEST',
        'transfer_requests',
        p_transaction_id,
        jsonb_build_object(
            'sender_hospital_id', v_req.sender_hospital_id,
            'receiver_hospital_id', v_req.receiver_hospital_id,
            'source_hospital_id', v_req.source_hospital_id,
            'destination_hospital_id', v_req.destination_hospital_id,
            'medication_id', v_req.medication_id,
            'batch_id', v_req.batch_id,
            'quantity', v_req.quantity,
            'transaction_type', v_req.transaction_type
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Transfer request accepted',
        'transaction_id', p_transaction_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION reject_transfer_request(
    p_transaction_id UUID,
    p_user_id UUID,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_user RECORD;
BEGIN
    SELECT *
    INTO v_user
    FROM app_users
    WHERE id = p_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist or is inactive', p_user_id;
    END IF;

    SELECT *
    INTO v_req
    FROM transfer_requests
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request % not found', p_transaction_id;
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Transfer request % is not pending. Current status: %', p_transaction_id, v_req.status;
    END IF;

    UPDATE transfer_requests
    SET status = 'rejected',
        rejected_by = p_user_id,
        rejected_at = NOW(),
        rejection_reason = COALESCE(p_rejection_reason, 'No reason provided'),
        updated_at = NOW()
    WHERE transaction_id = p_transaction_id;

    INSERT INTO audit_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        metadata,
        created_at
    )
    VALUES (
        p_user_id,
        'REJECT_TRANSFER_REQUEST',
        'transfer_requests',
        p_transaction_id,
        jsonb_build_object(
            'sender_hospital_id', v_req.sender_hospital_id,
            'receiver_hospital_id', v_req.receiver_hospital_id,
            'source_hospital_id', v_req.source_hospital_id,
            'destination_hospital_id', v_req.destination_hospital_id,
            'medication_id', v_req.medication_id,
            'batch_id', v_req.batch_id,
            'quantity', v_req.quantity,
            'transaction_type', v_req.transaction_type,
            'rejection_reason', COALESCE(p_rejection_reason, 'No reason provided')
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Transfer request rejected',
        'transaction_id', p_transaction_id,
        'rejection_reason', COALESCE(p_rejection_reason, 'No reason provided')
    );
END;
$$;

-- =========================
-- 7. VIEW: CINE ARE MEDICAMENTUL
-- =========================

CREATE OR REPLACE VIEW v_medication_availability_by_institution AS
SELECT
    h.id AS institution_id,
    h.code AS institution_code,
    h.username AS institution_username,
    h.name AS institution_name,
    h.type AS institution_type,
    h.city AS institution_city,
    h.county AS institution_county,

    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.generic_name,
    m.category AS medication_category,
    m.therapeutic_class,
    m.form,
    m.concentration,
    m.unit,
    m.criticality AS medication_criticality,
    m.required_storage_type,
    m.controlled_substance,

    b.id AS batch_id,
    b.batch_number,
    b.quantity_current,
    b.quantity_initial,
    b.expiry_date,
    b.expiry_date - CURRENT_DATE AS days_to_expiry,
    b.received_date,
    b.purchase_price_per_unit,
    b.disposal_cost_per_unit,
    b.storage_condition,
    b.status AS batch_status,

    CASE
        WHEN hsc.id IS NOT NULL AND hsc.is_validated = TRUE THEN TRUE
        ELSE FALSE
    END AS institution_can_store_medication,

    CASE
        WHEN b.status = 'available'
         AND b.quantity_current > 0
         AND b.expiry_date > CURRENT_DATE
        THEN TRUE
        ELSE FALSE
    END AS is_available_for_transfer

FROM medication_batches b
JOIN hospitals h ON h.id = b.hospital_id
JOIN medications m ON m.id = b.medication_id
LEFT JOIN hospital_storage_capabilities hsc
    ON hsc.hospital_id = h.id
   AND hsc.storage_type = m.required_storage_type
   AND hsc.is_validated = TRUE
WHERE h.is_active = TRUE
  AND m.is_active = TRUE
ORDER BY
    m.name,
    h.name,
    b.expiry_date ASC,
    b.quantity_current DESC;

-- =========================
-- 8. VIEW: TRANSFER REQUESTS PENTRU FRONTEND
-- =========================

CREATE OR REPLACE VIEW v_transfer_requests AS
SELECT
    tr.transaction_id,
    tr.transaction_type,
    tr.status,

    sender.id AS sender_hospital_id,
    sender.code AS sender_hospital_code,
    sender.name AS sender_hospital_name,
    sender.type AS sender_hospital_type,
    sender.city AS sender_city,
    sender.county AS sender_county,

    receiver.id AS receiver_hospital_id,
    receiver.code AS receiver_hospital_code,
    receiver.name AS receiver_hospital_name,
    receiver.type AS receiver_hospital_type,
    receiver.city AS receiver_city,
    receiver.county AS receiver_county,

    source_h.id AS source_hospital_id,
    source_h.code AS source_hospital_code,
    source_h.name AS source_hospital_name,

    dest_h.id AS destination_hospital_id,
    dest_h.code AS destination_hospital_code,
    dest_h.name AS destination_hospital_name,

    m.id AS medication_id,
    m.code AS medication_code,
    COALESCE(tr.medication_name_snapshot, m.name) AS medication_name,
    COALESCE(tr.medication_category_snapshot, m.category) AS medication_category,
    COALESCE(tr.medication_criticality_snapshot, m.criticality) AS medication_criticality,
    m.required_storage_type,

    b.id AS batch_id,
    COALESCE(tr.batch_number, b.batch_number) AS batch_number,
    COALESCE(tr.expiry_date, b.expiry_date) AS expiry_date,
    COALESCE(tr.days_to_expiry, b.expiry_date - CURRENT_DATE) AS days_to_expiry,

    tr.quantity,
    tr.reason,

    tr.expected_savings,
    tr.avoided_disposal_cost,
    tr.transport_cost,
    tr.net_savings,
    tr.recommended_transfer_date,

    tr.source_recommendation_id,

    tr.created_by,
    creator.full_name AS created_by_name,
    tr.accepted_by,
    acceptor.full_name AS accepted_by_name,
    tr.accepted_at,
    tr.rejected_by,
    rejector.full_name AS rejected_by_name,
    tr.rejected_at,
    tr.rejection_reason,

    tr.created_at,
    tr.updated_at

FROM transfer_requests tr
JOIN hospitals sender ON sender.id = tr.sender_hospital_id
JOIN hospitals receiver ON receiver.id = tr.receiver_hospital_id
JOIN hospitals source_h ON source_h.id = tr.source_hospital_id
JOIN hospitals dest_h ON dest_h.id = tr.destination_hospital_id
JOIN medications m ON m.id = tr.medication_id
LEFT JOIN medication_batches b ON b.id = tr.batch_id
LEFT JOIN app_users creator ON creator.id = tr.created_by
LEFT JOIN app_users acceptor ON acceptor.id = tr.accepted_by
LEFT JOIN app_users rejector ON rejector.id = tr.rejected_by
ORDER BY tr.created_at DESC;

-- =========================
-- 9. VIEW: INBOX
-- =========================

CREATE OR REPLACE VIEW v_inbox_messages AS
SELECT
    im.inbox_id,
    im.transfer_request_id,
    im.transaction_type,
    im.transfer_status,
    im.inbox_status,

    sender.id AS sender_hospital_id,
    sender.code AS sender_hospital_code,
    sender.name AS sender_hospital_name,
    sender.type AS sender_hospital_type,
    sender.city AS sender_city,
    sender.county AS sender_county,

    receiver.id AS receiver_hospital_id,
    receiver.code AS receiver_hospital_code,
    receiver.name AS receiver_hospital_name,
    receiver.type AS receiver_hospital_type,
    receiver.city AS receiver_city,
    receiver.county AS receiver_county,

    source_h.id AS source_hospital_id,
    source_h.code AS source_hospital_code,
    source_h.name AS source_hospital_name,

    dest_h.id AS destination_hospital_id,
    dest_h.code AS destination_hospital_code,
    dest_h.name AS destination_hospital_name,

    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.category AS medication_category,
    m.criticality AS medication_criticality,
    m.required_storage_type,

    b.id AS batch_id,
    b.batch_number,
    b.expiry_date,
    b.expiry_date - CURRENT_DATE AS days_to_expiry,

    im.quantity,
    im.reason,
    im.subject,
    im.message,
    im.created_at,
    im.read_at

FROM inbox_messages im
JOIN hospitals sender ON sender.id = im.sender_hospital_id
JOIN hospitals receiver ON receiver.id = im.receiver_hospital_id
JOIN hospitals source_h ON source_h.id = im.source_hospital_id
JOIN hospitals dest_h ON dest_h.id = im.destination_hospital_id
JOIN medications m ON m.id = im.medication_id
LEFT JOIN medication_batches b ON b.id = im.batch_id
ORDER BY
    CASE im.inbox_status
        WHEN 'unread' THEN 1
        WHEN 'read' THEN 2
        WHEN 'archived' THEN 3
        ELSE 4
    END,
    im.created_at DESC;

COMMIT;