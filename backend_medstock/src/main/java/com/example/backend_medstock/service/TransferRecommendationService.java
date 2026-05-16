package com.example.backend_medstock.service;

import com.example.backend_medstock.model.TransferRecommendationView;
import com.example.backend_medstock.repository.TransferRecommendationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferRecommendationService {

    private final TransferRecommendationRepository transferRecommendationRepository;

    public TransferRecommendationService(TransferRecommendationRepository transferRecommendationRepository) {
        this.transferRecommendationRepository = transferRecommendationRepository;
    }

    // READ ALL
    public List<TransferRecommendationView> getAllRecommendations() {
        return transferRecommendationRepository.findAll();
    }

    // READ BY ID
    public Optional<TransferRecommendationView> getRecommendationById(UUID id) {
        return transferRecommendationRepository.findById(id);
    }

    // Dacă ai creat și alte metode custom în repository (ex: findBySourceHospitalId),
    // le poți adăuga aici după același tipar.
}