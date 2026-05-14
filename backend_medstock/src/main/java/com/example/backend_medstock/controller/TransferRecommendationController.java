package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.TransferRecommendationView;
import com.example.backend_medstock.repository.TransferRecommendationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medication/recommendation")
@CrossOrigin
public class TransferRecommendationController {

    private final TransferRecommendationRepository recommendationRepository;

    public TransferRecommendationController(TransferRecommendationRepository recommendationRepository) {
        this.recommendationRepository = recommendationRepository;
    }

    // READ ALL: Returneaza toate recomandarile din View
    @GetMapping
    public List<TransferRecommendationView> getAllRecommendations() {
        return recommendationRepository.findAll();
    }

    // READ BY ID: Returneaza o recomandare specifica dupa ID
    @GetMapping("/{id}")
    public ResponseEntity<TransferRecommendationView> getRecommendationById(@PathVariable UUID id) {
        return recommendationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}