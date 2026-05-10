package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.MedicationRepository;
import com.example.backend_medstock.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/medication")
@CrossOrigin
public class MedicationController {

    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    public MedicationController(MedicationRepository medicationRepository, UserRepository userRepository) {
        this.medicationRepository = medicationRepository;
        this.userRepository = userRepository;
    }

    // CREATE
    @PostMapping
    public ResponseEntity<?> createMedication(@RequestBody Medication medication, Authentication authentication) {
        // 1. Luam username-ul din token-ul JWT care a fost validat deja
        String currentUsername = authentication.getName();

        // 2. Cautam utilizatorul in baza de date
        Optional<User> currentUserOpt = userRepository.findByUsername(currentUsername);

        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilizatorul nu a fost găsit!");
        }

        // 3. Setam owner-ul si salvam medicamentul
        medication.setOwner(currentUserOpt.get());
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

                    // Nu facem update la 'owner', un medicament ramane la cine l-a creat
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