package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medication_batches")
@Data
public class MedicationBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "medication_id")
    private UUID medicationId;

    @Column(name = "hospital_id")
    private UUID hospitalId;

    @Column(name = "batch_number")
    private String batchNumber;

    @Column(name = "quantity_current")
    private Integer quantityCurrent;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;
}
