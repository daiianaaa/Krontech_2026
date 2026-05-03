package com.example.backend_medstock.controller;

import com.example.backend_medstock.service.CustomUserDetailsService;
import com.example.backend_medstock.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, CustomUserDetailsService userDetailsService, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }

    public record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {

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
}