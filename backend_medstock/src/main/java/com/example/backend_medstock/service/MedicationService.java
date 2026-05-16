package com.example.backend_medstock.service;

import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;

    public MedicationService(MedicationRepository medicationRepository) {
        this.medicationRepository = medicationRepository;
    }

    // CREATE
    public Medication createMedication(Medication medication) {
        return medicationRepository.save(medication);
    }

    // READ ALL + FILTRĂRI
    public List<Medication> getMedications(String name, String category, Boolean isActive) {
        // Dacă utilizatorul nu a aplicat absolut niciun filtru, aducem tot tabelul direct pentru performanță
        if (name == null && category == null && isActive == null) {
            return medicationRepository.findAll();
        }

        // Dacă avem cel puțin un filtru, apelăm query-ul cu CAST din repository
        return medicationRepository.filterMedications(name, category, isActive);
    }

    // READ BY ID
    public Optional<Medication> getMedicationById(UUID id) {
        return medicationRepository.findById(id);
    }

    // UPDATE
    public Optional<Medication> updateMedication(UUID id, Medication newData) {
        if (!medicationRepository.existsById(id)) {
            return Optional.empty();
        }
        newData.setId(id);
        return Optional.of(medicationRepository.save(newData));
    }

    // DELETE
    public boolean deleteMedication(UUID id) {
        if (medicationRepository.existsById(id)) {
            medicationRepository.deleteById(id);
            return true;
        }
        return false;
    }
}