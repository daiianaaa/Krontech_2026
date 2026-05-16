-- 03_create_frontend_views.sql
-- Views pentru backend/frontend.

-- =========================
-- 1. DASHBOARD SUMMARY
-- =========================

CREATE OR REPLACE VIEW v_ai_dashboard_summary AS
SELECT
    (SELECT COUNT(*)
     FROM ai_predictions
     WHERE prediction_type = 'EXPIRY_RISK'
       AND risk_level = 'HIGH') AS high_expiry_risks,

    (SELECT COUNT(*)
     FROM ai_predictions
     WHERE prediction_type = 'EXPIRY_RISK'
       AND risk_level = 'MID') AS mid_expiry_risks,

    (SELECT COUNT(*)
     FROM ai_predictions
     WHERE prediction_type = 'SHORTAGE_RISK'
       AND risk_level = 'HIGH') AS high_shortage_risks,

    (SELECT COUNT(*)
     FROM ai_predictions
     WHERE prediction_type = 'SHORTAGE_RISK'
       AND risk_level = 'MID') AS mid_shortage_risks,

    (SELECT COUNT(*)
     FROM transfer_recommendations
     WHERE status = 'pending') AS pending_transfer_recommendations,

    (SELECT COALESCE(ROUND(SUM(net_savings), 2), 0)
     FROM transfer_recommendations
     WHERE status = 'pending') AS estimated_pending_savings,

    (SELECT COUNT(*)
     FROM alerts
     WHERE status = 'new') AS new_alerts,

    (SELECT COUNT(*)
     FROM restock_orders
     WHERE status IN ('planned', 'ordered', 'in_transit')) AS active_restock_orders,

    (SELECT MAX(created_at)
     FROM ai_predictions) AS last_ai_prediction_at,

    (SELECT MAX(finished_at)
     FROM ai_run_logs
     WHERE status = 'success') AS last_successful_ai_run_at;

-- =========================
-- 2. EXPIRY RISKS VIEW
-- =========================

CREATE OR REPLACE VIEW v_expiry_risks AS
SELECT
    p.id AS prediction_id,
    p.ai_run_id,
    h.id AS hospital_id,
    h.code AS hospital_code,
    h.name AS hospital_name,
    h.city AS hospital_city,
    h.county AS hospital_county,
    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.category AS medication_category,
    m.criticality AS medication_criticality,
    m.required_storage_type,
    b.id AS batch_id,
    b.batch_number,
    b.quantity_current,
    b.quantity_initial,
    b.expiry_date,
    b.received_date,
    p.days_to_expiry,
    p.estimated_expired_quantity,
    p.predicted_daily_demand,
    p.risk_level,
    p.confidence_score,
    b.purchase_price_per_unit,
    b.disposal_cost_per_unit,
    ROUND((p.estimated_expired_quantity * b.purchase_price_per_unit), 2) AS estimated_medication_value_at_risk,
    ROUND((p.estimated_expired_quantity * b.disposal_cost_per_unit), 2) AS estimated_disposal_cost,
    p.recommendation_text AS explanation,
    p.created_at
FROM ai_predictions p
JOIN hospitals h ON h.id = p.hospital_id
JOIN medications m ON m.id = p.medication_id
JOIN medication_batches b ON b.id = p.batch_id
WHERE p.prediction_type = 'EXPIRY_RISK'
ORDER BY
    CASE p.risk_level
        WHEN 'HIGH' THEN 1
        WHEN 'MID' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
    END,
    p.days_to_expiry ASC,
    p.estimated_expired_quantity DESC;

-- =========================
-- 3. SHORTAGE RISKS VIEW
-- =========================

