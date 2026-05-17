package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.MedicationCreateDTO;
import com.example.backend_medstock.dto.MedicationResponseDTO;
import com.example.backend_medstock.mapper.MedicationMapper;
import com.example.backend_medstock.model.Medication;
import com.example.backend_medstock.model.MedicationAvailabilityView;
import com.example.backend_medstock.model.MedicationBatch;
import com.example.backend_medstock.repository.MedicationAvailabilityRepository;
import com.example.backend_medstock.repository.MedicationBatchRepository;
import com.example.backend_medstock.repository.MedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final MedicationBatchRepository medicationBatchRepository;
    private final MedicationAvailabilityRepository availabilityRepository;
    private final MedicationMapper medicationMapper;

    public MedicationService(MedicationRepository medicationRepository, 
                             MedicationBatchRepository medicationBatchRepository,
                             MedicationAvailabilityRepository availabilityRepository,
                             MedicationMapper medicationMapper) {
        this.medicationRepository = medicationRepository;
        this.medicationBatchRepository = medicationBatchRepository;
        this.availabilityRepository = availabilityRepository;
        this.medicationMapper = medicationMapper;
    }



    // READ ALL + FILTRĂRI
    public List<MedicationResponseDTO> getMedications(UUID hospitalId, String hospitalName, String name, String category, Boolean isActive) {
        List<Medication> medications;

        if (hospitalId != null) {
            // Prioritate: filtru după hospitalId (UUID) — cel mai fiabil
            medications = medicationRepository.filterByHospital(hospitalId, name, category, isActive);
        } else if (hospitalName != null && !hospitalName.isEmpty()) {
            // Fallback: filtru după numele spitalului din view-ul de disponibilitate
            List<MedicationAvailabilityView> availability = availabilityRepository.findByHospitalNameContainingIgnoreCase(hospitalName);
            List<UUID> medIds = availability.stream().map(MedicationAvailabilityView::getMedicationId).distinct().collect(Collectors.toList());
            if (medIds.isEmpty()) {
                medications = java.util.Collections.emptyList();
            } else {
                medications = medicationRepository.findAllById(medIds);
            }
        } else if (name == null && category == null && isActive == null) {
            // Niciun filtru specificat → toate medicamentele (ADMIN fără instituție)
            medications = medicationRepository.findAll();
        } else {
            medications = medicationRepository.filterMedications(name, category, isActive);
        }

        List<Object[]> stockData;
        if (hospitalId != null) {
            stockData = availabilityRepository.sumQuantityByHospitalGroupedByMedication(hospitalId);
        } else {
            stockData = availabilityRepository.sumQuantityGroupedByMedication();
        }

        Map<UUID, Integer> stockMap = new java.util.HashMap<>();
        if (stockData != null) {
            for (Object[] row : stockData) {
                UUID medId = null;
                if (row[0] instanceof UUID) {
                    medId = (UUID) row[0];
                } else if (row[0] != null) {
                    try {
                        medId = UUID.fromString(row[0].toString());
                    } catch (IllegalArgumentException e) {
                        // ignore invalid UUIDs
                    }
                }
                
                if (medId != null) {
                    int stock = row[1] != null ? ((Number) row[1]).intValue() : 0;
                    stockMap.put(medId, stockMap.getOrDefault(medId, 0) + stock);
                }
            }
        }

        return medications.stream()
                .map(med -> {
                    MedicationResponseDTO dto = medicationMapper.toResponseDTO(med);
                    dto.setTotalStock(stockMap.getOrDefault(med.getId(), 0));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // READ BY ID
    public Optional<MedicationResponseDTO> getMedicationById(UUID id) {
        return medicationRepository.findById(id)
                .map(medicationMapper::toResponseDTO);
    }

    // GET BATCHES
    public List<MedicationBatch> getBatchesByMedicationId(UUID id, UUID hospitalId) {
        if (hospitalId != null) {
            return medicationBatchRepository.findByMedicationIdAndHospitalIdAndQuantityCurrentGreaterThanOrderByExpiryDateAsc(id, hospitalId, 0);
        }
        return medicationBatchRepository.findByMedicationIdAndQuantityCurrentGreaterThanOrderByExpiryDateAsc(id, 0);
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