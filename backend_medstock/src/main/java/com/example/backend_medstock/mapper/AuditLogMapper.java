package com.example.backend_medstock.mapper;

import com.example.backend_medstock.dto.AuditLogCreateDTO;
import com.example.backend_medstock.dto.AuditLogResponseDTO;
import com.example.backend_medstock.model.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    // Entitate -> DTO
    public AuditLogResponseDTO toResponseDTO(AuditLog log) {
        if (log == null) {
            return null;
        }

        return AuditLogResponseDTO.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .action(log.getAction())
                .entityName(log.getEntityName())
                .entityId(log.getEntityId())
                .metadata(log.getMetadata())
                .createdAt(log.getCreatedAt())
                .build();
    }

    // DTO -> Entitate
    public AuditLog toEntity(AuditLogCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        AuditLog log = new AuditLog();
        log.setUserId(dto.getUserId());
        log.setAction(dto.getAction());
        log.setEntityName(dto.getEntityName());
        log.setEntityId(dto.getEntityId());
        log.setMetadata(dto.getMetadata());

        return log;
    }
}