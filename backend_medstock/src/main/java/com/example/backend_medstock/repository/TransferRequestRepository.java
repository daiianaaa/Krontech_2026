package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.TransferRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransferRequestRepository extends JpaRepository<TransferRequest, UUID> {

    // Aduce toate cererile trimise de un anumit spital
    List<TransferRequest> findBySenderHospitalId(UUID senderHospitalId);

    // Aduce toate cererile primite de un anumit spital
    List<TransferRequest> findByReceiverHospitalId(UUID receiverHospitalId);

    // Aduce toate cererile care au un anumit status (ex: pending, accepted)
    List<TransferRequest> findByStatus(String status);
}