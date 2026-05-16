package com.example.backend_medstock.mapper;

import com.example.backend_medstock.dto.InboxMessageCreateDTO;
import com.example.backend_medstock.dto.InboxMessageResponseDTO;
import com.example.backend_medstock.model.InboxMessage;
import org.springframework.stereotype.Component;

@Component
public class InboxMessageMapper {

    // Entitate -> DTO
    public InboxMessageResponseDTO toResponseDTO(InboxMessage msg) {
        if (msg == null) {
            return null;
        }

        return InboxMessageResponseDTO.builder()
                .inboxId(msg.getInboxId())
                .transferRequestId(msg.getTransferRequestId())
                .senderHospitalId(msg.getSenderHospitalId())
                .receiverHospitalId(msg.getReceiverHospitalId())
                .sourceHospitalId(msg.getSourceHospitalId())
                .destinationHospitalId(msg.getDestinationHospitalId())
                .transactionType(msg.getTransactionType())
                .medicationId(msg.getMedicationId())
                .batchId(msg.getBatchId())
                .quantity(msg.getQuantity())
                .reason(msg.getReason())
                .subject(msg.getSubject())
                .message(msg.getMessage())
                .transferStatus(msg.getTransferStatus())
                .inboxStatus(msg.getInboxStatus())
                .createdAt(msg.getCreatedAt())
                .readAt(msg.getReadAt())
                .build();
    }

    // DTO -> Entitate
    public InboxMessage toEntity(InboxMessageCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        InboxMessage msg = new InboxMessage();
        msg.setTransferRequestId(dto.getTransferRequestId());
        msg.setSenderHospitalId(dto.getSenderHospitalId());
        msg.setReceiverHospitalId(dto.getReceiverHospitalId());
        msg.setSourceHospitalId(dto.getSourceHospitalId());
        msg.setDestinationHospitalId(dto.getDestinationHospitalId());
        msg.setTransactionType(dto.getTransactionType());
        msg.setMedicationId(dto.getMedicationId());
        msg.setBatchId(dto.getBatchId());
        msg.setQuantity(dto.getQuantity());
        msg.setReason(dto.getReason());
        msg.setSubject(dto.getSubject());
        msg.setMessage(dto.getMessage());
        msg.setTransferStatus(dto.getTransferStatus());

        return msg;
    }
}