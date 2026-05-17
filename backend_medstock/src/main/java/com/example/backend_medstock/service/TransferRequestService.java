package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.TransferRequestCreateDTO;
import com.example.backend_medstock.dto.TransferRequestResponseDTO;
import com.example.backend_medstock.mapper.TransferRequestMapper;
import com.example.backend_medstock.model.TransferRequest;
import com.example.backend_medstock.repository.MedicationBatchRepository;
import com.example.backend_medstock.repository.TransferRequestRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TransferRequestService {

    private final TransferRequestRepository transferRequestRepository;
    private final MedicationBatchRepository medicationBatchRepository;
    private final TransferRequestMapper transferRequestMapper;
    private final JdbcTemplate jdbcTemplate;

    public TransferRequestService(TransferRequestRepository transferRequestRepository, 
                                  MedicationBatchRepository medicationBatchRepository,
                                  TransferRequestMapper transferRequestMapper,
                                  JdbcTemplate jdbcTemplate) {
        this.transferRequestRepository = transferRequestRepository;
        this.medicationBatchRepository = medicationBatchRepository;
        this.transferRequestMapper = transferRequestMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    public TransferRequestResponseDTO createTransferRequest(TransferRequestCreateDTO dto) {
        TransferRequest request = transferRequestMapper.toEntity(dto);
        TransferRequest savedRequest = transferRequestRepository.save(request);
        return transferRequestMapper.toResponseDTO(savedRequest);
    }

    public List<TransferRequestResponseDTO> getAllTransferRequests() {
        return transferRequestRepository.findAll()
                .stream()
                .map(transferRequestMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    public Optional<TransferRequestResponseDTO> getTransferRequestById(UUID id) {
        return transferRequestRepository.findById(id)
                .map(transferRequestMapper::toResponseDTO);
    }

    public List<TransferRequestResponseDTO> getSentRequests(UUID senderId) {
        return transferRequestRepository.findBySenderHospitalId(senderId)
                .stream()
                .map(transferRequestMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    public List<TransferRequestResponseDTO> getReceivedRequests(UUID receiverId) {
        return transferRequestRepository.findByReceiverHospitalId(receiverId)
                .stream()
                .map(transferRequestMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    public Optional<TransferRequestResponseDTO> updateTransferRequest(UUID id, TransferRequestCreateDTO newData) {
        if (!transferRequestRepository.existsById(id)) {
            return Optional.empty();
        }
        TransferRequest requestToUpdate = transferRequestMapper.toEntity(newData);
        requestToUpdate.setTransactionId(id);
        TransferRequest updatedRequest = transferRequestRepository.save(requestToUpdate);
        return Optional.of(transferRequestMapper.toResponseDTO(updatedRequest));
    }

    public Optional<TransferRequestResponseDTO> acceptTransferRequest(UUID id, UUID acceptedByUserId) {
        try {
            String sql = "SELECT * FROM accept_transfer_request(?, ?)";
            jdbcTemplate.queryForList(sql, id, acceptedByUserId);
            return transferRequestRepository.findById(id).map(transferRequestMapper::toResponseDTO);
        } catch (Exception e) {
            String message = e.getMessage();
            if (message != null && message.contains("EXCEPTION:")) {
                message = message.substring(message.indexOf("EXCEPTION:") + 10).split("\n")[0].trim();
            }
            throw new RuntimeException("Accept failed: " + message);
        }
    }

    public Optional<TransferRequestResponseDTO> rejectTransferRequest(UUID id, UUID rejectedByUserId, Map<String, String> payload) {
        try {
            String reason = payload != null ? payload.getOrDefault("rejectionReason", "Rejected by user") : "Rejected by user";
            String sql = "SELECT * FROM reject_transfer_request(?, ?, ?)";
            jdbcTemplate.queryForList(sql, id, rejectedByUserId, reason);
            return transferRequestRepository.findById(id).map(transferRequestMapper::toResponseDTO);
        } catch (Exception e) {
            String message = e.getMessage();
            if (message != null && message.contains("EXCEPTION:")) {
                message = message.substring(message.indexOf("EXCEPTION:") + 10).split("\n")[0].trim();
            }
            throw new RuntimeException("Reject failed: " + message);
        }
    }

    public boolean deleteTransferRequest(UUID id) {
        if (transferRequestRepository.existsById(id)) {
            transferRequestRepository.deleteById(id);
            return true;
        }
        return false;
    }
}