CREATE OR REPLACE VIEW v_shortage_risks AS
SELECT
    p.id AS prediction_id,
    p.ai_run_id,
    h.id AS hospital_id,
    h.code AS hospital_code,
    h.name AS hospital_name,
    h.city AS hospital_city,
    h.county AS hospital_county,
    h.emergency_level,
    h.capacity_beds,
    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.category AS medication_category,
    m.criticality AS medication_criticality,
    m.required_storage_type,
    COALESCE((p.input_snapshot ->> 'current_stock')::integer, 0) AS current_stock,
    COALESCE((p.input_snapshot ->> 'incoming_restock_quantity')::integer, 0) AS incoming_restock_quantity,
    p.predicted_daily_demand,
    p.stock_coverage_days,
    p.risk_level,
    p.confidence_score,
    p.recommendation_text AS explanation,
    p.created_at
FROM ai_predictions p
JOIN hospitals h ON h.id = p.hospital_id
JOIN medications m ON m.id = p.medication_id
WHERE p.prediction_type = 'SHORTAGE_RISK'
ORDER BY
    CASE p.risk_level
        WHEN 'HIGH' THEN 1
        WHEN 'MID' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
    END,
    p.stock_coverage_days ASC;

-- =========================
-- 4. TRANSFER RECOMMENDATIONS VIEW
-- =========================

CREATE OR REPLACE VIEW v_transfer_recommendations AS
SELECT
    tr.id AS recommendation_id,
    tr.ai_run_id,
    tr.status,
    tr.risk_level,

    sh.id AS source_hospital_id,
    sh.code AS source_hospital_code,
    sh.name AS source_hospital_name,
    sh.city AS source_city,
    sh.county AS source_county,

    dh.id AS destination_hospital_id,
    dh.code AS destination_hospital_code,
    dh.name AS destination_hospital_name,
    dh.city AS destination_city,
    dh.county AS destination_county,

    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.category AS medication_category,
    m.criticality AS medication_criticality,
    m.required_storage_type,

    b.id AS batch_id,
    b.batch_number,
    b.quantity_current AS source_batch_current_quantity,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,

    tr.recommended_quantity,
    tr.expected_savings,
    tr.avoided_disposal_cost,
    tr.transport_cost,
    tr.net_savings,
    tr.distance_km,
    tr.recommended_transfer_date,
    tr.confidence_score,
    tr.reason,

    tr.accepted_by,
    au.full_name AS accepted_by_name,
    tr.accepted_at,
    tr.rejected_by,
    ru.full_name AS rejected_by_name,
    tr.rejected_at,
    tr.rejection_reason,
    tr.created_at,
    tr.updated_at
FROM transfer_recommendations tr
JOIN hospitals sh ON sh.id = tr.source_hospital_id
JOIN hospitals dh ON dh.id = tr.destination_hospital_id
JOIN medications m ON m.id = tr.medication_id
JOIN medication_batches b ON b.id = tr.batch_id
LEFT JOIN app_users au ON au.id = tr.accepted_by
LEFT JOIN app_users ru ON ru.id = tr.rejected_by
ORDER BY
    CASE tr.risk_level
        WHEN 'HIGH' THEN 1
        WHEN 'MID' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
    END,
    tr.net_savings DESC,
    tr.created_at DESC;

-- =========================
-- 5. ALERTS VIEW
-- =========================

CREATE OR REPLACE VIEW v_alerts AS
SELECT
    a.id AS alert_id,
    a.ai_run_id,
    a.alert_type,
    a.severity,
    a.status,
    a.title,
    a.message,
    h.id AS hospital_id,
    h.code AS hospital_code,
    h.name AS hospital_name,
    h.city AS hospital_city,
    h.county AS hospital_county,
    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    b.id AS batch_id,
    b.batch_number,
    b.expiry_date,
    a.created_at,
    a.acknowledged_at,
    a.resolved_at
FROM alerts a
LEFT JOIN hospitals h ON h.id = a.hospital_id
LEFT JOIN medications m ON m.id = a.medication_id
LEFT JOIN medication_batches b ON b.id = a.batch_id
ORDER BY
    CASE a.severity
        WHEN 'HIGH' THEN 1
        WHEN 'MID' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
    END,
    CASE a.status
        WHEN 'new' THEN 1
        WHEN 'acknowledged' THEN 2
        WHEN 'resolved' THEN 3
        ELSE 4
    END,
    a.created_at DESC;

