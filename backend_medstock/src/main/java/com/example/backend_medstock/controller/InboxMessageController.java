package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.InboxMessage;
import com.example.backend_medstock.repository.InboxMessageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inbox")
@CrossOrigin
public class InboxMessageController {

    private final InboxMessageRepository inboxMessageRepository;

    public InboxMessageController(InboxMessageRepository inboxMessageRepository) {
        this.inboxMessageRepository = inboxMessageRepository;
    }

    // CREATE: Trimite un mesaj nou
    @PostMapping
    public ResponseEntity<InboxMessage> createMessage(@RequestBody InboxMessage message) {
        InboxMessage savedMessage = inboxMessageRepository.save(message);
        return new ResponseEntity<>(savedMessage, HttpStatus.CREATED);
    }

    // READ ALL: Toate mesajele din sistem
    @GetMapping
    public List<InboxMessage> getAllMessages() {
        return inboxMessageRepository.findAll();
    }

    // READ BY ID: Un singur mesaj
    @GetMapping("/{id}")
    public ResponseEntity<InboxMessage> getMessageById(@PathVariable UUID id) {
        return inboxMessageRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // READ BY RECEIVER: Toate mesajele pentru un anumit spital
    @GetMapping("/hospital/{receiverId}")
    public List<InboxMessage> getMessagesForHospital(@PathVariable UUID receiverId) {
        return inboxMessageRepository.findByReceiverHospitalId(receiverId);
    }

    // UPDATE: Marchează mesajul ca citit (sau actualizează alte statusuri)
    @PutMapping("/{id}/read")
    public ResponseEntity<InboxMessage> markAsRead(@PathVariable UUID id) {
        return inboxMessageRepository.findById(id)
                .map(existingMessage -> {
                    existingMessage.setInboxStatus("read");
                    existingMessage.setReadAt(LocalDateTime.now());

                    InboxMessage updated = inboxMessageRepository.save(existingMessage);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE: Șterge un mesaj
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable UUID id) {
        if (inboxMessageRepository.existsById(id)) {
            inboxMessageRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}