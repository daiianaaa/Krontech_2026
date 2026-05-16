-- 02_seed_static_data_medical_stock_ai.sql
-- Seed static data: 20 spitale, 10 farmacii, 35 medicamente, furnizori, departamente, storage, useri demo.

BEGIN;

-- =========================
-- 1. SUPPLIERS
-- =========================

INSERT INTO suppliers (code, name, city, county, average_delivery_days, reliability_score, contact_email, phone)
VALUES
('SUP-001', 'PharmaPlus Distribution', 'București', 'București', 2.5, 0.960, 'orders@pharmaplus.ro', '+40 21 300 1001'),
('SUP-002', 'MediLogistic Romania', 'Cluj-Napoca', 'Cluj', 3.0, 0.940, 'contact@medilogistic.ro', '+40 264 300 202'),
('SUP-003', 'BioMed Supply', 'Timișoara', 'Timiș', 4.0, 0.910, 'supply@biomed.ro', '+40 256 300 303'),
('SUP-004', 'ColdChain Pharma', 'Brașov', 'Brașov', 2.0, 0.970, 'cold@coldchainpharma.ro', '+40 268 300 404'),
('SUP-005', 'MedEuropa Logistics', 'Iași', 'Iași', 4.5, 0.890, 'office@medeuropa.ro', '+40 232 300 505'),
('SUP-006', 'Emergency Medical Provider', 'Constanța', 'Constanța', 1.5, 0.950, 'urgent@emp.ro', '+40 241 300 606'),
('SUP-007', 'National Hospital Supply', 'Sibiu', 'Sibiu', 3.5, 0.920, 'orders@nhsupply.ro', '+40 269 300 707')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- 2. ORGANIZATII - 20 spitale + 10 farmacii
-- =========================

