package com.example.backend_medstock.service;

import com.example.backend_medstock.model.AuditLog;
import com.example.backend_medstock.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // CREATE
    public AuditLog createAuditLog(AuditLog auditLog) {
        return auditLogRepository.save(auditLog);
    }

    // READ ALL
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    // READ BY USER ID
    public List<AuditLog> getAuditLogsByUser(UUID userId) {
        return auditLogRepository.findByUserId(userId);
    }

    // READ BY ENTITY
    public List<AuditLog> getAuditLogsForEntity(String entityName, UUID entityId) {
        return auditLogRepository.findByEntityNameAndEntityId(entityName, entityId);
    }
}