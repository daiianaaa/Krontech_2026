package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.TransferRequestCreateDTO;
import com.example.backend_medstock.dto.TransferRequestResponseDTO;
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

    public TransferRequestController(TransferRequestService transferRequestService) {
        this.transferRequestService = transferRequestService;
    }

    @PostMapping
    public ResponseEntity<TransferRequestResponseDTO> createTransferRequest(@RequestBody TransferRequestCreateDTO dto) {
        TransferRequestResponseDTO savedRequest = transferRequestService.createTransferRequest(dto);
        return new ResponseEntity<>(savedRequest, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TransferRequestResponseDTO>> getAllTransferRequests() {
        return ResponseEntity.ok(transferRequestService.getAllTransferRequests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferRequestResponseDTO> getTransferRequestById(@PathVariable UUID id) {
        return transferRequestService.getTransferRequestById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sent/{senderId}")
    public ResponseEntity<List<TransferRequestResponseDTO>> getSentRequests(@PathVariable UUID senderId) {
        return ResponseEntity.ok(transferRequestService.getSentRequests(senderId));
    }

    @GetMapping("/received/{receiverId}")
    public ResponseEntity<List<TransferRequestResponseDTO>> getReceivedRequests(@PathVariable UUID receiverId) {
        return ResponseEntity.ok(transferRequestService.getReceivedRequests(receiverId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransferRequestResponseDTO> updateTransferRequest(@PathVariable UUID id, @RequestBody TransferRequestCreateDTO newData) {
        return transferRequestService.updateTransferRequest(id, newData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<TransferRequestResponseDTO> acceptTransferRequest(@PathVariable UUID id, @RequestParam UUID acceptedByUserId) {
        return transferRequestService.acceptTransferRequest(id, acceptedByUserId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<TransferRequestResponseDTO> rejectTransferRequest(
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