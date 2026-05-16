package com.example.backend_medstock.service;

import com.example.backend_medstock.model.InboxMessage;
import com.example.backend_medstock.repository.InboxMessageRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InboxMessageService {

    private final InboxMessageRepository inboxMessageRepository;

    public InboxMessageService(InboxMessageRepository inboxMessageRepository) {
        this.inboxMessageRepository = inboxMessageRepository;
    }

    // CREATE
    public InboxMessage createMessage(InboxMessage message) {
        return inboxMessageRepository.save(message);
    }

    // READ ALL
    public List<InboxMessage> getAllMessages() {
        return inboxMessageRepository.findAll();
    }

    // READ BY ID
    public Optional<InboxMessage> getMessageById(UUID id) {
        return inboxMessageRepository.findById(id);
    }

    // UPDATE
    public Optional<InboxMessage> updateMessage(UUID id, InboxMessage newData) {
        if (!inboxMessageRepository.existsById(id)) {
            return Optional.empty();
        }
        // Reparare: Lombok a generat setInboxId conform numelui variabilei tale
        newData.setInboxId(id);
        return Optional.of(inboxMessageRepository.save(newData));
    }

    // UPDATE - MARCHEAZĂ CA CITIT
    public Optional<InboxMessage> markAsRead(UUID id) {
        return inboxMessageRepository.findById(id).map(message -> {
            // Reparare: Folosim logica ta excelentă cu status și dată de citire
            message.setInboxStatus("read");
            message.setReadAt(LocalDateTime.now());
            return inboxMessageRepository.save(message);
        });
    }

    // DELETE
    public boolean deleteMessage(UUID id) {
        if (inboxMessageRepository.existsById(id)) {
            inboxMessageRepository.deleteById(id);
            return true;
        }
        return false;
    }
}