INSERT INTO hospitals (
    code, username, name, type, city, county, address, latitude, longitude,
    capacity_beds, emergency_level, has_icu, has_surgery, total_storage_capacity_units
)
VALUES
('HOSP-001', 'spital.cluj.urgenta', 'Spitalul Clinic Județean de Urgență Cluj', 'emergency', 'Cluj-Napoca', 'Cluj', 'Str. Clinicilor 3-5', 46.7699, 23.5899, 1500, 'high', TRUE, TRUE, 120000),
('HOSP-002', 'spital.turda.municipal', 'Spitalul Municipal Turda', 'municipal', 'Turda', 'Cluj', 'Str. Andrei Mureșanu 12', 46.5667, 23.7833, 350, 'medium', TRUE, TRUE, 42000),
('HOSP-003', 'spital.alba.judetean', 'Spitalul Județean de Urgență Alba Iulia', 'county', 'Alba Iulia', 'Alba', 'Bd. Revoluției 23', 46.0667, 23.5833, 720, 'high', TRUE, TRUE, 70000),
('HOSP-004', 'spital.sibiu.urgenta', 'Spitalul Clinic Județean de Urgență Sibiu', 'emergency', 'Sibiu', 'Sibiu', 'Bd. Corneliu Coposu 2-4', 45.7983, 24.1256, 1050, 'high', TRUE, TRUE, 98000),
('HOSP-005', 'spital.bucuresti.urgenta', 'Spitalul Clinic de Urgență București', 'emergency', 'București', 'București', 'Calea Floreasca 8', 44.4519, 26.1025, 1300, 'high', TRUE, TRUE, 115000),
('HOSP-006', 'spital.timisoara.judetean', 'Spitalul Județean de Urgență Timișoara', 'county', 'Timișoara', 'Timiș', 'Bd. Liviu Rebreanu 156', 45.7489, 21.2087, 1100, 'high', TRUE, TRUE, 100000),
('HOSP-007', 'spital.oradea.municipal', 'Spitalul Clinic Municipal Oradea', 'municipal', 'Oradea', 'Bihor', 'Str. Corneliu Coposu 12', 47.0722, 21.9211, 850, 'high', TRUE, TRUE, 83000),
('HOSP-008', 'spital.brasov.judetean', 'Spitalul Clinic Județean de Urgență Brașov', 'county', 'Brașov', 'Brașov', 'Calea București 25-27', 45.6427, 25.5887, 920, 'high', TRUE, TRUE, 88000),
('HOSP-009', 'spital.iasi.urgenta', 'Spitalul Clinic Județean de Urgență Iași', 'emergency', 'Iași', 'Iași', 'Str. General Berthelot 2', 47.1585, 27.6014, 1400, 'high', TRUE, TRUE, 110000),
('HOSP-010', 'spital.constanta.judetean', 'Spitalul Clinic Județean de Urgență Constanța', 'county', 'Constanța', 'Constanța', 'Bd. Tomis 145', 44.1807, 28.6348, 1000, 'high', TRUE, TRUE, 95000),
('HOSP-011', 'spital.craiova.judetean', 'Spitalul Județean de Urgență Craiova', 'county', 'Craiova', 'Dolj', 'Str. Tabaci 1', 44.3148, 23.8005, 1150, 'high', TRUE, TRUE, 97000),
('HOSP-012', 'spital.arad.judetean', 'Spitalul Județean de Urgență Arad', 'county', 'Arad', 'Arad', 'Str. Andrenyi Karoly 2-4', 46.1866, 21.3123, 750, 'medium', TRUE, TRUE, 74000),
('HOSP-013', 'spital.ploiesti.judetean', 'Spitalul Județean de Urgență Ploiești', 'county', 'Ploiești', 'Prahova', 'Str. Găgeni 100', 44.9565, 26.0145, 900, 'high', TRUE, TRUE, 86000),
('HOSP-014', 'spital.bacau.judetean', 'Spitalul Județean de Urgență Bacău', 'county', 'Bacău', 'Bacău', 'Str. Spiru Haret 2', 46.5672, 26.9146, 850, 'medium', TRUE, TRUE, 79000),
('HOSP-015', 'spital.suceava.judetean', 'Spitalul Județean de Urgență Suceava', 'county', 'Suceava', 'Suceava', 'Bd. 1 Decembrie 1918 21', 47.6514, 26.2556, 950, 'high', TRUE, TRUE, 90000),
('HOSP-016', 'spital.targu.mures', 'Spitalul Județean de Urgență Târgu Mureș', 'clinical', 'Târgu Mureș', 'Mureș', 'Str. Gheorghe Marinescu 50', 46.5425, 24.5575, 1200, 'high', TRUE, TRUE, 102000),
('HOSP-017', 'spital.dej.municipal', 'Spitalul Municipal Dej', 'municipal', 'Dej', 'Cluj', 'Str. 1 Mai 27', 47.1417, 23.8784, 280, 'medium', FALSE, TRUE, 35000),
('HOSP-018', 'spital.campia.turzii', 'Spitalul Municipal Câmpia Turzii', 'municipal', 'Câmpia Turzii', 'Cluj', 'Str. Avram Iancu 33', 46.5500, 23.8833, 220, 'low', FALSE, TRUE, 30000),
('HOSP-019', 'spital.huedin.orasenesc', 'Spitalul Orășenesc Huedin', 'municipal', 'Huedin', 'Cluj', 'Str. Horea 52', 46.8667, 23.0500, 160, 'low', FALSE, FALSE, 24000),
('HOSP-020', 'spital.cluj.medlife', 'Spitalul Privat MedLife Transilvania', 'private', 'Cluj-Napoca', 'Cluj', 'Str. Frunzișului 75', 46.7519, 23.5685, 180, 'medium', TRUE, TRUE, 28000),
('PHARM-001', 'farmacie.cluj.ducfarm', 'Farmacia Ducfarm Cluj', 'pharmacy', 'Cluj-Napoca', 'Cluj', 'Str. Memorandumului 10', 46.7704, 23.5890, 120, 'low', FALSE, FALSE, 18000),
('PHARM-002', 'farmacie.turda.catena', 'Farmacia Catena Turda', 'pharmacy', 'Turda', 'Cluj', 'Piața Republicii 4', 46.5660, 23.7860, 100, 'low', FALSE, FALSE, 16000),
('PHARM-003', 'farmacie.alba.helpnet', 'Farmacia Help Net Alba Iulia', 'pharmacy', 'Alba Iulia', 'Bd. Transilvaniei 15', 46.0712, 23.5750, 110, 'low', FALSE, FALSE, 17000),
('PHARM-004', 'farmacie.sibiu.drmax', 'Farmacia Dr. Max Sibiu', 'pharmacy', 'Sibiu', 'Str. Nicolae Bălcescu 22', 45.7965, 24.1515, 115, 'low', FALSE, FALSE, 17500),
('PHARM-005', 'farmacie.bucuresti.sensiblu', 'Farmacia Sensiblu București', 'pharmacy', 'București', 'Bd. Unirii 45', 44.4268, 26.1025, 140, 'low', FALSE, FALSE, 22000),
('PHARM-006', 'farmacie.timisoara.catena', 'Farmacia Catena Timișoara', 'pharmacy', 'Timișoara', 'Piața Victoriei 3', 45.7537, 21.2257, 125, 'low', FALSE, FALSE, 19000),
('PHARM-007', 'farmacie.oradea.ducfarm', 'Farmacia Ducfarm Oradea', 'pharmacy', 'Oradea', 'Str. Republicii 18', 47.0571, 21.9410, 105, 'low', FALSE, FALSE, 16500),
('PHARM-008', 'farmacie.brasov.drmax', 'Farmacia Dr. Max Brașov', 'pharmacy', 'Brașov', 'Str. Republicii 30', 45.6425, 25.5887, 115, 'low', FALSE, FALSE, 17500),
('PHARM-009', 'farmacie.iasi.helpnet', 'Farmacia Help Net Iași', 'pharmacy', 'Iași', 'Bd. Ștefan cel Mare 12', 47.1610, 27.5875, 120, 'low', FALSE, FALSE, 18000),
('PHARM-010', 'farmacie.constanta.catena', 'Farmacia Catena Constanța', 'pharmacy', 'Constanța', 'Bd. Tomis 120', 44.1768, 28.6500, 120, 'low', FALSE, FALSE, 18000)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- 3. HOSPITAL STORAGE CAPABILITIES
-- Fiecare spital are normal storage.
-- Unele spitale NU au cold/frozen/controlled storage, ca programul sa blocheze transferuri incompatibile.
-- =========================

