package com.example.backend_medstock.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class MedicationResponseDTO {
    private UUID id;
    private String code;
    private String name;
    private String genericName;
    private String category;
    private String therapeuticClass;
    private String form;
    private String concentration;
    private String unit;
    private String criticality;
    private String requiredStorageType;
    private Boolean controlledSubstance;
    private Double standardDailyUsagePerPatient;
    private Integer defaultMinBufferDays;
    private Integer defaultTargetBufferDays;
    private Boolean isActive;
    private Integer totalStock;
}