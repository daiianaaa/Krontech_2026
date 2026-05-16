package com.example.backend_medstock.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class AuditLogResponseDTO {
    private UUID id;
    private UUID userId;
    private String action;
    private String entityName;
    private UUID entityId;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt; // Îl lăsăm aici, e vital pentru loguri!
}