package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String code;

    private String name;

    @Column(name = "generic_name")
    private String genericName;

    private String category;

    @Column(name = "therapeutic_class")
    private String therapeuticClass;

    @Column(name = "form", columnDefinition = "medication_form")
    @ColumnTransformer(write = "?::medication_form")
    private String form;

    private String concentration;

    private String unit;

    @Column(name = "criticality", columnDefinition = "criticality_level")
    @ColumnTransformer(write = "?::criticality_level")
    private String criticality;

    @Column(name = "required_storage_type", columnDefinition = "storage_type")
    @ColumnTransformer(write = "?::storage_type")
    private String requiredStorageType;

    @Column(name = "controlled_substance")
    private Boolean controlledSubstance;

    @Column(name = "standard_daily_usage_per_patient")
    private Double standardDailyUsagePerPatient;

    @Column(name = "default_min_buffer_days")
    private Integer defaultMinBufferDays;

    @Column(name = "default_target_buffer_days")
    private Integer defaultTargetBufferDays;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}