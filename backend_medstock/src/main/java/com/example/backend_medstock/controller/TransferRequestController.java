package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.TransferRequest;
import com.example.backend_medstock.repository.TransferRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
@CrossOrigin
public class TransferRequestController {

    private final TransferRequestRepository transferRequestRepository;

    public TransferRequestController(TransferRequestRepository transferRequestRepository) {
        this.transferRequestRepository = transferRequestRepository;
    }

    // CREATE: Creează o cerere nouă de transfer
    @PostMapping
    public ResponseEntity<TransferRequest> createTransferRequest(@RequestBody TransferRequest transferRequest) {
        TransferRequest savedRequest = transferRequestRepository.save(transferRequest);
        return new ResponseEntity<>(savedRequest, HttpStatus.CREATED);
    }

    // READ ALL: Toate cererile din sistem
    @GetMapping
    public List<TransferRequest> getAllTransferRequests() {
        return transferRequestRepository.findAll();
    }

    // READ BY ID: O singură cerere după ID-ul ei tranzacțional
    @GetMapping("/{id}")
    public ResponseEntity<TransferRequest> getTransferRequestById(@PathVariable UUID id) {
        return transferRequestRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET: Cereri trimise de un anumit spital (unde spitalul este inițiator)
    @GetMapping("/sent/{senderId}")
    public List<TransferRequest> getSentRequests(@PathVariable UUID senderId) {
        return transferRequestRepository.findBySenderHospitalId(senderId);
    }

    // GET: Cereri primite de un anumit spital (care trebuie să le aprobe/respingă)
    @GetMapping("/received/{receiverId}")
    public List<TransferRequest> getReceivedRequests(@PathVariable UUID receiverId) {
        return transferRequestRepository.findByReceiverHospitalId(receiverId);
    }

    // UPDATE COMPLET: Actualizează toate câmpurile unei cereri
    @PutMapping("/{id}")
    public ResponseEntity<TransferRequest> updateTransferRequest(@PathVariable UUID id, @RequestBody TransferRequest newData) {
        if (!transferRequestRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        newData.setTransactionId(id);
        TransferRequest updatedRequest = transferRequestRepository.save(newData);
        return ResponseEntity.ok(updatedRequest);
    }

    // UPDATE STATUS: Aprobarea transferului
    @PutMapping("/{id}/accept")
    public ResponseEntity<TransferRequest> acceptTransferRequest(
            @PathVariable UUID id,
            @RequestParam UUID acceptedByUserId) {

        return transferRequestRepository.findById(id)
                .map(request -> {
                    request.setStatus("accepted");
                    request.setAcceptedBy(acceptedByUserId);
                    request.setAcceptedAt(LocalDateTime.now());
                    return ResponseEntity.ok(transferRequestRepository.save(request));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE STATUS: Respingerea transferului (cu salvarea motivului)
    @PutMapping("/{id}/reject")
    public ResponseEntity<TransferRequest> rejectTransferRequest(
            @PathVariable UUID id,
            @RequestParam UUID rejectedByUserId,
            @RequestBody(required = false) Map<String, String> payload) {

        return transferRequestRepository.findById(id)
                .map(request -> {
                    request.setStatus("rejected");
                    request.setRejectedBy(rejectedByUserId);
                    request.setRejectedAt(LocalDateTime.now());

                    // Extragem motivul respingerii din corpul JSON, dacă frontend-ul l-a trimis
                    if (payload != null && payload.containsKey("rejectionReason")) {
                        request.setRejectionReason(payload.get("rejectionReason"));
                    }

                    return ResponseEntity.ok(transferRequestRepository.save(request));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE: Ștergerea unei înregistrări de transfer
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransferRequest(@PathVariable UUID id) {
        if (transferRequestRepository.existsById(id)) {
            transferRequestRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}