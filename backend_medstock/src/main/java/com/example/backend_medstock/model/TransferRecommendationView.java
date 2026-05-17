package com.example.backend_medstock.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Immutable
@Table(name = "v_transfer_recommendations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferRecommendationView {

    @Id
    @Column(name = "recommendation_id")
    private UUID recommendationId;

    // --- Date Spital Sursa ---
    @Column(name = "source_hospital_name")
    private String sourceHospitalName;

    @Column(name = "source_city")
    private String sourceCity;

    @Column(name = "source_county")
    private String sourceCounty;

    // --- Date Spital Destinatie ---
    @Column(name = "destination_hospital_name")
    private String destinationHospitalName;

    @Column(name = "destination_city")
    private String destinationCity;

    @Column(name = "destination_county")
    private String destinationCounty;

    // --- Date Medicament ---
    @Column(name = "medication_name")
    private String medicationName;

    @Column(name = "medication_category")
    private String medicationCategory;

    @Column(name = "medication_code")
    private String medicationCode;

    // --- Date Lot (Batch) ---
    @Column(name = "batch_number")
    private String batchNumber;

    // --- Cantitati ---
    @Column(name = "source_batch_current_quantity")
    private Integer sourceBatchCurrentQuantity;

    @Column(name = "recommended_quantity")
    private Integer recommendedQuantity;

    // --- Date Calendaristice ---
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "recommended_transfer_date")
    private LocalDate recommendedTransferDate;

    // --- Predicții AI ---
    @Column(name = "reason")
    private String reason;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "status")
    private String status;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "source_hospital_id")
    private UUID sourceHospitalId;

    @Column(name = "destination_hospital_id")
    private UUID destinationHospitalId;

    @Column(name = "medication_id")
    private UUID medicationId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "expected_savings")
    private Double expectedSavings;

    @Column(name = "avoided_disposal_cost")
    private Double avoidedDisposalCost;

    @Column(name = "transport_cost")
    private Double transportCost;

    @Column(name = "net_savings")
    private Double netSavings;

    @Column(name = "distance_km")
    private Double distanceKm;

    // --- Audit ---
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}