package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transfer_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "sender_hospital_id")
    private UUID senderHospitalId;

    @Column(name = "receiver_hospital_id")
    private UUID receiverHospitalId;

    @Column(name = "source_hospital_id")
    private UUID sourceHospitalId;

    @Column(name = "destination_hospital_id")
    private UUID destinationHospitalId;

    // Tip custom Postgres
    @Column(name = "transaction_type", columnDefinition = "manual_transfer_type")
    @ColumnTransformer(write = "?::manual_transfer_type")
    private String transactionType;

    @Column(name = "medication_id")
    private UUID medicationId;

    @Column(name = "batch_id")
    private UUID batchId;

    private Integer quantity;

    private String reason;

    // Tip custom Postgres
    @Column(name = "status", columnDefinition = "recommendation_status")
    @ColumnTransformer(write = "?::recommendation_status")
    private String status;

    // Tip custom Postgres
    @Column(name = "required_storage_type", columnDefinition = "storage_type")
    @ColumnTransformer(write = "?::storage_type")
    private String requiredStorageType;

    @Column(name = "batch_number")
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "days_to_expiry")
    private Integer daysToExpiry;

    @Column(name = "expected_savings")
    private Double expectedSavings;

    @Column(name = "avoided_disposal_cost")
    private Double avoidedDisposalCost;

    @Column(name = "transport_cost")
    private Double transportCost;

    @Column(name = "net_savings")
    private Double netSavings;

    @Column(name = "recommended_transfer_date")
    private LocalDate recommendedTransferDate;

    @Column(name = "source_recommendation_id")
    private UUID sourceRecommendationId;

    @Column(name = "medication_code_snapshot")
    private String medicationCodeSnapshot;

    @Column(name = "medication_name_snapshot")
    private String medicationNameSnapshot;

    @Column(name = "medication_category_snapshot")
    private String medicationCategorySnapshot;

    // Tip custom Postgres
    @Column(name = "medication_criticality_snapshot", columnDefinition = "criticality_level")
    @ColumnTransformer(write = "?::criticality_level")
    private String medicationCriticalitySnapshot;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "accepted_by")
    private UUID acceptedBy;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "destination_batch_id")
    private UUID destinationBatchId;

    @Column(name = "transfer_out_transaction_id")
    private UUID transferOutTransactionId;

    @Column(name = "transfer_in_transaction_id")
    private UUID transferInTransactionId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "pending";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}