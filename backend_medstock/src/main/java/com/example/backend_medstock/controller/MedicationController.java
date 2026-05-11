package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medication")
@CrossOrigin
public class MedicationController {

    private final MedicationRepository medicationRepository;

    public MedicationController(MedicationRepository medicationRepository) {
        this.medicationRepository = medicationRepository;
    }

    // CREATE
    @PostMapping
    public ResponseEntity<Medication> createMedication(@RequestBody Medication medication) {
        Medication savedMedication = medicationRepository.save(medication);
        return new ResponseEntity<>(savedMedication, HttpStatus.CREATED);
    }

    // READ ALL
    @GetMapping
    public List<Medication> getAllMedications() {
        return medicationRepository.findAll();
    }

    // READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<Medication> getMedicationById(@PathVariable UUID id) {
        return medicationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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