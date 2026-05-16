package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.MedicationCreateDTO;
import com.example.backend_medstock.dto.MedicationResponseDTO;
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

    @PostMapping
    public ResponseEntity<MedicationResponseDTO> createMedication(@RequestBody MedicationCreateDTO medicationDto) {
        MedicationResponseDTO savedMedication = medicationService.createMedication(medicationDto);
        return new ResponseEntity<>(savedMedication, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponseDTO>> getAllMedications(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive) {

        List<MedicationResponseDTO> medications = medicationService.getMedications(name, category, isActive);
        return ResponseEntity.ok(medications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponseDTO> getMedicationById(@PathVariable UUID id) {
        return medicationService.getMedicationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicationResponseDTO> updateMedication(@PathVariable UUID id, @RequestBody MedicationCreateDTO newData) {
        return medicationService.updateMedication(id, newData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable UUID id) {
        if (medicationService.deleteMedication(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}