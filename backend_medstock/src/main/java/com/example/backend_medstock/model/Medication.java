package com.example.backend_medstock.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    @NotBlank(message = "Numele medicamentului este obligatoriu")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Categoria medicamentului este obligatorie")
    private String category;

    @Min(value = 0, message = "Stocul nu poate fi negativ")
    @Max(value = 999999, message = "Stocul maxim admis este de 999999")
    private Integer stock;

    @NotNull(message = "Data de expirare este obligatorie")
    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @NotBlank(message = "Numele lotului este obligatoriu")
    @Column(name = "batch_number")
    private String batchNumber;

    @Min(value = 0, message = "Prețul nu poate fi negativ")
    @Max(value = 999999, message = "Prețul maxim admis este de 999999")
    private Double price;

    private String supplier;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @PrePersist
    protected void onCreate() {
        if (this.receivedDate == null) {
            this.receivedDate = LocalDate.now();
        }
    }

    @AssertTrue(message = "Anul de expirare trebuie să fie mai mare decat 1900.")
    @JsonIgnore
    public boolean isExpiryYearValid() {
        if (this.expiryDate == null) {
            return false;
        }
        int year = this.expiryDate.getYear();
        return year >= 1900 && year <= 3000;
    }

    @AssertTrue(message = "Anul primirii trebuie să fie mai mare decat 1900.")
    @JsonIgnore
    public boolean isReceivedYearValid() {
        if (this.receivedDate == null) {
            return true;
        }
        int year = this.receivedDate.getYear();
        return year >= 1900 && year <= 3000;
    }
}