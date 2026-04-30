package com.example.backend_medstock.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Această metodă interceptează eroarea aruncată de Spring când parola sau username-ul sunt greșite
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<?> handleBadCredentialsException(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "status", 401,
                        "eroare", "Username sau parolă incorectă. Te rugăm să încerci din nou."
                ));
    }

    // Un fallback general: dacă apare ORICE altă eroare neprevăzută în aplicație,
    // nu lăsăm serverul să trimită acel "trace" urât către frontend.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "status", 500,
                        "eroare", "A apărut o problemă internă pe server. Contactează administratorul."
                ));
    }
}