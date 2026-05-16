package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.MedicationCreateDTO;
import com.example.backend_medstock.dto.MedicationResponseDTO;
import com.example.backend_medstock.mapper.MedicationMapper;
import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final MedicationMapper medicationMapper;

    // Injectăm și Mapper-ul
    public MedicationService(MedicationRepository medicationRepository, MedicationMapper medicationMapper) {
        this.medicationRepository = medicationRepository;
        this.medicationMapper = medicationMapper;
    }

    // CREATE
    public MedicationResponseDTO createMedication(MedicationCreateDTO dto) {
        Medication medication = medicationMapper.toEntity(dto);
        Medication savedMedication = medicationRepository.save(medication);
        return medicationMapper.toResponseDTO(savedMedication);
    }

    // READ ALL + FILTRĂRI
    public List<MedicationResponseDTO> getMedications(String name, String category, Boolean isActive) {
        List<Medication> medications;

        // Optimizarea de performanță
        if (name == null && category == null && isActive == null) {
            medications = medicationRepository.findAll();
        } else {
            medications = medicationRepository.filterMedications(name, category, isActive);
        }

        // Transformăm lista de entități în listă de DTO-uri
        return medications.stream()
                .map(medicationMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    // READ BY ID
    public Optional<MedicationResponseDTO> getMedicationById(UUID id) {
        return medicationRepository.findById(id)
                .map(medicationMapper::toResponseDTO);
    }

    // UPDATE
    public Optional<MedicationResponseDTO> updateMedication(UUID id, MedicationCreateDTO newData) {
        if (!medicationRepository.existsById(id)) {
            return Optional.empty();
        }
        Medication medicationToUpdate = medicationMapper.toEntity(newData);
        medicationToUpdate.setId(id);
        Medication updatedMedication = medicationRepository.save(medicationToUpdate);
        return Optional.of(medicationMapper.toResponseDTO(updatedMedication));
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