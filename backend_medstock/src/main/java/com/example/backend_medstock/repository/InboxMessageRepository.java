package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.InboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InboxMessageRepository extends JpaRepository<InboxMessage, UUID> {

    // Aduce toate mesajele destinate unui anumit spital
    List<InboxMessage> findByReceiverHospitalId(UUID receiverHospitalId);
}