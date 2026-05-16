package com.example.backend_medstock.dto;

import com.example.backend_medstock.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    // Transformă din Entitate în DTO (pentru a trimite la frontend)
    public UserResponseDTO toResponseDTO(User user) {
        if (user == null) {
            return null;
        }

        return UserResponseDTO.builder()
                .id(user.getId())
                .hospitalId(user.getHospitalId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                // Observă că NU punem parola aici!
                .build();
    }

    // Transformă din DTO în Entitate (când primim date noi de la frontend)
    public User toEntity(UserCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        User user = new User();
        user.setHospitalId(dto.getHospitalId());
        user.setFullName(dto.getFullName());
        user.setUsername(dto.getUsername());
        user.setPassword(dto.getPassword()); // Aici luăm parola pentru a o salva în baza de date
        user.setEmail(dto.getEmail());
        user.setRole(dto.getRole());
        user.setIsActive(dto.getIsActive());

        return user;
    }
}