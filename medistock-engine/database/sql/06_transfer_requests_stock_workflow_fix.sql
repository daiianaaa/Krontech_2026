-- 06_transfer_requests_stock_workflow_fix.sql
-- Fix pentru workflow-ul manual de transfer:
-- 1. accept_transfer_request face miscarea reala de stoc
-- 2. creeaza batch nou la destinatie
-- 3. scrie TRANSFER_OUT si TRANSFER_IN in inventory_transactions
-- 4. sincronizeaza statusul in inbox_messages
-- 5. extinde transfer_requests cu campuri utile pentru audit/frontend

BEGIN;

-- =========================
-- 1. EXTINDERI TABEL TRANSFER_REQUESTS
-- =========================

ALTER TABLE transfer_requests
ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS destination_batch_id UUID REFERENCES medication_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transfer_out_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transfer_in_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL;

-- Pentru MVP, cererile trebuie sa aiba batch_id ales din frontend.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_batch_required_chk'
    ) THEN
        ALTER TABLE transfer_requests
        ADD CONSTRAINT transfer_requests_batch_required_chk
        CHECK (batch_id IS NOT NULL) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transfer_requests_destination_batch
ON transfer_requests(destination_batch_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_transfer_out
ON transfer_requests(transfer_out_transaction_id);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_transfer_in
ON transfer_requests(transfer_in_transaction_id);

-- =========================
-- 2. ACCEPT TRANSFER REQUEST CU STOC REAL
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
    v_source_batch RECORD;
    v_destination_batch_id UUID;
    v_transfer_out_id UUID;
    v_transfer_in_id UUID;
    v_destination_batch_number VARCHAR(120);
    v_destination_can_store BOOLEAN;
BEGIN
    -- 1. Verificam utilizatorul.
    SELECT *
    INTO v_user
    FROM app_users
    WHERE id = p_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist or is inactive', p_user_id;
    END IF;

    IF v_user.role NOT IN ('HOSPITAL_MANAGER', 'PHARMACIST') THEN
        RAISE EXCEPTION 'Only HOSPITAL_MANAGER or PHARMACIST can accept transfer requests. Current role: %', v_user.role;
    END IF;

    -- 2. Luam request-ul si il blocam.
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

    -- Receiver-ul este institutia care trebuie sa accepte mesajul din inbox.
    IF v_user.hospital_id IS DISTINCT FROM v_req.receiver_hospital_id THEN
        RAISE EXCEPTION 'User hospital % cannot accept request for receiver hospital %', v_user.hospital_id, v_req.receiver_hospital_id;
    END IF;

    IF v_req.batch_id IS NULL THEN
        RAISE EXCEPTION 'Transfer request % has no batch_id. Select a source batch before accepting.', p_transaction_id;
    END IF;

    -- 3. Luam batch-ul sursa si il blocam.
    SELECT *
    INTO v_source_batch
    FROM medication_batches
    WHERE id = v_req.batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source batch % not found', v_req.batch_id;
    END IF;

    IF v_source_batch.hospital_id <> v_req.source_hospital_id THEN
        RAISE EXCEPTION 'Source batch hospital % does not match request source hospital %', v_source_batch.hospital_id, v_req.source_hospital_id;
    END IF;

    IF v_source_batch.medication_id <> v_req.medication_id THEN
        RAISE EXCEPTION 'Source batch medication % does not match request medication %', v_source_batch.medication_id, v_req.medication_id;
    END IF;

    IF v_source_batch.status <> 'available' THEN
        RAISE EXCEPTION 'Source batch % is not available. Current status: %', v_req.batch_id, v_source_batch.status;
    END IF;

    IF v_source_batch.expiry_date <= CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot transfer expired batch %. Expiry date: %', v_source_batch.batch_number, v_source_batch.expiry_date;
    END IF;

    IF v_source_batch.quantity_current < v_req.quantity THEN
        RAISE EXCEPTION 'Not enough stock in source batch. Available %, required %', v_source_batch.quantity_current, v_req.quantity;
    END IF;

    IF v_source_batch.storage_condition <> v_req.required_storage_type THEN
        RAISE EXCEPTION 'Storage mismatch. Batch storage %, request storage %', v_source_batch.storage_condition, v_req.required_storage_type;
    END IF;

    -- 4. Verificam daca destinatia poate stoca medicamentul.
    SELECT EXISTS (
        SELECT 1
        FROM hospital_storage_capabilities
        WHERE hospital_id = v_req.destination_hospital_id
          AND storage_type = v_req.required_storage_type
          AND is_validated = TRUE
    )
    INTO v_destination_can_store;

    IF NOT v_destination_can_store THEN
        RAISE EXCEPTION 'Destination hospital % cannot store storage type %', v_req.destination_hospital_id, v_req.required_storage_type;
    END IF;

    -- 5. Scadem stocul din batch-ul sursa.
    UPDATE medication_batches
    SET quantity_current = quantity_current - v_req.quantity,
        status = CASE
            WHEN quantity_current - v_req.quantity = 0 THEN 'transferred'::batch_status
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_source_batch.id;

    -- 6. Cream tranzactia TRANSFER_OUT la sursa.
    INSERT INTO inventory_transactions (
        batch_id,
        medication_id,
        hospital_id,
        department_id,
        transaction_type,
        quantity,
        transaction_date,
        reason,
        related_transfer_request_id,
        created_by
    )
    VALUES (
        v_source_batch.id,
        v_req.medication_id,
        v_req.source_hospital_id,
        v_source_batch.department_id,
        'TRANSFER_OUT',
        v_req.quantity,
        NOW(),
        'Transfer request accepted ' || v_req.transaction_id::text,
        v_req.transaction_id,
        p_user_id
    )
    RETURNING id INTO v_transfer_out_id;

    -- 7. Cream batch nou la destinatie.
    v_destination_batch_number := v_source_batch.batch_number || '-REQ-' || substring(v_req.transaction_id::text, 1, 8);

    INSERT INTO medication_batches (
        medication_id,
        hospital_id,
        department_id,
        supplier_id,
        batch_number,
        quantity_initial,
        quantity_current,
        expiry_date,
        received_date,
        purchase_price_per_unit,
        disposal_cost_per_unit,
        storage_condition,
        status,
        created_at,
        updated_at
    )
    VALUES (
        v_req.medication_id,
        v_req.destination_hospital_id,
        NULL,
        v_source_batch.supplier_id,
        v_destination_batch_number,
        v_req.quantity,
        v_req.quantity,
        v_source_batch.expiry_date,
        CURRENT_DATE,
        v_source_batch.purchase_price_per_unit,
        v_source_batch.disposal_cost_per_unit,
        v_source_batch.storage_condition,
        'available',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_destination_batch_id;

    -- 8. Cream tranzactia TRANSFER_IN la destinatie.
    INSERT INTO inventory_transactions (
        batch_id,
        medication_id,
        hospital_id,
        department_id,
        transaction_type,
        quantity,
        transaction_date,
        reason,
        related_transfer_request_id,
        created_by
    )
    VALUES (
        v_destination_batch_id,
        v_req.medication_id,
        v_req.destination_hospital_id,
        NULL,
        'TRANSFER_IN',
        v_req.quantity,
        NOW(),
        'Transfer request received ' || v_req.transaction_id::text,
        v_req.transaction_id,
        p_user_id
    )
    RETURNING id INTO v_transfer_in_id;

    -- 9. Marcam request-ul ca accepted si salvam rezultatele transferului.
    UPDATE transfer_requests
    SET status = 'accepted',
        accepted_by = p_user_id,
        accepted_at = NOW(),
        destination_batch_id = v_destination_batch_id,
        transfer_out_transaction_id = v_transfer_out_id,
        transfer_in_transaction_id = v_transfer_in_id,
        batch_number = COALESCE(batch_number, v_source_batch.batch_number),
        expiry_date = COALESCE(expiry_date, v_source_batch.expiry_date),
        days_to_expiry = COALESCE(days_to_expiry, v_source_batch.expiry_date - CURRENT_DATE),
        updated_at = NOW()
    WHERE transaction_id = v_req.transaction_id;

    -- 10. Audit log.
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
        'ACCEPT_TRANSFER_REQUEST_AND_MOVE_STOCK',
        'transfer_requests',
        v_req.transaction_id,
        jsonb_build_object(
            'sender_hospital_id', v_req.sender_hospital_id,
            'receiver_hospital_id', v_req.receiver_hospital_id,
            'source_hospital_id', v_req.source_hospital_id,
            'destination_hospital_id', v_req.destination_hospital_id,
            'medication_id', v_req.medication_id,
            'source_batch_id', v_source_batch.id,
            'destination_batch_id', v_destination_batch_id,
            'quantity', v_req.quantity,
            'transaction_type', v_req.transaction_type,
            'transfer_out_transaction_id', v_transfer_out_id,
            'transfer_in_transaction_id', v_transfer_in_id
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Transfer request accepted and stock moved',
        'transaction_id', v_req.transaction_id,
        'source_batch_id', v_source_batch.id,
        'destination_batch_id', v_destination_batch_id,
        'transfer_out_transaction_id', v_transfer_out_id,
        'transfer_in_transaction_id', v_transfer_in_id,
        'transferred_quantity', v_req.quantity
    );
END;
$$;

-- =========================
-- 3. REJECT TRANSFER REQUEST CU VALIDARE RECEIVER
-- =========================

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

    IF v_user.role NOT IN ('HOSPITAL_MANAGER', 'PHARMACIST') THEN
        RAISE EXCEPTION 'Only HOSPITAL_MANAGER or PHARMACIST can reject transfer requests. Current role: %', v_user.role;
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

    IF v_user.hospital_id IS DISTINCT FROM v_req.receiver_hospital_id THEN
        RAISE EXCEPTION 'User hospital % cannot reject request for receiver hospital %', v_user.hospital_id, v_req.receiver_hospital_id;
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
-- 4. REFRESH FRONTEND VIEWS CU CAMPURI NOI
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

    tr.destination_batch_id,
    db.batch_number AS destination_batch_number,

    tr.quantity,
    tr.reason,

    tr.expected_savings,
    tr.avoided_disposal_cost,
    tr.transport_cost,
    tr.net_savings,
    tr.distance_km,
    tr.confidence_score,
    tr.recommended_transfer_date,

    tr.source_recommendation_id,
    tr.transfer_out_transaction_id,
    tr.transfer_in_transaction_id,

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
LEFT JOIN medication_batches db ON db.id = tr.destination_batch_id
LEFT JOIN app_users creator ON creator.id = tr.created_by
LEFT JOIN app_users acceptor ON acceptor.id = tr.accepted_by
LEFT JOIN app_users rejector ON rejector.id = tr.rejected_by
ORDER BY tr.created_at DESC;

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

    tr.destination_batch_id,
    db.batch_number AS destination_batch_number,

    im.quantity,
    im.reason,
    im.subject,
    im.message,
    im.created_at,
    im.read_at,

    tr.accepted_by,
    acceptor.full_name AS accepted_by_name,
    tr.accepted_at,
    tr.rejected_by,
    rejector.full_name AS rejected_by_name,
    tr.rejected_at,
    tr.rejection_reason

FROM inbox_messages im
JOIN transfer_requests tr ON tr.transaction_id = im.transfer_request_id
JOIN hospitals sender ON sender.id = im.sender_hospital_id
JOIN hospitals receiver ON receiver.id = im.receiver_hospital_id
JOIN hospitals source_h ON source_h.id = im.source_hospital_id
JOIN hospitals dest_h ON dest_h.id = im.destination_hospital_id
JOIN medications m ON m.id = im.medication_id
LEFT JOIN medication_batches b ON b.id = im.batch_id
LEFT JOIN medication_batches db ON db.id = tr.destination_batch_id
LEFT JOIN app_users acceptor ON acceptor.id = tr.accepted_by
LEFT JOIN app_users rejector ON rejector.id = tr.rejected_by
ORDER BY
    CASE im.inbox_status
        WHEN 'unread' THEN 1
        WHEN 'read' THEN 2
        WHEN 'archived' THEN 3
        ELSE 4
    END,
    im.created_at DESC;

COMMIT;

-- Verificare rapida:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('accept_transfer_request', 'reject_transfer_request');
-- SELECT * FROM v_transfer_requests ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM v_inbox_messages ORDER BY created_at DESC LIMIT 10;
