-- 04_accept_transfer_function.sql
-- Functii PostgreSQL pentru workflow-ul de transfer:
-- 1. accept_transfer(recommendation_id, manager_user_id)
-- 2. reject_transfer(recommendation_id, manager_user_id, reason)

-- =========================================================
-- 1. ACCEPT TRANSFER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION accept_transfer(
    p_recommendation_id UUID,
    p_manager_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_source_batch RECORD;
    v_new_batch_id UUID;
    v_transfer_out_id UUID;
    v_transfer_in_id UUID;
    v_manager RECORD;
    v_destination_batch_number VARCHAR(120);
BEGIN
    -- 1. Verificam utilizatorul.
    SELECT *
    INTO v_manager
    FROM app_users
    WHERE id = p_manager_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist or is inactive', p_manager_user_id;
    END IF;

    IF v_manager.role <> 'HOSPITAL_MANAGER' THEN
        RAISE EXCEPTION 'Only HOSPITAL_MANAGER can accept transfer recommendations. Current role: %', v_manager.role;
    END IF;

    -- 2. Luam recomandarea si blocam randul ca sa evitam dubla acceptare simultana.
    SELECT *
    INTO v_rec
    FROM transfer_recommendations
    WHERE id = p_recommendation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer recommendation % not found', p_recommendation_id;
    END IF;

    IF v_rec.status <> 'pending' THEN
        RAISE EXCEPTION 'Transfer recommendation % is not pending. Current status: %', p_recommendation_id, v_rec.status;
    END IF;

    -- 3. Luam batch-ul sursa si il blocam.
    SELECT *
    INTO v_source_batch
    FROM medication_batches
    WHERE id = v_rec.batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source batch % not found', v_rec.batch_id;
    END IF;

    IF v_source_batch.status <> 'available' THEN
        RAISE EXCEPTION 'Source batch % is not available. Current status: %', v_rec.batch_id, v_source_batch.status;
    END IF;

    IF v_source_batch.quantity_current < v_rec.recommended_quantity THEN
        RAISE EXCEPTION 'Not enough stock in source batch. Available %, required %',
            v_source_batch.quantity_current,
            v_rec.recommended_quantity;
    END IF;

    IF v_source_batch.expiry_date <= CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot transfer expired batch %. Expiry date: %',
            v_source_batch.batch_number,
            v_source_batch.expiry_date;
    END IF;

    -- 4. Scadem stocul din batch-ul sursa.
    UPDATE medication_batches
    SET quantity_current = quantity_current - v_rec.recommended_quantity,
        updated_at = NOW()
    WHERE id = v_source_batch.id;

    -- 5. Cream tranzactia TRANSFER_OUT la sursa.
    INSERT INTO inventory_transactions (
        batch_id,
        medication_id,
        hospital_id,
        department_id,
        transaction_type,
        quantity,
        transaction_date,
        reason,
        related_transfer_recommendation_id,
        created_by
    )
    VALUES (
        v_source_batch.id,
        v_rec.medication_id,
        v_rec.source_hospital_id,
        v_source_batch.department_id,
        'TRANSFER_OUT',
        v_rec.recommended_quantity,
        NOW(),
        'Transfer acceptat pe baza recomandării AI ' || v_rec.id::text,
        v_rec.id,
        p_manager_user_id
    )
    RETURNING id INTO v_transfer_out_id;

    -- 6. Cream un batch nou la destinatie, pastrand expiry_date si preturile batch-ului original.
    v_destination_batch_number := v_source_batch.batch_number || '-TR-' || substring(v_rec.id::text, 1, 8);

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
        v_rec.medication_id,
        v_rec.destination_hospital_id,
        NULL,
        v_source_batch.supplier_id,
        v_destination_batch_number,
        v_rec.recommended_quantity,
        v_rec.recommended_quantity,
        v_source_batch.expiry_date,
        CURRENT_DATE,
        v_source_batch.purchase_price_per_unit,
        v_source_batch.disposal_cost_per_unit,
        v_source_batch.storage_condition,
        'available',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_batch_id;

    -- 7. Cream tranzactia TRANSFER_IN la destinatie.
    INSERT INTO inventory_transactions (
        batch_id,
        medication_id,
        hospital_id,
        department_id,
        transaction_type,
        quantity,
        transaction_date,
        reason,
        related_transfer_recommendation_id,
        created_by
    )
    VALUES (
        v_new_batch_id,
        v_rec.medication_id,
        v_rec.destination_hospital_id,
        NULL,
        'TRANSFER_IN',
        v_rec.recommended_quantity,
        NOW(),
        'Transfer primit pe baza recomandării AI ' || v_rec.id::text,
        v_rec.id,
        p_manager_user_id
    )
    RETURNING id INTO v_transfer_in_id;

    -- 8. Marcam recomandarea ca accepted/completed.
    UPDATE transfer_recommendations
    SET status = 'accepted',
        accepted_by = p_manager_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_rec.id;

    -- 9. Audit log.
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        metadata,
        created_at
    )
    VALUES (
        p_manager_user_id,
        'ACCEPT_TRANSFER_RECOMMENDATION',
        'transfer_recommendations',
        v_rec.id,
        jsonb_build_object(
            'source_hospital_id', v_rec.source_hospital_id,
            'destination_hospital_id', v_rec.destination_hospital_id,
            'medication_id', v_rec.medication_id,
            'source_batch_id', v_source_batch.id,
            'destination_batch_id', v_new_batch_id,
            'recommended_quantity', v_rec.recommended_quantity,
            'transfer_out_transaction_id', v_transfer_out_id,
            'transfer_in_transaction_id', v_transfer_in_id,
            'net_savings', v_rec.net_savings
        ),
        NOW()
    );

    -- 10. Returnam rezultat simplu pentru backend.
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Transfer recommendation accepted successfully',
        'recommendation_id', v_rec.id,
        'source_batch_id', v_source_batch.id,
        'destination_batch_id', v_new_batch_id,
        'transfer_out_transaction_id', v_transfer_out_id,
        'transfer_in_transaction_id', v_transfer_in_id,
        'transferred_quantity', v_rec.recommended_quantity
    );