INSERT INTO hospital_storage_capabilities (hospital_id, storage_type, capacity_units, current_utilization_units, temperature_min_c, temperature_max_c, is_validated, notes)
SELECT id, 'normal', total_storage_capacity_units, 0, 15, 25, TRUE, 'Depozitare standard medicamente'
FROM hospitals
ON CONFLICT (hospital_id, storage_type) DO NOTHING;

-- Cold storage: nu toate spitalele au camera frigorifica validata.
INSERT INTO hospital_storage_capabilities (hospital_id, storage_type, capacity_units, current_utilization_units, temperature_min_c, temperature_max_c, is_validated, notes)
SELECT id, 'cold',
       CASE
           WHEN emergency_level = 'high' THEN 18000
           WHEN emergency_level = 'medium' THEN 8000
           ELSE 3500
       END,
       0, 2, 8, TRUE, 'Cameră frigorifică validată 2-8°C'
FROM hospitals
WHERE code IN (
    'HOSP-001','HOSP-002','HOSP-003','HOSP-004','HOSP-005','HOSP-006','HOSP-007','HOSP-008','HOSP-009','HOSP-010',
    'HOSP-011','HOSP-012','HOSP-013','HOSP-014','HOSP-015','HOSP-016','HOSP-020',
    'PHARM-001','PHARM-002','PHARM-003','PHARM-004','PHARM-005','PHARM-006','PHARM-007','PHARM-008','PHARM-009','PHARM-010'
)
ON CONFLICT (hospital_id, storage_type) DO NOTHING;

-- Frozen storage: doar spitale mari/clinice.
INSERT INTO hospital_storage_capabilities (hospital_id, storage_type, capacity_units, current_utilization_units, temperature_min_c, temperature_max_c, is_validated, notes)
SELECT id, 'frozen',
       CASE WHEN capacity_beds >= 1000 THEN 6000 ELSE 2500 END,
       0, -25, -15, TRUE, 'Depozitare congelată'
FROM hospitals
WHERE code IN ('HOSP-001','HOSP-004','HOSP-005','HOSP-006','HOSP-009','HOSP-010','HOSP-016')
ON CONFLICT (hospital_id, storage_type) DO NOTHING;

-- Controlled storage: pentru opioide/substante controlate; lipsesc intentionat din unele spitale mici.
INSERT INTO hospital_storage_capabilities (hospital_id, storage_type, capacity_units, current_utilization_units, temperature_min_c, temperature_max_c, is_validated, notes)
SELECT id, 'controlled',
       CASE WHEN emergency_level = 'high' THEN 5000 ELSE 2000 END,
       0, 15, 25, TRUE, 'Dulap securizat / acces controlat'
