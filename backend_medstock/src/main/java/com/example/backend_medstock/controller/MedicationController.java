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

    // CREATE: Adaugă un medicament nou în baza de date
    @PostMapping
    public ResponseEntity<Medication> createMedication(@RequestBody Medication medication) {
        Medication savedMedication = medicationRepository.save(medication);
        return new ResponseEntity<>(savedMedication, HttpStatus.CREATED);
    }

    // READ: Returnează lista cu toate medicamentele
    @GetMapping
    public List<Medication> getAllMedications() {
        return medicationRepository.findAll();
    }

    // READ: Returnează un singur medicament pe baza ID-ului
    @GetMapping("/{id}")
    public ResponseEntity<Medication> getMedicationById(@PathVariable Long id) {
        return medicationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE: Actualizează detaliile unui medicament existent
    @PutMapping("/{id}")
    public ResponseEntity<Medication> updateMedication(@PathVariable Long id, @RequestBody Medication newData) {
        return medicationRepository.findById(id)
                .map(existing -> {
                    existing.setName(newData.getName());
                    existing.setCategory(newData.getCategory());
                    existing.setStock(newData.getStock());
                    existing.setExpiryDate(newData.getExpiryDate());
                    existing.setBatchNumber(newData.getBatchNumber());
                    existing.setPrice(newData.getPrice());
                    existing.setSupplier(newData.getSupplier());
                    existing.setStatus(newData.getStatus());

                    Medication updated = medicationRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE: Șterge un medicament din stoc
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable Long id) {
        if (medicationRepository.existsById(id)) {
            medicationRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}