package com.example.backend_medstock.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TransferRequestResponseDTO {
    private UUID transactionId;
    private UUID senderHospitalId;
    private UUID receiverHospitalId;
    private UUID sourceHospitalId;
    private UUID destinationHospitalId;
    private String transactionType;
    private UUID medicationId;
    private UUID batchId;
    private Integer quantity;
    private String reason;
    private String status;
    private String requiredStorageType;
    private String batchNumber;
    private LocalDate expiryDate;
    private Integer daysToExpiry;
    private Double expectedSavings;
    private Double avoidedDisposalCost;
    private Double transportCost;
    private Double netSavings;
    private LocalDate recommendedTransferDate;
    private UUID sourceRecommendationId;
    private String medicationCodeSnapshot;
    private String medicationNameSnapshot;
    private String medicationCategorySnapshot;
    private String medicationCriticalitySnapshot;

    // Păstrăm datele de acțiune pentru afișare (ex: "Acceptat la data de...")
    private UUID acceptedBy;
    private LocalDateTime acceptedAt;
    private UUID rejectedBy;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    private Double distanceKm;
    private Double confidenceScore;
}