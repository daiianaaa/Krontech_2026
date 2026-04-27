package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // CREATE: Adaugă un utilizator (Spital/Farmacie/Administrativ)
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        User savedUser = userRepository.save(user);
        return new ResponseEntity<>(savedUser, HttpStatus.CREATED);
    }

    // READ: Lista cu toate instituțiile
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // READ: Detalii despre o singură instituție
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE: Modifică datele unui spital/farmacii
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User newData) {
        return userRepository.findById(id)
                .map(existing -> {
                    existing.setName(newData.getName());
                    existing.setType(newData.getType());
                    existing.setRegion(newData.getRegion());
                    existing.setAddress(newData.getAddress());
                    existing.setUsername(newData.getUsername());

                    // Actualizăm parola doar dacă e trimisă, altfel e periculos
                    if (newData.getPassword() != null && !newData.getPassword().isEmpty()) {
                        existing.setPassword(newData.getPassword());
                    }

                    User updated = userRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE: Șterge un utilizator
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}