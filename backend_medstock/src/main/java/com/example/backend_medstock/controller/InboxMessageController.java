package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.InboxMessageCreateDTO;
import com.example.backend_medstock.dto.InboxMessageResponseDTO;
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

    public InboxMessageController(InboxMessageService inboxMessageService) {
        this.inboxMessageService = inboxMessageService;
    }

    @PostMapping
    public ResponseEntity<InboxMessageResponseDTO> createMessage(@RequestBody InboxMessageCreateDTO messageDto) {
        InboxMessageResponseDTO savedMessage = inboxMessageService.createMessage(messageDto);
        return new ResponseEntity<>(savedMessage, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<InboxMessageResponseDTO>> getAllMessages() {
        return ResponseEntity.ok(inboxMessageService.getAllMessages());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InboxMessageResponseDTO> getMessageById(@PathVariable UUID id) {
        return inboxMessageService.getMessageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<InboxMessageResponseDTO> updateMessage(@PathVariable UUID id, @RequestBody InboxMessageCreateDTO newData) {
        return inboxMessageService.updateMessage(id, newData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint specific pentru a marca un mesaj ca citit
    @PutMapping("/{id}/read")
    public ResponseEntity<InboxMessageResponseDTO> markAsRead(@PathVariable UUID id) {
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