package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "medication")
@Data // Generează Getters, Setters, toString, equals
@NoArgsConstructor // Constructor fără argumente
@AllArgsConstructor // Constructor cu toate argumentele
@Builder
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;

    private Integer stock;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "batch_number")
    private String batchNumber;

    private Double price;

    private String supplier;

    private String status;

    @Column(name = "received_date")
    private LocalDate receivedDate;
}