FROM hospitals
WHERE code IN ('HOSP-001','HOSP-002','HOSP-003','HOSP-004','HOSP-005','HOSP-006','HOSP-007','HOSP-008','HOSP-009','HOSP-010','HOSP-011','HOSP-012','HOSP-013','HOSP-014','HOSP-015','HOSP-016','HOSP-020',
    'PHARM-001','PHARM-002','PHARM-003','PHARM-004','PHARM-005','PHARM-006','PHARM-007','PHARM-008','PHARM-009','PHARM-010')
ON CONFLICT (hospital_id, storage_type) DO NOTHING;

-- =========================
-- 4. DEPARTMENTS
-- Fiecare spital primeste departamente relevante.
-- =========================

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'PHARM', 'Farmacie spital', 'pharmacy', 0, 0, 'high'
FROM hospitals
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'ER', 'Unitate Primiri Urgențe', 'ER',
       CASE WHEN emergency_level = 'high' THEN 45 WHEN emergency_level = 'medium' THEN 25 ELSE 10 END,
       CASE WHEN emergency_level = 'high' THEN 180 WHEN emergency_level = 'medium' THEN 80 ELSE 25 END,
       'high'
FROM hospitals
WHERE type <> 'pharmacy'
  AND emergency_level IN ('medium', 'high')
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'ICU', 'ATI', 'ICU',
       CASE WHEN emergency_level = 'high' THEN 35 WHEN emergency_level = 'medium' THEN 12 ELSE 6 END,
       CASE WHEN emergency_level = 'high' THEN 30 WHEN emergency_level = 'medium' THEN 10 ELSE 4 END,
       'life_saving'
FROM hospitals
WHERE type <> 'pharmacy'
  AND has_icu = TRUE
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'SURG', 'Chirurgie', 'surgery',
       CASE WHEN capacity_beds >= 1000 THEN 120 WHEN capacity_beds >= 500 THEN 70 ELSE 25 END,
       CASE WHEN capacity_beds >= 1000 THEN 85 WHEN capacity_beds >= 500 THEN 45 ELSE 16 END,
       'high'
FROM hospitals
WHERE type <> 'pharmacy'
  AND has_surgery = TRUE
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'INT', 'Medicină internă', 'internal_medicine',
       CASE WHEN capacity_beds >= 1000 THEN 160 WHEN capacity_beds >= 500 THEN 90 ELSE 35 END,
       CASE WHEN capacity_beds >= 1000 THEN 120 WHEN capacity_beds >= 500 THEN 60 ELSE 20 END,
       'medium'
FROM hospitals
WHERE type <> 'pharmacy'
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'PED', 'Pediatrie', 'pediatrics',
       CASE WHEN capacity_beds >= 800 THEN 80 ELSE 30 END,
       CASE WHEN capacity_beds >= 800 THEN 55 ELSE 18 END,
       'medium'
FROM hospitals
WHERE type <> 'pharmacy'
  AND capacity_beds >= 220
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'CARD', 'Cardiologie', 'cardiology',
       CASE WHEN capacity_beds >= 1000 THEN 90 WHEN capacity_beds >= 500 THEN 45 ELSE 20 END,
       CASE WHEN capacity_beds >= 1000 THEN 65 WHEN capacity_beds >= 500 THEN 32 ELSE 12 END,
       'high'
FROM hospitals
WHERE type <> 'pharmacy'
  AND capacity_beds >= 280
ON CONFLICT (hospital_id, code) DO NOTHING;

INSERT INTO departments (hospital_id, code, name, department_type, number_of_beds, average_patients_per_day, criticality_level)
SELECT id, 'ONC', 'Oncologie', 'oncology',
       CASE WHEN capacity_beds >= 1000 THEN 70 ELSE 25 END,
       CASE WHEN capacity_beds >= 1000 THEN 45 ELSE 12 END,
       'high'
FROM hospitals
WHERE code IN ('HOSP-001','HOSP-004','HOSP-005','HOSP-006','HOSP-009','HOSP-010','HOSP-011','HOSP-016')
ON CONFLICT (hospital_id, code) DO NOTHING;

-- =========================
-- 5. MEDICATIONS - 35 medicamente
-- required_storage_type va fi folosit de program pentru compatibilitate storage.
-- =========================

