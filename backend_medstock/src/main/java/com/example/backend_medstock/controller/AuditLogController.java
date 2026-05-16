package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.AuditLogCreateDTO;
import com.example.backend_medstock.dto.AuditLogResponseDTO;
import com.example.backend_medstock.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<AuditLogResponseDTO> createAuditLog(@RequestBody AuditLogCreateDTO auditLogDto) {
        AuditLogResponseDTO savedLog = auditLogService.createAuditLog(auditLogDto);
        return new ResponseEntity<>(savedLog, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponseDTO>> getAllAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllAuditLogs());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByUser(userId));
    }

    @GetMapping("/entity/{entityName}/{entityId}")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsForEntity(
            @PathVariable String entityName,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsForEntity(entityName, entityId));
    }
}