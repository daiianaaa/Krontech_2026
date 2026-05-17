-- 07_ai_refresh_state.sql
-- Detectare generica schimbari DB pentru AI refresh.
-- Scop:
--   1. Orice modificare in tabelele operationale marcheaza refresh_required = TRUE.
--   2. ai_service_auto_refresh.py ruleaza 04 + 05 maximum o data la intervalul configurat.
--   3. Tabelele generate de AI sunt excluse ca sa evitam bucla infinita.

BEGIN;

-- =========================
-- 1. AI REFRESH STATE
-- =========================

CREATE TABLE IF NOT EXISTS ai_refresh_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    refresh_required BOOLEAN NOT NULL DEFAULT TRUE,
    change_version BIGINT NOT NULL DEFAULT 0,
    last_change_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_change_table TEXT,
    last_change_operation TEXT,
    last_refresh_started_at TIMESTAMP,
    last_refresh_finished_at TIMESTAMP,
    last_refresh_status TEXT,
    last_refresh_error TEXT,
    CONSTRAINT ai_refresh_state_single_row CHECK (id = 1)
);

INSERT INTO ai_refresh_state (
    id,
    refresh_required,
    change_version,
    last_change_at,
    last_change_table,
    last_change_operation
)
VALUES (
    1,
    TRUE,
    1,
    NOW(),
    'initial_setup',
    'INITIAL'
)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 2. FUNCTION: MARK REFRESH REQUIRED
-- =========================

CREATE OR REPLACE FUNCTION mark_ai_refresh_required()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ai_refresh_state
    SET refresh_required = TRUE,
        change_version = change_version + 1,
        last_change_at = NOW(),
        last_change_table = TG_TABLE_NAME,
        last_change_operation = TG_OP
    WHERE id = 1;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================
-- 3. AUTOMATIC TRIGGERS ON OPERATIONAL TABLES
-- =========================
-- Excludem:
--   - ai_refresh_state: tabelul de control
--   - ai_predictions, ai_run_logs, alerts: output-uri generate de 04
--   - transfer_recommendations: output generat de 05
--
-- Nota:
--   transfer_requests si inbox_messages RAMAN incluse, pentru ca sunt workflow manual/frontend.

DO $$
DECLARE
    r RECORD;
    v_trigger_name TEXT;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN (
              'ai_refresh_state',
              'ai_predictions',
              'ai_run_logs',
              'alerts',
              'transfer_recommendations'
          )
    LOOP
        v_trigger_name := 'trg_ai_refresh_' || r.tablename;

        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I ON %I;',
            v_trigger_name,
            r.tablename
        );

        EXECUTE format(
            'CREATE TRIGGER %I
             AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I
             FOR EACH STATEMENT
             EXECUTE FUNCTION mark_ai_refresh_required();',
            v_trigger_name,
            r.tablename
        );
    END LOOP;
END $$;

-- =========================
-- 4. HELPER FUNCTIONS
-- =========================

CREATE OR REPLACE FUNCTION request_ai_refresh(
    p_reason TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ai_refresh_state
    SET refresh_required = TRUE,
        change_version = change_version + 1,
        last_change_at = NOW(),
        last_change_table = COALESCE(p_reason, 'manual'),
        last_change_operation = 'MANUAL'
    WHERE id = 1;

    RETURN (
        SELECT jsonb_build_object(
            'status', 'success',
            'message', 'AI refresh has been requested',
            'refresh_required', refresh_required,
            'change_version', change_version,
            'last_change_at', last_change_at,
            'last_change_table', last_change_table,
            'last_change_operation', last_change_operation
        )
        FROM ai_refresh_state
        WHERE id = 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION complete_ai_refresh(
    p_observed_change_version BIGINT,
    p_status TEXT DEFAULT 'success',
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version BIGINT;
BEGIN
    SELECT change_version
    INTO v_current_version
    FROM ai_refresh_state
    WHERE id = 1
    FOR UPDATE;

    IF v_current_version = p_observed_change_version AND p_status = 'success' THEN
        UPDATE ai_refresh_state
        SET refresh_required = FALSE,
            last_refresh_finished_at = NOW(),
            last_refresh_status = p_status,
            last_refresh_error = NULL
        WHERE id = 1;
    ELSE
        -- Daca au aparut modificari in timpul rularii, refresh_required ramane TRUE.
        UPDATE ai_refresh_state
        SET refresh_required = TRUE,
            last_refresh_finished_at = NOW(),
            last_refresh_status = p_status,
            last_refresh_error = p_error
        WHERE id = 1;
    END IF;

    RETURN (
        SELECT jsonb_build_object(
            'status', 'success',
            'refresh_required', refresh_required,
            'change_version', change_version,
            'observed_change_version', p_observed_change_version,
            'last_refresh_status', last_refresh_status,
            'last_refresh_error', last_refresh_error
        )
        FROM ai_refresh_state
        WHERE id = 1
    );
END;
$$;

COMMIT;

-- =========================
-- 5. VERIFICARI RAPIDE
-- =========================

SELECT * FROM ai_refresh_state;

SELECT
    event_object_table AS table_name,
    trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_ai_refresh_%'
ORDER BY event_object_table, trigger_name;
