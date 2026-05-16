package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.AuditLogCreateDTO;
import com.example.backend_medstock.dto.AuditLogResponseDTO;
import com.example.backend_medstock.mapper.AuditLogMapper;
import com.example.backend_medstock.model.AuditLog;
import com.example.backend_medstock.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    public AuditLogService(AuditLogRepository auditLogRepository, AuditLogMapper auditLogMapper) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogMapper = auditLogMapper;
    }

    // CREATE
    public AuditLogResponseDTO createAuditLog(AuditLogCreateDTO dto) {
        AuditLog auditLog = auditLogMapper.toEntity(dto);
        AuditLog savedLog = auditLogRepository.save(auditLog);
        return auditLogMapper.toResponseDTO(savedLog);
    }

    // READ ALL
    public List<AuditLogResponseDTO> getAllAuditLogs() {
        return auditLogRepository.findAll()
                .stream()
                .map(auditLogMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    // READ BY USER ID
    public List<AuditLogResponseDTO> getAuditLogsByUser(UUID userId) {
        return auditLogRepository.findByUserId(userId)
                .stream()
                .map(auditLogMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    // READ BY ENTITY
    public List<AuditLogResponseDTO> getAuditLogsForEntity(String entityName, UUID entityId) {
        return auditLogRepository.findByEntityNameAndEntityId(entityName, entityId)
                .stream()
                .map(auditLogMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}