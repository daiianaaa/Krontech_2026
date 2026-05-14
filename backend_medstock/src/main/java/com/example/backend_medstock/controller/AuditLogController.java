package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.AuditLog;
import com.example.backend_medstock.repository.AuditLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // CREATE: Înregistrează un log nou
    @PostMapping
    public ResponseEntity<AuditLog> createAuditLog(@RequestBody AuditLog auditLog) {
        AuditLog savedLog = auditLogRepository.save(auditLog);
        return new ResponseEntity<>(savedLog, HttpStatus.CREATED);
    }

    // READ ALL: Aduce tot istoricul
    @GetMapping
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    // READ BY USER: Istoric pentru un anumit utilizator
    @GetMapping("/user/{userId}")
    public List<AuditLog> getAuditLogsByUser(@PathVariable UUID userId) {
        return auditLogRepository.findByUserId(userId);
    }

    // READ BY ENTITY: Istoric pentru o entitate (ex: Medicament, TransferRequest)
    @GetMapping("/entity/{entityName}/{entityId}")
    public List<AuditLog> getAuditLogsForEntity(@PathVariable String entityName, @PathVariable UUID entityId) {
        return auditLogRepository.findByEntityNameAndEntityId(entityName, entityId);
    }
}