package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    // Aduce toate log-urile generate de un anumit utilizator
    List<AuditLog> findByUserId(UUID userId);

    // Aduce istoricul de log-uri pentru o entitate specifică (ex: toate log-urile pentru TransferRequest-ul X)
    List<AuditLog> findByEntityNameAndEntityId(String entityName, UUID entityId);
}