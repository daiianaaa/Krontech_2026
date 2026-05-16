package com.example.backend_medstock.mapper;

import com.example.backend_medstock.dto.TransferRequestCreateDTO;
import com.example.backend_medstock.dto.TransferRequestResponseDTO;
import com.example.backend_medstock.model.TransferRequest;
import org.springframework.stereotype.Component;

@Component
public class TransferRequestMapper {

    // Entitate -> DTO (spre frontend)
    public TransferRequestResponseDTO toResponseDTO(TransferRequest request) {
        if (request == null) {
            return null;
        }

        return TransferRequestResponseDTO.builder()
                .transactionId(request.getTransactionId())
                .senderHospitalId(request.getSenderHospitalId())
                .receiverHospitalId(request.getReceiverHospitalId())
                .sourceHospitalId(request.getSourceHospitalId())
                .destinationHospitalId(request.getDestinationHospitalId())
                .transactionType(request.getTransactionType())
                .medicationId(request.getMedicationId())
                .batchId(request.getBatchId())
                .quantity(request.getQuantity())
                .reason(request.getReason())
                .status(request.getStatus())
                .requiredStorageType(request.getRequiredStorageType())
                .batchNumber(request.getBatchNumber())
                .expiryDate(request.getExpiryDate())
                .daysToExpiry(request.getDaysToExpiry())
                .expectedSavings(request.getExpectedSavings())
                .avoidedDisposalCost(request.getAvoidedDisposalCost())
                .transportCost(request.getTransportCost())
                .netSavings(request.getNetSavings())
                .recommendedTransferDate(request.getRecommendedTransferDate())
                .sourceRecommendationId(request.getSourceRecommendationId())
                .medicationCodeSnapshot(request.getMedicationCodeSnapshot())
                .medicationNameSnapshot(request.getMedicationNameSnapshot())
                .medicationCategorySnapshot(request.getMedicationCategorySnapshot())
                .medicationCriticalitySnapshot(request.getMedicationCriticalitySnapshot())
                .acceptedBy(request.getAcceptedBy())
                .acceptedAt(request.getAcceptedAt())
                .rejectedBy(request.getRejectedBy())
                .rejectedAt(request.getRejectedAt())
                .rejectionReason(request.getRejectionReason())
                .distanceKm(request.getDistanceKm())
                .confidenceScore(request.getConfidenceScore())
                .build();
    }

    // DTO -> Entitate (de la frontend)
    public TransferRequest toEntity(TransferRequestCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        TransferRequest request = new TransferRequest();
        request.setSenderHospitalId(dto.getSenderHospitalId());
        request.setReceiverHospitalId(dto.getReceiverHospitalId());
        request.setSourceHospitalId(dto.getSourceHospitalId());
        request.setDestinationHospitalId(dto.getDestinationHospitalId());
        request.setTransactionType(dto.getTransactionType());
        request.setMedicationId(dto.getMedicationId());
        request.setBatchId(dto.getBatchId());
        request.setQuantity(dto.getQuantity());
        request.setReason(dto.getReason());
        request.setRequiredStorageType(dto.getRequiredStorageType());
        request.setBatchNumber(dto.getBatchNumber());
        request.setCreatedBy(dto.getCreatedBy());

        return request;
    }
}