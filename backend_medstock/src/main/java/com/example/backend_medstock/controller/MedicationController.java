package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.MedicationCreateDTO;
import com.example.backend_medstock.dto.MedicationResponseDTO;
import com.example.backend_medstock.model.MedicationBatch;
import com.example.backend_medstock.service.MedicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medication")
@CrossOrigin
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }


    @GetMapping
    public ResponseEntity<List<MedicationResponseDTO>> getAllMedications(
            @RequestParam(required = false) UUID hospitalId,
            @RequestParam(required = false) String hospitalName,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive) {

        List<MedicationResponseDTO> medications = medicationService.getMedications(hospitalId, hospitalName, name, category, isActive);
        return ResponseEntity.ok(medications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponseDTO> getMedicationById(@PathVariable UUID id) {
        return medicationService.getMedicationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/batches")
    public ResponseEntity<List<MedicationBatch>> getBatchesByMedicationId(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID hospitalId) {
        return ResponseEntity.ok(medicationService.getBatchesByMedicationId(id, hospitalId));
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable UUID id) {
        if (medicationService.deleteMedication(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}