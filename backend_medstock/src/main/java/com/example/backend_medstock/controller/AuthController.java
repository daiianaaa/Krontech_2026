package com.example.backend_medstock.controller;

import com.example.backend_medstock.dto.UserResponseDTO;
import com.example.backend_medstock.model.User;
import com.example.backend_medstock.repository.UserRepository;
import com.example.backend_medstock.service.CustomUserDetailsService;
import com.example.backend_medstock.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager, CustomUserDetailsService userDetailsService, JwtService jwtService, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    public record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        // 1. Verificăm parola
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        // 2. Generăm JWT-ul
        final UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        final String jwtToken = jwtService.generateToken(userDetails);

        // 3. Construim Cookie-ul HttpOnly
        ResponseCookie springCookie = ResponseCookie.from("jwt_cookie", jwtToken)
                .httpOnly(true)
                .secure(false) // De pus pe true în producție (când ai HTTPS)
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite("Strict")
                .build();

        // 4. Atașăm Cookie-ul la răspuns
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, springCookie.toString())
                .body(Map.of("message", "Autentificare cu succes. Token-ul este in cookie!"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        // Extragem JWT din cookie
        if (request.getCookies() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Nu ești autentificat"));
        }
        String token = null;
        for (Cookie cookie : request.getCookies()) {
            if ("jwt_cookie".equals(cookie.getName())) {
                token = cookie.getValue();
                break;
            }
        }
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Nu ești autentificat"));
        }

        String username = jwtService.extractUsername(token);
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Utilizatorul nu există"));
        }

        User user = userOpt.get();
        UserResponseDTO dto = UserResponseDTO.builder()
                .id(user.getId())
                .hospitalId(user.getHospitalId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .build();

        return ResponseEntity.ok(dto);
    }
}