INSERT INTO medications (
    code, name, generic_name, category, therapeutic_class, form, concentration, unit,
    criticality, required_storage_type, controlled_substance, standard_daily_usage_per_patient,
    default_min_buffer_days, default_target_buffer_days
)
VALUES
('MED-001', 'Paracetamol 500mg', 'Paracetamol', 'Analgezice', 'Analgezic/Antipiretic', 'tablet', '500mg', 'tabletă', 'medium', 'normal', FALSE, 0.1800, 7, 30),
('MED-002', 'Ibuprofen 400mg', 'Ibuprofen', 'Analgezice', 'AINS', 'tablet', '400mg', 'tabletă', 'medium', 'normal', FALSE, 0.1200, 7, 30),
('MED-003', 'Aspirin 100mg', 'Acid acetilsalicilic', 'Cardiologie', 'Antiagregant plachetar', 'tablet', '100mg', 'tabletă', 'medium', 'normal', FALSE, 0.0900, 10, 35),
('MED-004', 'Diclofenac 75mg/3ml', 'Diclofenac', 'Analgezice', 'AINS', 'ampoule', '75mg/3ml', 'fiolă', 'medium', 'normal', FALSE, 0.0500, 7, 25),
('MED-005', 'Metamizol 1g/2ml', 'Metamizol sodic', 'Analgezice', 'Analgezic', 'ampoule', '1g/2ml', 'fiolă', 'medium', 'normal', FALSE, 0.0700, 7, 25),
('MED-006', 'Amoxicilină 500mg', 'Amoxicilină', 'Antibiotice', 'Peniciline', 'capsule', '500mg', 'capsulă', 'high', 'normal', FALSE, 0.0800, 10, 35),
('MED-007', 'Ceftriaxonă 1g', 'Ceftriaxonă', 'Antibiotice', 'Cefalosporine', 'vial', '1g', 'flacon', 'high', 'normal', FALSE, 0.0550, 10, 35),
('MED-008', 'Azitromicină 500mg', 'Azitromicină', 'Antibiotice', 'Macrolide', 'tablet', '500mg', 'tabletă', 'high', 'normal', FALSE, 0.0400, 10, 30),
('MED-009', 'Vancomicină 1g', 'Vancomicină', 'Antibiotice', 'Glicopeptide', 'vial', '1g', 'flacon', 'life_saving', 'normal', FALSE, 0.0200, 14, 45),
('MED-010', 'Meropenem 1g', 'Meropenem', 'Antibiotice', 'Carbapeneme', 'vial', '1g', 'flacon', 'life_saving', 'normal', FALSE, 0.0180, 14, 45),
('MED-011', 'Insulină rapidă', 'Insulină umană', 'Diabet', 'Insulină', 'vial', '100UI/ml', 'flacon', 'life_saving', 'cold', FALSE, 0.0350, 14, 40),
('MED-012', 'Insulină glargin', 'Insulină glargin', 'Diabet', 'Insulină bazală', 'vial', '100UI/ml', 'flacon', 'life_saving', 'cold', FALSE, 0.0300, 14, 40),
('MED-013', 'Metformin 1000mg', 'Metformin', 'Diabet', 'Antidiabetic oral', 'tablet', '1000mg', 'tabletă', 'medium', 'normal', FALSE, 0.1000, 10, 35),
('MED-014', 'Heparină 5000UI/ml', 'Heparină sodică', 'Anticoagulante', 'Anticoagulant', 'vial', '5000UI/ml', 'flacon', 'life_saving', 'cold', FALSE, 0.0300, 14, 45),
('MED-015', 'Enoxaparină 40mg', 'Enoxaparină', 'Anticoagulante', 'Heparină cu greutate moleculară mică', 'injection', '40mg', 'seringă', 'high', 'normal', FALSE, 0.0400, 10, 35),
('MED-016', 'Adrenalină 1mg/ml', 'Epinefrină', 'Urgență', 'Simpatomimetic', 'ampoule', '1mg/ml', 'fiolă', 'life_saving', 'normal', FALSE, 0.0100, 21, 60),
('MED-017', 'Noradrenalină 4mg/4ml', 'Norepinefrină', 'ATI', 'Vasopresor', 'ampoule', '4mg/4ml', 'fiolă', 'life_saving', 'cold', FALSE, 0.0120, 21, 60),
('MED-018', 'Dopamină 200mg/5ml', 'Dopamină', 'ATI', 'Vasopresor/Inotrop', 'ampoule', '200mg/5ml', 'fiolă', 'life_saving', 'normal', FALSE, 0.0080, 21, 60),
('MED-019', 'Furosemid 20mg/2ml', 'Furosemid', 'Cardiologie', 'Diuretic', 'ampoule', '20mg/2ml', 'fiolă', 'high', 'normal', FALSE, 0.0500, 10, 35),
('MED-020', 'Dexametazonă 8mg/2ml', 'Dexametazonă', 'Corticosteroizi', 'Glucocorticoid', 'ampoule', '8mg/2ml', 'fiolă', 'high', 'normal', FALSE, 0.0450, 10, 35),
('MED-021', 'Ondansetron 4mg/2ml', 'Ondansetron', 'Antiemetice', 'Antagonist 5-HT3', 'ampoule', '4mg/2ml', 'fiolă', 'medium', 'normal', FALSE, 0.0400, 7, 30),
('MED-022', 'Omeprazol 40mg', 'Omeprazol', 'Gastroenterologie', 'IPP', 'vial', '40mg', 'flacon', 'medium', 'normal', FALSE, 0.0550, 10, 35),
('MED-023', 'Salbutamol inhaler', 'Salbutamol', 'Respirator', 'Bronhodilatator', 'inhaler', '100mcg/doză', 'inhalator', 'high', 'normal', FALSE, 0.0300, 10, 35),
('MED-024', 'Lidocaină 1%', 'Lidocaină', 'Anestezice', 'Anestezic local', 'vial', '1%', 'flacon', 'high', 'normal', FALSE, 0.0250, 10, 35),
('MED-025', 'Morfina 10mg/ml', 'Morfina', 'Analgezice opioide', 'Opioid', 'ampoule', '10mg/ml', 'fiolă', 'high', 'controlled', TRUE, 0.0100, 14, 45),
('MED-026', 'Midazolam 5mg/ml', 'Midazolam', 'Sedative', 'Benzodiazepină', 'ampoule', '5mg/ml', 'fiolă', 'high', 'controlled', TRUE, 0.0120, 14, 45),
('MED-027', 'Propofol 10mg/ml', 'Propofol', 'Anestezice', 'Anestezic general', 'vial', '10mg/ml', 'flacon', 'life_saving', 'cold', FALSE, 0.0180, 14, 45),
('MED-028', 'Ketamină 50mg/ml', 'Ketamină', 'Anestezice', 'Anestezic disociativ', 'vial', '50mg/ml', 'flacon', 'high', 'controlled', TRUE, 0.0080, 14, 45),
('MED-029', 'Vaccin antigripal', 'Vaccin gripal inactivat', 'Vaccinuri', 'Vaccin', 'injection', '0.5ml', 'doză', 'medium', 'cold', FALSE, 0.0150, 10, 40),
('MED-030', 'Vaccin Hepatita B', 'Vaccin Hepatita B', 'Vaccinuri', 'Vaccin', 'injection', '1ml', 'doză', 'medium', 'cold', FALSE, 0.0080, 10, 40),
('MED-031', 'Albumină umană 20%', 'Albumină umană', 'Derivate sanguine', 'Proteină plasmatică', 'solution', '20%', 'flacon', 'life_saving', 'cold', FALSE, 0.0060, 14, 45),
('MED-032', 'Plasmă congelată', 'Plasmă proaspăt congelată', 'Derivate sanguine', 'Produs sanguin', 'bag', '200ml', 'unitate', 'life_saving', 'frozen', FALSE, 0.0040, 14, 45),
('MED-033', 'Soluție salină 0.9%', 'Clorură de sodiu', 'Fluide perfuzabile', 'Cristaloid', 'bag', '500ml', 'pungă', 'high', 'normal', FALSE, 0.2500, 7, 30),
('MED-034', 'Glucoză 5%', 'Glucoză', 'Fluide perfuzabile', 'Soluție perfuzabilă', 'bag', '500ml', 'pungă', 'medium', 'normal', FALSE, 0.1600, 7, 30),
('MED-035', 'Ringer lactat', 'Soluție Ringer lactat', 'Fluide perfuzabile', 'Cristaloid', 'bag', '500ml', 'pungă', 'high', 'normal', FALSE, 0.1800, 7, 30)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- 6. USERS DEMO
-- =========================

