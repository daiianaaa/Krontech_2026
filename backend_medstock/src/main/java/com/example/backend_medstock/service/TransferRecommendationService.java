package com.example.backend_medstock.service;

import com.example.backend_medstock.model.TransferRecommendationView;
import com.example.backend_medstock.repository.TransferRecommendationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferRecommendationService {

    private final TransferRecommendationRepository transferRecommendationRepository;
    private final JdbcTemplate jdbcTemplate;

    public TransferRecommendationService(TransferRecommendationRepository transferRecommendationRepository, JdbcTemplate jdbcTemplate) {
        this.transferRecommendationRepository = transferRecommendationRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    // READ ALL
    public List<TransferRecommendationView> getAllRecommendations() {
        return transferRecommendationRepository.findAll();
    }

    // READ BY ID
    public Optional<TransferRecommendationView> getRecommendationById(UUID id) {
        return transferRecommendationRepository.findById(id);
    }

    public boolean acceptRecommendation(UUID recommendationId, UUID acceptedByUserId) {
        try {
            // 1. Get recommendation details
            java.util.Map<String, Object> rec = jdbcTemplate.queryForMap(
                "SELECT source_hospital_id, destination_hospital_id, medication_id, batch_id, recommended_quantity " +
                "FROM transfer_recommendations WHERE id = ?", recommendationId);
            
            UUID sourceId = (UUID) rec.get("source_hospital_id");
            UUID destId = (UUID) rec.get("destination_hospital_id");
            UUID medId = (UUID) rec.get("medication_id");
            UUID batchId = (UUID) rec.get("batch_id");
            int qty = ((Number) rec.get("recommended_quantity")).intValue();

            // 2. Get required_storage_type from the medication
            String storageType = "normal";
            try {
                storageType = jdbcTemplate.queryForObject(
                    "SELECT required_storage_type FROM medications WHERE id = ?", String.class, medId);
                if (storageType == null) storageType = "normal";
            } catch (Exception ignored) {}

            // 3. Determine if it's a SEND or REQUEST based on the acceptedByUserId's hospital
            UUID userHospitalId = null;
            try {
                userHospitalId = jdbcTemplate.queryForObject(
                    "SELECT hospital_id FROM app_users WHERE id = ?", UUID.class, acceptedByUserId);
            } catch (Exception ignored) {}

            String transactionType = (userHospitalId != null && userHospitalId.equals(sourceId)) ? "send" : "request";
            UUID requestSender = (transactionType.equals("send")) ? sourceId : destId;
            UUID requestReceiver = (transactionType.equals("send")) ? destId : sourceId;

            // 4. Insert into transfer_requests (with required_storage_type and source_recommendation_id)
            jdbcTemplate.update(
                "INSERT INTO transfer_requests " +
                "(transaction_id, sender_hospital_id, receiver_hospital_id, source_hospital_id, destination_hospital_id, " +
                "transaction_type, medication_id, batch_id, quantity, reason, status, required_storage_type, source_recommendation_id, created_by, created_at, updated_at) " +
                "VALUES (gen_random_uuid(), ?, ?, ?, ?, ?::manual_transfer_type, ?, ?, ?, 'AI Recommended Transfer', 'pending'::recommendation_status, ?::storage_type, ?, ?, NOW(), NOW())",
                requestSender, requestReceiver, sourceId, destId, transactionType, medId, batchId, qty, storageType, recommendationId, acceptedByUserId
            );

            // 5. Update the recommendation status
            jdbcTemplate.update(
                "UPDATE transfer_recommendations SET status = 'accepted', accepted_by = ?, updated_at = NOW() WHERE id = ?",
                acceptedByUserId, recommendationId
            );

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}