package com.example.backend_medstock.dto;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class AuditLogCreateDTO {
    private UUID userId;
    private String action;
    private String entityName;
    private UUID entityId;
    private Map<String, Object> metadata;
}