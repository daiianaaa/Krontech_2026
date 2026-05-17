package com.example.backend_medstock.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.Immutable;
import java.util.UUID;

@Entity
@Immutable
@Table(name = "v_medication_availability_by_institution")
@Data
public class MedicationAvailabilityView {

    @Id
    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "medication_id")
    private UUID medicationId;

    @Column(name = "medication_name")
    private String medicationName;

    @Column(name = "institution_id")
    private UUID hospitalId;

    @Column(name = "institution_name")
    private String hospitalName;

    @Column(name = "quantity_current")
    private Integer quantityCurrent;

    @Column(name = "medication_category")
    private String category;
}
