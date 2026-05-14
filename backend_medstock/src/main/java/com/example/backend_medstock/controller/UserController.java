package com.example.backend_medstock.controller;

import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // CREATE: Adaugă un utilizator
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        User savedUser = userRepository.save(user);
        return new ResponseEntity<>(savedUser, HttpStatus.CREATED);
    }

    // READ: Lista cu toți utilizatorii
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // READ: Detalii despre un singur utilizator
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable UUID id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE: Modifică datele unui utilizator
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable UUID id, @RequestBody User newData) {
        return userRepository.findById(id)
                .map(existing -> {
                    // Mapăm noile atribute din structura tabelei app_users
                    existing.setFullName(newData.getFullName());
                    existing.setRole(newData.getRole());
                    existing.setEmail(newData.getEmail());
                    existing.setUsername(newData.getUsername());
                    existing.setHospitalId(newData.getHospitalId());
                    existing.setIsActive(newData.getIsActive());

                    // Actualizăm parola doar dacă e trimisă
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
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}