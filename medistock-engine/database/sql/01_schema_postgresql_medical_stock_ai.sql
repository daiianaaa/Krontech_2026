-- 01_schema_postgresql_medical_stock_ai.sql
-- PostgreSQL schema pentru Medical Stock Risk & Redistribution Engine

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- 1. ENUM TYPES
-- =========================

DO $$ BEGIN
    CREATE TYPE hospital_type AS ENUM ('county', 'emergency', 'municipal', 'private', 'clinical', 'military', 'pharmacy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE emergency_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE department_type AS ENUM ('ICU', 'ER', 'surgery', 'pediatrics', 'oncology', 'cardiology', 'neurology', 'internal_medicine', 'infectious_diseases', 'pharmacy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE criticality_level AS ENUM ('low', 'medium', 'high', 'life_saving');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE medication_form AS ENUM ('tablet', 'capsule', 'vial', 'ampoule', 'syrup', 'cream', 'injection', 'solution', 'inhaler', 'bag');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE storage_type AS ENUM ('normal', 'cold', 'frozen', 'controlled', 'hazardous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('available', 'reserved', 'transferred', 'expired', 'disposed', 'quarantined', 'recalled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('INBOUND', 'USAGE', 'TRANSFER_OUT', 'TRANSFER_IN', 'EXPIRED', 'DISPOSED', 'ADJUSTMENT', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE prediction_type AS ENUM ('EXPIRY_RISK', 'SHORTAGE_RISK', 'TRANSFER_RECOMMENDATION', 'ORDER_RECOMMENDATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('OK', 'LOW', 'MID', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('HOSPITAL_MANAGER', 'PHARMACIST', 'PROVIDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE restock_status AS ENUM ('planned', 'ordered', 'in_transit', 'delivered', 'cancelled', 'delayed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('new', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ai_run_status AS ENUM ('running', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 2. STATIC / MASTER DATA
-- =========================

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    username VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type hospital_type NOT NULL,
    city VARCHAR(120) NOT NULL,
    county VARCHAR(120) NOT NULL,
    address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    capacity_beds INTEGER NOT NULL CHECK (capacity_beds > 0),
    emergency_level emergency_level NOT NULL DEFAULT 'medium',
    has_icu BOOLEAN NOT NULL DEFAULT FALSE,
    has_surgery BOOLEAN NOT NULL DEFAULT FALSE,
    total_storage_capacity_units INTEGER NOT NULL DEFAULT 0 CHECK (total_storage_capacity_units >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_storage_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    storage_type storage_type NOT NULL,
    capacity_units INTEGER NOT NULL DEFAULT 0 CHECK (capacity_units >= 0),
    current_utilization_units INTEGER NOT NULL DEFAULT 0 CHECK (current_utilization_units >= 0),
    temperature_min_c NUMERIC(5, 2),
    temperature_max_c NUMERIC(5, 2),
    is_validated BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hospital_id, storage_type),
    CHECK (current_utilization_units <= capacity_units)
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(120) NOT NULL,
    department_type department_type NOT NULL,
    number_of_beds INTEGER NOT NULL DEFAULT 0 CHECK (number_of_beds >= 0),
    average_patients_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (average_patients_per_day >= 0),
    criticality_level criticality_level NOT NULL DEFAULT 'medium',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hospital_id, code)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(120),
    county VARCHAR(120),
    average_delivery_days NUMERIC(6, 2) NOT NULL DEFAULT 3 CHECK (average_delivery_days >= 0),
    reliability_score NUMERIC(4, 3) NOT NULL DEFAULT 0.900 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(120) NOT NULL,
    therapeutic_class VARCHAR(120),
    form medication_form NOT NULL,
    concentration VARCHAR(80) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    criticality criticality_level NOT NULL DEFAULT 'medium',
    required_storage_type storage_type NOT NULL DEFAULT 'normal',
    controlled_substance BOOLEAN NOT NULL DEFAULT FALSE,
    standard_daily_usage_per_patient NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (standard_daily_usage_per_patient >= 0),
    default_min_buffer_days INTEGER NOT NULL DEFAULT 7 CHECK (default_min_buffer_days >= 0),
    default_target_buffer_days INTEGER NOT NULL DEFAULT 30 CHECK (default_target_buffer_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 3. USERS / ACCESS / AUDIT
-- =========================

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(120) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'HOSPITAL_MANAGER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (role, permission)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    entity_name VARCHAR(120) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 4. INVENTORY DATA
-- =========================

CREATE TABLE IF NOT EXISTS medication_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    batch_number VARCHAR(80) NOT NULL,
    quantity_initial INTEGER NOT NULL CHECK (quantity_initial >= 0),
    quantity_current INTEGER NOT NULL CHECK (quantity_current >= 0),
    expiry_date DATE NOT NULL,
    received_date DATE NOT NULL,
    purchase_price_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (purchase_price_per_unit >= 0),
    disposal_cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (disposal_cost_per_unit >= 0),
    storage_condition storage_type NOT NULL DEFAULT 'normal',
    status batch_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (quantity_current <= quantity_initial),
    CHECK (received_date < expiry_date),
    UNIQUE (supplier_id, medication_id, batch_number, hospital_id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES medication_batches(id) ON DELETE RESTRICT,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT,
    related_transfer_recommendation_id UUID,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    consumption_date DATE NOT NULL,
    quantity_used INTEGER NOT NULL CHECK (quantity_used >= 0),
    patients_count INTEGER NOT NULL DEFAULT 0 CHECK (patients_count >= 0),
    emergency_cases INTEGER NOT NULL DEFAULT 0 CHECK (emergency_cases >= 0),
    season VARCHAR(40),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hospital_id, department_id, medication_id, consumption_date)
);

CREATE TABLE IF NOT EXISTS stock_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    min_buffer_days INTEGER NOT NULL DEFAULT 7 CHECK (min_buffer_days >= 0),
    target_buffer_days INTEGER NOT NULL DEFAULT 30 CHECK (target_buffer_days >= min_buffer_days),
    max_buffer_days INTEGER NOT NULL DEFAULT 60 CHECK (max_buffer_days >= target_buffer_days),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hospital_id, department_id, medication_id)
);

-- =========================
-- 5. RESTOCK / SUPPLY PLANNING
-- =========================

CREATE TABLE IF NOT EXISTS restock_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    status restock_status NOT NULL DEFAULT 'planned',
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    notes TEXT,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_hospital_med_status ON restock_orders(hospital_id, medication_id, status);
CREATE INDEX IF NOT EXISTS idx_restock_expected_delivery ON restock_orders(expected_delivery_date);

-- =========================
-- 6. LOGISTICS
-- =========================

CREATE TABLE IF NOT EXISTS transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    destination_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    distance_km NUMERIC(10, 2) NOT NULL CHECK (distance_km >= 0),
    estimated_hours NUMERIC(10, 2) NOT NULL CHECK (estimated_hours >= 0),
    base_transport_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_transport_cost >= 0),
    supports_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
    supports_frozen_chain BOOLEAN NOT NULL DEFAULT FALSE,
    supports_controlled_transport BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (source_hospital_id, destination_hospital_id),
    CHECK (source_hospital_id <> destination_hospital_id)
);

