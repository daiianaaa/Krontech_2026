package com.example.backend_medstock.service;

import com.example.backend_medstock.model.TransferRequest;
import com.example.backend_medstock.repository.TransferRequestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service // Această adnotare îi spune lui Spring Boot că aici e logica de business
public class TransferRequestService {

    private final TransferRequestRepository transferRequestRepository;

    // Injectăm Repository-ul aici, în Service
    public TransferRequestService(TransferRequestRepository transferRequestRepository) {
        this.transferRequestRepository = transferRequestRepository;
    }

    public TransferRequest createTransferRequest(TransferRequest transferRequest) {
        return transferRequestRepository.save(transferRequest);
    }

    public List<TransferRequest> getAllTransferRequests() {
        return transferRequestRepository.findAll();
    }

    public Optional<TransferRequest> getTransferRequestById(UUID id) {
        return transferRequestRepository.findById(id);
    }

    public List<TransferRequest> getSentRequests(UUID senderId) {
        return transferRequestRepository.findBySenderHospitalId(senderId);
    }

    public List<TransferRequest> getReceivedRequests(UUID receiverId) {
        return transferRequestRepository.findByReceiverHospitalId(receiverId);
    }

    public Optional<TransferRequest> updateTransferRequest(UUID id, TransferRequest newData) {
        if (!transferRequestRepository.existsById(id)) {
            return Optional.empty();
        }
        newData.setTransactionId(id);
        return Optional.of(transferRequestRepository.save(newData));
    }

    public Optional<TransferRequest> acceptTransferRequest(UUID id, UUID acceptedByUserId) {
        return transferRequestRepository.findById(id).map(request -> {
            request.setStatus("accepted");
            request.setAcceptedBy(acceptedByUserId);
            request.setAcceptedAt(LocalDateTime.now());
            return transferRequestRepository.save(request);
        });
    }

    public Optional<TransferRequest> rejectTransferRequest(UUID id, UUID rejectedByUserId, Map<String, String> payload) {
        return transferRequestRepository.findById(id).map(request -> {
            request.setStatus("rejected");
            request.setRejectedBy(rejectedByUserId);
            request.setRejectedAt(LocalDateTime.now());

            if (payload != null && payload.containsKey("rejectionReason")) {
                request.setRejectionReason(payload.get("rejectionReason"));
            }
            return transferRequestRepository.save(request);
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