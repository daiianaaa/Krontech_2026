package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.TransferRecommendationView;
import com.example.backend_medstock.service.TransferRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations") // Verifică dacă ruta ta era /api/recommendations sau alta și adaptează dacă e nevoie
@CrossOrigin
public class TransferRecommendationController {

    private final TransferRecommendationService transferRecommendationService;

    // Injectăm exclusiv Service-ul
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
}