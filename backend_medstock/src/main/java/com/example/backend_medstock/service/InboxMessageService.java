package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.InboxMessageCreateDTO;
import com.example.backend_medstock.dto.InboxMessageResponseDTO;
import com.example.backend_medstock.mapper.InboxMessageMapper;
import com.example.backend_medstock.model.InboxMessage;
import com.example.backend_medstock.repository.InboxMessageRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InboxMessageService {

    private final InboxMessageRepository inboxMessageRepository;
    private final InboxMessageMapper inboxMessageMapper;

    public InboxMessageService(InboxMessageRepository inboxMessageRepository, InboxMessageMapper inboxMessageMapper) {
        this.inboxMessageRepository = inboxMessageRepository;
        this.inboxMessageMapper = inboxMessageMapper;
    }

    // CREATE
    public InboxMessageResponseDTO createMessage(InboxMessageCreateDTO dto) {
        InboxMessage message = inboxMessageMapper.toEntity(dto);
        InboxMessage savedMessage = inboxMessageRepository.save(message);
        return inboxMessageMapper.toResponseDTO(savedMessage);
    }

    // READ ALL
    public List<InboxMessageResponseDTO> getAllMessages() {
        return inboxMessageRepository.findAll()
                .stream()
                .map(inboxMessageMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    // READ BY ID
    public Optional<InboxMessageResponseDTO> getMessageById(UUID id) {
        return inboxMessageRepository.findById(id)
                .map(inboxMessageMapper::toResponseDTO);
    }

    // UPDATE
    public Optional<InboxMessageResponseDTO> updateMessage(UUID id, InboxMessageCreateDTO newData) {
        if (!inboxMessageRepository.existsById(id)) {
            return Optional.empty();
        }
        InboxMessage messageToUpdate = inboxMessageMapper.toEntity(newData);
        messageToUpdate.setInboxId(id);
        InboxMessage updatedMessage = inboxMessageRepository.save(messageToUpdate);
        return Optional.of(inboxMessageMapper.toResponseDTO(updatedMessage));
    }

    // UPDATE - MARCHEAZĂ CA CITIT
    public Optional<InboxMessageResponseDTO> markAsRead(UUID id) {
        return inboxMessageRepository.findById(id).map(message -> {
            message.setInboxStatus("read");
            message.setReadAt(LocalDateTime.now());
            return inboxMessageMapper.toResponseDTO(inboxMessageRepository.save(message));
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