-- =========================
-- 7. AI OUTPUT TABLES
-- =========================

CREATE TABLE IF NOT EXISTS ai_run_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status ai_run_status NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    triggered_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    input_summary JSONB,
    output_summary JSONB,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id UUID REFERENCES ai_run_logs(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES medication_batches(id) ON DELETE CASCADE,
    prediction_type prediction_type NOT NULL,
    risk_level risk_level NOT NULL DEFAULT 'OK',
    predicted_daily_demand NUMERIC(12, 4),
    stock_coverage_days NUMERIC(12, 4),
    days_to_expiry INTEGER,
    estimated_expired_quantity INTEGER,
    confidence_score NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    recommendation_text TEXT,
    input_snapshot JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id UUID REFERENCES ai_run_logs(id) ON DELETE SET NULL,
    source_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    destination_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES medication_batches(id) ON DELETE CASCADE,
    recommended_quantity INTEGER NOT NULL CHECK (recommended_quantity > 0),
    reason TEXT NOT NULL,
    risk_level risk_level NOT NULL DEFAULT 'MID',
    expected_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    avoided_disposal_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    transport_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    distance_km NUMERIC(10, 2),
    recommended_transfer_date DATE NOT NULL,
    confidence_score NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    status recommendation_status NOT NULL DEFAULT 'pending',
    accepted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    rejected_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (source_hospital_id <> destination_hospital_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id UUID REFERENCES ai_run_logs(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES medication_batches(id) ON DELETE CASCADE,
    alert_type VARCHAR(120) NOT NULL,
    severity risk_level NOT NULL DEFAULT 'LOW',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status alert_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP
);

-- =========================
-- 8. INDEXES FOR PERFORMANCE
-- =========================

CREATE INDEX IF NOT EXISTS idx_hospitals_county_city ON hospitals(county, city);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON hospitals(is_active);

CREATE INDEX IF NOT EXISTS idx_storage_hospital_type ON hospital_storage_capabilities(hospital_id, storage_type);

CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_type ON departments(department_type);

CREATE INDEX IF NOT EXISTS idx_medications_category ON medications(category);
CREATE INDEX IF NOT EXISTS idx_medications_storage ON medications(required_storage_type);
CREATE INDEX IF NOT EXISTS idx_medications_criticality ON medications(criticality);

CREATE INDEX IF NOT EXISTS idx_batches_med_hospital ON medication_batches(medication_id, hospital_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medication_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON medication_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_storage ON medication_batches(storage_condition);

CREATE INDEX IF NOT EXISTS idx_transactions_batch ON inventory_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_med_hospital_date ON inventory_transactions(medication_id, hospital_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_consumption_med_hospital_date ON daily_consumption(medication_id, hospital_id, consumption_date);
CREATE INDEX IF NOT EXISTS idx_consumption_date ON daily_consumption(consumption_date);

CREATE INDEX IF NOT EXISTS idx_thresholds_hospital_med ON stock_thresholds(hospital_id, medication_id);

CREATE INDEX IF NOT EXISTS idx_routes_source_destination ON transport_routes(source_hospital_id, destination_hospital_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON transport_routes(is_active);

CREATE INDEX IF NOT EXISTS idx_predictions_run ON ai_predictions(ai_run_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type_risk ON ai_predictions(prediction_type, risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_hospital_med ON ai_predictions(hospital_id, medication_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON ai_predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON transfer_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_risk ON transfer_recommendations(risk_level);
CREATE INDEX IF NOT EXISTS idx_recommendations_source_destination ON transfer_recommendations(source_hospital_id, destination_hospital_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_medication ON transfer_recommendations(medication_id);

CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_hospital ON alerts(hospital_id);

-- =========================
-- 9. OPTIONAL HELPER VIEW
-- =========================

CREATE OR REPLACE VIEW v_current_stock_by_hospital_medication AS
SELECT
    h.id AS hospital_id,
    h.name AS hospital_name,
    m.id AS medication_id,
    m.name AS medication_name,
    m.required_storage_type,
    m.criticality,
    SUM(b.quantity_current) AS total_quantity_current,
    MIN(b.expiry_date) AS nearest_expiry_date,
    COUNT(b.id) AS active_batches_count
FROM medication_batches b
JOIN hospitals h ON h.id = b.hospital_id
JOIN medications m ON m.id = b.medication_id
WHERE b.status = 'available'
GROUP BY h.id, h.name, m.id, m.name, m.required_storage_type, m.criticality;

CREATE OR REPLACE VIEW v_storage_compatibility AS
SELECT
    h.id AS hospital_id,
    h.name AS hospital_name,
    m.id AS medication_id,
    m.name AS medication_name,
    m.required_storage_type,
    CASE WHEN hsc.id IS NOT NULL AND hsc.is_validated = TRUE THEN TRUE ELSE FALSE END AS can_store_medication
FROM hospitals h
CROSS JOIN medications m
LEFT JOIN hospital_storage_capabilities hsc
    ON hsc.hospital_id = h.id
   AND hsc.storage_type = m.required_storage_type
WHERE h.is_active = TRUE
  AND m.is_active = TRUE;
