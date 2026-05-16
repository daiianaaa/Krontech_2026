package com.example.backend_medstock.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserResponseDTO {
    private UUID id;
    private UUID hospitalId;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private Boolean isActive;
}