END;
$$;

-- =========================================================
-- 2. REJECT TRANSFER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION reject_transfer(
    p_recommendation_id UUID,
    p_manager_user_id UUID,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_manager RECORD;
BEGIN
    -- 1. Verificam utilizatorul.
    SELECT *
    INTO v_manager
    FROM app_users
    WHERE id = p_manager_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist or is inactive', p_manager_user_id;
    END IF;

    IF v_manager.role <> 'HOSPITAL_MANAGER' THEN
        RAISE EXCEPTION 'Only HOSPITAL_MANAGER can reject transfer recommendations. Current role: %', v_manager.role;
    END IF;

    -- 2. Luam recomandarea.
    SELECT *
    INTO v_rec
    FROM transfer_recommendations
    WHERE id = p_recommendation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer recommendation % not found', p_recommendation_id;
    END IF;

    IF v_rec.status <> 'pending' THEN
        RAISE EXCEPTION 'Transfer recommendation % is not pending. Current status: %', p_recommendation_id, v_rec.status;
    END IF;

    -- 3. Marcam ca rejected.
    UPDATE transfer_recommendations
    SET status = 'rejected',
        rejected_by = p_manager_user_id,
        rejected_at = NOW(),
        rejection_reason = COALESCE(p_rejection_reason, 'No reason provided'),
        updated_at = NOW()
    WHERE id = v_rec.id;

    -- 4. Audit log.
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        metadata,
        created_at
    )
    VALUES (
        p_manager_user_id,
        'REJECT_TRANSFER_RECOMMENDATION',
        'transfer_recommendations',
        v_rec.id,
        jsonb_build_object(
            'source_hospital_id', v_rec.source_hospital_id,
            'destination_hospital_id', v_rec.destination_hospital_id,
            'medication_id', v_rec.medication_id,
            'recommended_quantity', v_rec.recommended_quantity,
            'rejection_reason', COALESCE(p_rejection_reason, 'No reason provided')
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Transfer recommendation rejected successfully',
        'recommendation_id', v_rec.id,
        'rejection_reason', COALESCE(p_rejection_reason, 'No reason provided')
    );
END;
$$;

-- =========================================================
-- 3. TEST QUERIES / EXEMPLE DE APEL
-- =========================================================

-- Vezi o recomandare pending:
-- SELECT recommendation_id, source_hospital_name, destination_hospital_name, medication_name, recommended_quantity
-- FROM v_transfer_recommendations
-- WHERE status = 'pending'
-- LIMIT 1;

-- Vezi un manager demo:
-- SELECT id, full_name, email, role
-- FROM app_users
-- WHERE role = 'HOSPITAL_MANAGER'
-- LIMIT 1;

-- Accepta o recomandare:
-- SELECT accept_transfer(
--   'RECOMMENDATION_UUID_AICI'::uuid,
--   'MANAGER_UUID_AICI'::uuid
-- );

-- Respinge o recomandare:
-- SELECT reject_transfer(
--   'RECOMMENDATION_UUID_AICI'::uuid,
--   'MANAGER_UUID_AICI'::uuid,
--   'Destinația nu poate primi transportul astăzi'
-- );

-- Verificare functii create:
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('accept_transfer', 'reject_transfer')
ORDER BY routine_name;
