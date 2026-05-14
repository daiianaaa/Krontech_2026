package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.TransferRecommendationView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TransferRecommendationRepository extends JpaRepository<TransferRecommendationView, UUID> {
    // Aici poti adauga mai tarziu filtre, ex: findBySourceHospitalName(...)
}