package com.example.backend_medstock.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class InboxMessageResponseDTO {
    private UUID inboxId;
    private UUID transferRequestId;
    private UUID senderHospitalId;
    private UUID receiverHospitalId;
    private UUID sourceHospitalId;
    private UUID destinationHospitalId;
    private String transactionType;
    private UUID medicationId;
    private UUID batchId;
    private Integer quantity;
    private String reason;
    private String subject;
    private String message;
    private String transferStatus;
    private String inboxStatus;
    private LocalDateTime createdAt; // Păstrăm pentru UI
    private LocalDateTime readAt;    // Păstrăm pentru UI
}