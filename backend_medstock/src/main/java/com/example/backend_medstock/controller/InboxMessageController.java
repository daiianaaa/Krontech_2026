package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.InboxMessage;
import com.example.backend_medstock.service.InboxMessageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inbox")
@CrossOrigin
public class InboxMessageController {

    private final InboxMessageService inboxMessageService;

    // Injectăm exclusiv Service-ul!
    public InboxMessageController(InboxMessageService inboxMessageService) {
        this.inboxMessageService = inboxMessageService;
    }

    @PostMapping
    public ResponseEntity<InboxMessage> createMessage(@RequestBody InboxMessage message) {
        InboxMessage savedMessage = inboxMessageService.createMessage(message);
        return new ResponseEntity<>(savedMessage, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<InboxMessage>> getAllMessages() {
        return ResponseEntity.ok(inboxMessageService.getAllMessages());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InboxMessage> getMessageById(@PathVariable UUID id) {
        return inboxMessageService.getMessageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Exemplu rută pentru inbox-ul unui spital
    /*
    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<InboxMessage>> getMessagesByHospitalId(@PathVariable UUID hospitalId) {
        return ResponseEntity.ok(inboxMessageService.getMessagesByHospitalId(hospitalId));
    }
    */

    @PutMapping("/{id}")
    public ResponseEntity<InboxMessage> updateMessage(@PathVariable UUID id, @RequestBody InboxMessage newData) {
        return inboxMessageService.updateMessage(id, newData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint specific pentru a marca un mesaj ca citit
    @PutMapping("/{id}/read")
    public ResponseEntity<InboxMessage> markAsRead(@PathVariable UUID id) {
        return inboxMessageService.markAsRead(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable UUID id) {
        if (inboxMessageService.deleteMessage(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}