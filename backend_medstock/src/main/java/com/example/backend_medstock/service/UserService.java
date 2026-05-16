package com.example.backend_medstock.service;

import com.example.backend_medstock.dto.UserCreateDTO;
import com.example.backend_medstock.dto.UserResponseDTO;
import com.example.backend_medstock.dto.UserMapper;
import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    // Injectăm și Mapper-ul
    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    // CREATE (Primim datele brute, returnăm datele sigure)
    public UserResponseDTO createUser(UserCreateDTO dto) {
        User user = userMapper.toEntity(dto);
        // Aici pe viitor vei adăuga criptarea parolei înainte de save
        User savedUser = userRepository.save(user);
        return userMapper.toResponseDTO(savedUser);
    }

    // READ ALL (Folosim stream-uri pentru a mapa toată lista)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    // READ BY ID
    public Optional<UserResponseDTO> getUserById(UUID id) {
        return userRepository.findById(id)
                .map(userMapper::toResponseDTO);
    }

    // UPDATE
    public Optional<UserResponseDTO> updateUser(UUID id, UserCreateDTO newData) {
        if (!userRepository.existsById(id)) {
            return Optional.empty();
        }
        User userToUpdate = userMapper.toEntity(newData);
        userToUpdate.setId(id);
        User updatedUser = userRepository.save(userToUpdate);
        return Optional.of(userMapper.toResponseDTO(updatedUser));
    }

    // DELETE (Rămâne neschimbat)
    public boolean deleteUser(UUID id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
}