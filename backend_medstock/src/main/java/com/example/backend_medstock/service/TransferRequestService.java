package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.TransferRequestCreateDTO;
import com.example.backend_medstock.dto.TransferRequestResponseDTO;
import com.example.backend_medstock.mapper.TransferRequestMapper;
import com.example.backend_medstock.model.TransferRequest;
import com.example.backend_medstock.repository.TransferRequestRepository;
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
    private final TransferRequestMapper transferRequestMapper;

    public TransferRequestService(TransferRequestRepository transferRequestRepository, TransferRequestMapper transferRequestMapper) {
        this.transferRequestRepository = transferRequestRepository;
        this.transferRequestMapper = transferRequestMapper;
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
        return transferRequestRepository.findById(id).map(request -> {
            request.setStatus("accepted");
            request.setAcceptedBy(acceptedByUserId);
            request.setAcceptedAt(LocalDateTime.now());
            return transferRequestMapper.toResponseDTO(transferRequestRepository.save(request));
        });
    }

    public Optional<TransferRequestResponseDTO> rejectTransferRequest(UUID id, UUID rejectedByUserId, Map<String, String> payload) {
        return transferRequestRepository.findById(id).map(request -> {
            request.setStatus("rejected");
            request.setRejectedBy(rejectedByUserId);
            request.setRejectedAt(LocalDateTime.now());

            if (payload != null && payload.containsKey("rejectionReason")) {
                request.setRejectionReason(payload.get("rejectionReason"));
            }
            return transferRequestMapper.toResponseDTO(transferRequestRepository.save(request));
        });
    }

    public boolean deleteTransferRequest(UUID id) {
        if (transferRequestRepository.existsById(id)) {
            transferRequestRepository.deleteById(id);
            return true;
        }
        return false;
    }
}