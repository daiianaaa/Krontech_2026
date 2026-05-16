package com.example.backend_medstock.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UserCreateDTO {
    private UUID hospitalId;
    private String fullName;
    private String username;
    private String password;
    private String email;
    private String role;
    private Boolean isActive;
}