-- =========================
-- 6. INVENTORY OVERVIEW VIEW
-- =========================

CREATE OR REPLACE VIEW v_inventory_overview AS
SELECT
    h.id AS hospital_id,
    h.code AS hospital_code,
    h.name AS hospital_name,
    h.city AS hospital_city,
    h.county AS hospital_county,
    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    m.category AS medication_category,
    m.criticality AS medication_criticality,
    m.required_storage_type,
    COALESCE(SUM(b.quantity_current), 0) AS total_current_stock,
    COUNT(b.id) AS batches_count,
    MIN(b.expiry_date) AS nearest_expiry_date,
    MIN(b.expiry_date) - CURRENT_DATE AS days_to_nearest_expiry,
    COALESCE(ROUND(AVG(b.purchase_price_per_unit), 2), 0) AS avg_purchase_price_per_unit,
    CASE
        WHEN hsc.id IS NOT NULL THEN TRUE
        ELSE FALSE
    END AS hospital_can_store_medication
FROM hospitals h
CROSS JOIN medications m
LEFT JOIN medication_batches b
    ON b.hospital_id = h.id
   AND b.medication_id = m.id
   AND b.status = 'available'
LEFT JOIN hospital_storage_capabilities hsc
    ON hsc.hospital_id = h.id
   AND hsc.storage_type = m.required_storage_type
   AND hsc.is_validated = TRUE
WHERE h.is_active = TRUE
  AND m.is_active = TRUE
GROUP BY
    h.id, h.code, h.name, h.city, h.county,
    m.id, m.code, m.name, m.category, m.criticality, m.required_storage_type,
    hsc.id
ORDER BY h.code, m.code;

-- =========================
-- 7. RESTOCK VIEW
-- =========================

CREATE OR REPLACE VIEW v_restock_orders AS
SELECT
    ro.id AS restock_order_id,
    ro.status,
    h.id AS hospital_id,
    h.code AS hospital_code,
    h.name AS hospital_name,
    m.id AS medication_id,
    m.code AS medication_code,
    m.name AS medication_name,
    s.id AS supplier_id,
    s.code AS supplier_code,
    s.name AS supplier_name,
    ro.requested_quantity,
    ro.expected_delivery_date,
    ro.actual_delivery_date,
    (ro.expected_delivery_date - CURRENT_DATE) AS days_until_expected_delivery,
    ro.unit_price,
    ROUND((ro.requested_quantity * ro.unit_price), 2) AS estimated_order_value,
    ro.notes,
    ro.created_at,
    ro.updated_at
FROM restock_orders ro
JOIN hospitals h ON h.id = ro.hospital_id
JOIN medications m ON m.id = ro.medication_id
LEFT JOIN suppliers s ON s.id = ro.supplier_id
ORDER BY
    CASE ro.status
        WHEN 'delayed' THEN 1
        WHEN 'in_transit' THEN 2
        WHEN 'ordered' THEN 3
        WHEN 'planned' THEN 4
        WHEN 'delivered' THEN 5
        ELSE 6
    END,
    ro.expected_delivery_date ASC;

-- =========================
-- 8. VERIFICARI RAPIDE
-- =========================

SELECT * FROM v_ai_dashboard_summary;

SELECT 'v_expiry_risks' AS view_name, COUNT(*) AS rows_count FROM v_expiry_risks
UNION ALL
SELECT 'v_shortage_risks', COUNT(*) FROM v_shortage_risks
UNION ALL
SELECT 'v_transfer_recommendations', COUNT(*) FROM v_transfer_recommendations
UNION ALL
SELECT 'v_alerts', COUNT(*) FROM v_alerts
UNION ALL
SELECT 'v_inventory_overview', COUNT(*) FROM v_inventory_overview
UNION ALL
SELECT 'v_restock_orders', COUNT(*) FROM v_restock_orders
ORDER BY view_name;
