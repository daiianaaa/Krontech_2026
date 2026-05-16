package com.example.backend_medstock.service;

import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // CREATE
    public User createUser(User user) {
        // Dacă e cazul, pe viitor aici vom cripta și parola înainte de salvare
        return userRepository.save(user);
    }

    // READ ALL
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // READ BY ID
    public Optional<User> getUserById(UUID id) {
        return userRepository.findById(id);
    }

    // UPDATE
    public Optional<User> updateUser(UUID id, User newData) {
        if (!userRepository.existsById(id)) {
            return Optional.empty();
        }
        newData.setId(id);
        // La fel, dacă se face update la parolă, va trebui criptată aici
        return Optional.of(userRepository.save(newData));
    }

    // DELETE
    public boolean deleteUser(UUID id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
}