INSERT INTO app_users (hospital_id, full_name, username, email, role)
SELECT id, 'Manager ' || name, username, username || '@medistock.ro', 'MANAGER'
FROM hospitals
ON CONFLICT (email) DO NOTHING;

INSERT INTO app_users (hospital_id, full_name, username, email, role)
SELECT id, 'Farmacist ' || name, username, username || '.farmacist@medistock.ro', 'PHARMACIST'
FROM hospitals
ON CONFLICT (email) DO NOTHING;

INSERT INTO app_users (hospital_id, full_name, username, email, role)
VALUES
(NULL, 'Provider PharmaPlus', 'provider.pharmaplus', 'provider.pharmaplus@medistock.ro', 'PROVIDER'),
(NULL, 'Provider MediLogistic', 'provider.medilogistic', 'provider.medilogistic@medistock.ro', 'PROVIDER'),
(NULL, 'Provider ColdChain Pharma', 'provider.coldchain', 'provider.coldchain@medistock.ro', 'PROVIDER')
ON CONFLICT (email) DO NOTHING;

-- =========================
-- 7. ROLE PERMISSIONS
-- =========================

INSERT INTO roles_permissions (role, permission)
VALUES
('HOSPITAL_MANAGER', 'view_dashboard'),
('HOSPITAL_MANAGER', 'view_inventory'),
('HOSPITAL_MANAGER', 'view_ai_predictions'),
('HOSPITAL_MANAGER', 'view_recommendations'),
('HOSPITAL_MANAGER', 'approve_transfer'),
('HOSPITAL_MANAGER', 'reject_transfer'),
('HOSPITAL_MANAGER', 'view_restock_orders'),
('HOSPITAL_MANAGER', 'create_restock_order'),
('PHARMACIST', 'view_inventory'),
('PHARMACIST', 'create_batch'),
('PHARMACIST', 'update_batch'),
('PHARMACIST', 'record_usage'),
('PHARMACIST', 'view_ai_predictions'),
('PHARMACIST', 'view_restock_orders'),
('PROVIDER', 'view_supply_requests'),
('PROVIDER', 'update_delivery_status')
ON CONFLICT (role, permission) DO NOTHING;

