package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<Medication> getMedicationById(@PathVariable Long id) {
        return medicationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Medication> updateMedication(@PathVariable Long id, @RequestBody Medication newData) {
        return medicationRepository.findById(id)
                .map(existing -> {
                    existing.setName(newData.getName());
                    existing.setCategory(newData.getCategory());
                    existing.setStock(newData.getStock());
                    existing.setExpiryDate(newData.getExpiryDate());
                    existing.setReceivedDate(newData.getReceivedDate());
                    existing.setBatchNumber(newData.getBatchNumber());
                    existing.setPrice(newData.getPrice());
                    existing.setSupplier(newData.getSupplier());

                    Medication updated = medicationRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable Long id) {
        if (medicationRepository.existsById(id)) {
            medicationRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}