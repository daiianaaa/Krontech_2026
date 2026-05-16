package com.example.backend_medstock.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class TransferRequestCreateDTO {
    private UUID senderHospitalId;
    private UUID receiverHospitalId;
    private UUID sourceHospitalId;
    private UUID destinationHospitalId;
    private String transactionType;
    private UUID medicationId;
    private UUID batchId;
    private Integer quantity;
    private String reason;
    private String requiredStorageType;
    private String batchNumber;
    private UUID createdBy; // ID-ul utilizatorului care face cererea
}