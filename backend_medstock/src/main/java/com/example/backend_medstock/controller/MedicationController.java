package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/medication")
@CrossOrigin
public class MedicationController {

    private final MedicationRepository medicationRepository;
    private final JdbcTemplate jdbcTemplate;

    public MedicationController(MedicationRepository medicationRepository, JdbcTemplate jdbcTemplate) {
        this.medicationRepository = medicationRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    // CREATE
    @PostMapping
    public ResponseEntity<Medication> createMedication(@RequestBody Medication medication) {
        Medication savedMedication = medicationRepository.save(medication);
        return new ResponseEntity<>(savedMedication, HttpStatus.CREATED);
    }

    // READ ALL & FILTER
    @GetMapping
    public List<Medication> getAllMedications(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive) {

        // 1. Curățăm parametrii. Dacă primim un string gol (""), îl transformăm forțat în null.
        String filterName = (name != null && !name.trim().isEmpty()) ? name.trim() : null;
        String filterCategory = (category != null && !category.trim().isEmpty()) ? category.trim() : null;

        // 2. Verificăm dacă TOATE filtrele sunt efectiv nule
        if (filterName == null && filterCategory == null && isActive == null) {
            return medicationRepository.findAll(); // Returnează tot dacă nu e niciun filtru
        }

        // 3. Apelăm repository-ul cu filtrele curățate
        return medicationRepository.filterMedications(filterName, filterCategory, isActive);
    }

    // READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<Medication> getMedicationById(@PathVariable UUID id) {
        return medicationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // READ BATCHES
    @GetMapping("/{id}/batches")
    public ResponseEntity<List<Map<String, Object>>> getBatchesByMedication(@PathVariable UUID id) {
        String sql = "SELECT id, batch_number, quantity_current, expiry_date " +
                "FROM medication_batches " +
                "WHERE medication_id = ? AND quantity_current > 0 " +
                "ORDER BY expiry_date ASC";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, id);
        List<Map<String, Object>> result = rows.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.get("id"));
            map.put("batchNumber", r.get("batch_number"));
            map.put("quantityCurrent", r.get("quantity_current"));
            map.put("expiryDate", r.get("expiry_date"));
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Medication> updateMedication(@PathVariable UUID id, @RequestBody Medication newData) {
        return medicationRepository.findById(id)
                .map(existing -> {
                    existing.setCode(newData.getCode());
                    existing.setName(newData.getName());
                    existing.setGenericName(newData.getGenericName());
                    existing.setCategory(newData.getCategory());
                    existing.setTherapeuticClass(newData.getTherapeuticClass());
                    existing.setForm(newData.getForm());
                    existing.setConcentration(newData.getConcentration());
                    existing.setUnit(newData.getUnit());
                    existing.setCriticality(newData.getCriticality());
                    existing.setRequiredStorageType(newData.getRequiredStorageType());
                    existing.setControlledSubstance(newData.getControlledSubstance());
                    existing.setStandardDailyUsagePerPatient(newData.getStandardDailyUsagePerPatient());
                    existing.setDefaultMinBufferDays(newData.getDefaultMinBufferDays());
                    existing.setDefaultTargetBufferDays(newData.getDefaultTargetBufferDays());
                    existing.setIsActive(newData.getIsActive());

                    // createdAt si updatedAt sunt gestionate automat de @PrePersist / @PreUpdate

                    Medication updated = medicationRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable UUID id) {
        if (medicationRepository.existsById(id)) {
            medicationRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}