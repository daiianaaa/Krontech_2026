package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.TransferRecommendationView;
import com.example.backend_medstock.service.TransferRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin
public class TransferRecommendationController {

    private final TransferRecommendationService transferRecommendationService;

    public TransferRecommendationController(TransferRecommendationService transferRecommendationService) {
        this.transferRecommendationService = transferRecommendationService;
    }

    @GetMapping
    public ResponseEntity<List<TransferRecommendationView>> getAllRecommendations() {
        return ResponseEntity.ok(transferRecommendationService.getAllRecommendations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferRecommendationView> getRecommendationById(@PathVariable UUID id) {
        return transferRecommendationService.getRecommendationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<Void> acceptRecommendation(@PathVariable UUID id, @RequestParam UUID acceptedByUserId) {
        boolean success = transferRecommendationService.acceptRecommendation(id, acceptedByUserId);
        if (success) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}