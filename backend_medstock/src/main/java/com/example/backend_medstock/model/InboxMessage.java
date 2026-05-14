package com.example.backend_medstock.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inbox_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InboxMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "inbox_id")
    private UUID inboxId;

    @Column(name = "transfer_request_id")
    private UUID transferRequestId;

    @Column(name = "sender_hospital_id")
    private UUID senderHospitalId;

    @Column(name = "receiver_hospital_id")
    private UUID receiverHospitalId;

    @Column(name = "source_hospital_id")
    private UUID sourceHospitalId;

    @Column(name = "destination_hospital_id")
    private UUID destinationHospitalId;

    // Tip custom Postgres
    @Column(name = "transaction_type", columnDefinition = "manual_transfer_type")
    @ColumnTransformer(write = "?::manual_transfer_type")
    private String transactionType;

    @Column(name = "medication_id")
    private UUID medicationId;

    @Column(name = "batch_id")
    private UUID batchId;

    private Integer quantity;

    private String reason;

    private String subject;

    private String message;

    // Tip custom Postgres
    @Column(name = "transfer_status", columnDefinition = "recommendation_status")
    @ColumnTransformer(write = "?::recommendation_status")
    private String transferStatus;

    // Tip custom Postgres
    @Column(name = "inbox_status", columnDefinition = "inbox_message_status")
    @ColumnTransformer(write = "?::inbox_message_status")
    private String inboxStatus;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.inboxStatus == null) {
            this.inboxStatus = "unread"; // Default status la creare
        }
    }
}