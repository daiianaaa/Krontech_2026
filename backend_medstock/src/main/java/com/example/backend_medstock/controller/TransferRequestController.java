package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.TransferRequest;
import com.example.backend_medstock.service.TransferRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
@CrossOrigin
public class TransferRequestController {

    private final TransferRequestService transferRequestService;

    // AICI este schimbarea cheie: Injectăm Service-ul, NU Repository-ul!
    public TransferRequestController(TransferRequestService transferRequestService) {
        this.transferRequestService = transferRequestService;
    }

    @PostMapping
    public ResponseEntity<TransferRequest> createTransferRequest(@RequestBody TransferRequest transferRequest) {
        TransferRequest savedRequest = transferRequestService.createTransferRequest(transferRequest);
        return new ResponseEntity<>(savedRequest, HttpStatus.CREATED);
    }

    @GetMapping
    public List<TransferRequest> getAllTransferRequests() {
        return transferRequestService.getAllTransferRequests();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferRequest> getTransferRequestById(@PathVariable UUID id) {
        return transferRequestService.getTransferRequestById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sent/{senderId}")
    public List<TransferRequest> getSentRequests(@PathVariable UUID senderId) {
        return transferRequestService.getSentRequests(senderId);
    }

    @GetMapping("/received/{receiverId}")
    public List<TransferRequest> getReceivedRequests(@PathVariable UUID receiverId) {
        return transferRequestService.getReceivedRequests(receiverId);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransferRequest> updateTransferRequest(@PathVariable UUID id, @RequestBody TransferRequest newData) {
        return transferRequestService.updateTransferRequest(id, newData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<TransferRequest> acceptTransferRequest(@PathVariable UUID id, @RequestParam UUID acceptedByUserId) {
        return transferRequestService.acceptTransferRequest(id, acceptedByUserId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<TransferRequest> rejectTransferRequest(
            @PathVariable UUID id,
            @RequestParam UUID rejectedByUserId,
            @RequestBody(required = false) Map<String, String> payload) {

        return transferRequestService.rejectTransferRequest(id, rejectedByUserId, payload)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransferRequest(@PathVariable UUID id) {
        if (transferRequestService.deleteTransferRequest(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}