-- =========================
-- 8. STOCK THRESHOLDS
-- Fiecare spital + medicament are praguri. Medicamentele life_saving au buffer mai mare.
-- =========================

INSERT INTO stock_thresholds (hospital_id, department_id, medication_id, min_buffer_days, target_buffer_days, max_buffer_days)
SELECT
    h.id,
    NULL,
    m.id,
    CASE
        WHEN m.criticality = 'life_saving' THEN 21
        WHEN m.criticality = 'high' THEN 14
        ELSE 7
    END AS min_buffer_days,
    CASE
        WHEN m.criticality = 'life_saving' THEN 60
        WHEN m.criticality = 'high' THEN 45
        ELSE 30
    END AS target_buffer_days,
    CASE
        WHEN m.criticality = 'life_saving' THEN 90
        WHEN m.criticality = 'high' THEN 70
        ELSE 50
    END AS max_buffer_days
FROM hospitals h
CROSS JOIN medications m
ON CONFLICT (hospital_id, department_id, medication_id) DO NOTHING;

COMMIT;

-- =========================
-- 9. VERIFICARI RAPIDE
-- =========================

SELECT 'hospitals' AS table_name, COUNT(*) AS rows_count FROM hospitals
UNION ALL
SELECT 'medications', COUNT(*) FROM medications
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'hospital_storage_capabilities', COUNT(*) FROM hospital_storage_capabilities
UNION ALL
SELECT 'stock_thresholds', COUNT(*) FROM stock_thresholds
UNION ALL
SELECT 'app_users', COUNT(*) FROM app_users
ORDER BY table_name;

SELECT
    h.code,
    h.name,
    STRING_AGG(hsc.storage_type::text, ', ' ORDER BY hsc.storage_type::text) AS available_storage
FROM hospitals h
JOIN hospital_storage_capabilities hsc ON hsc.hospital_id = h.id
GROUP BY h.code, h.name
ORDER BY h.code;

SELECT
    required_storage_type,
    COUNT(*) AS medications_count
FROM medications
GROUP BY required_storage_type
ORDER BY required_storage_type;
