package com.example.backend_medstock.mapper;

import com.example.backend_medstock.dto.MedicationCreateDTO;
import com.example.backend_medstock.dto.MedicationResponseDTO;
import com.example.backend_medstock.model.Medication;
import org.springframework.stereotype.Component;

@Component
public class MedicationMapper {

    // Din Entitate în DTO (spre frontend)
    public MedicationResponseDTO toResponseDTO(Medication medication) {
        if (medication == null) {
            return null;
        }

        return MedicationResponseDTO.builder()
                .id(medication.getId())
                .code(medication.getCode())
                .name(medication.getName())
                .genericName(medication.getGenericName())
                .category(medication.getCategory())
                .therapeuticClass(medication.getTherapeuticClass())
                .form(medication.getForm())
                .concentration(medication.getConcentration())
                .unit(medication.getUnit())
                .criticality(medication.getCriticality())
                .requiredStorageType(medication.getRequiredStorageType())
                .controlledSubstance(medication.getControlledSubstance())
                .standardDailyUsagePerPatient(medication.getStandardDailyUsagePerPatient())
                .defaultMinBufferDays(medication.getDefaultMinBufferDays())
                .defaultTargetBufferDays(medication.getDefaultTargetBufferDays())
                .isActive(medication.getIsActive())
                .build();
    }

    // Din DTO în Entitate (de la frontend)
    public Medication toEntity(MedicationCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        Medication medication = new Medication();
        medication.setCode(dto.getCode());
        medication.setName(dto.getName());
        medication.setGenericName(dto.getGenericName());
        medication.setCategory(dto.getCategory());
        medication.setTherapeuticClass(dto.getTherapeuticClass());
        medication.setForm(dto.getForm());
        medication.setConcentration(dto.getConcentration());
        medication.setUnit(dto.getUnit());
        medication.setCriticality(dto.getCriticality());
        medication.setRequiredStorageType(dto.getRequiredStorageType());
        medication.setControlledSubstance(dto.getControlledSubstance());
        medication.setStandardDailyUsagePerPatient(dto.getStandardDailyUsagePerPatient());
        medication.setDefaultMinBufferDays(dto.getDefaultMinBufferDays());
        medication.setDefaultTargetBufferDays(dto.getDefaultTargetBufferDays());
        medication.setIsActive(dto.getIsActive());

        return medication;
    }
}