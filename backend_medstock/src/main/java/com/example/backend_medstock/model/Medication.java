package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "medication")
@Data
@NoArgsConstructor
@AllArgsConstructor
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

    @Column(name = "received_date")
    private LocalDate receivedDate;

    // Verifică dacă data primirii este completată; dacă nu, pune data curentă.
    @PrePersist
    protected void onCreate() {
        if (this.receivedDate == null) {
            this.receivedDate = LocalDate.now();
        }
    }
}