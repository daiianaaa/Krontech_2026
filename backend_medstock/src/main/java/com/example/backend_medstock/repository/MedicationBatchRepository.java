package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.MedicationBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationBatchRepository extends JpaRepository<MedicationBatch, UUID> {
    List<MedicationBatch> findByMedicationIdAndQuantityCurrentGreaterThanOrderByExpiryDateAsc(UUID medicationId, Integer quantity);
    
    List<MedicationBatch> findByMedicationIdAndHospitalIdAndQuantityCurrentGreaterThanOrderByExpiryDateAsc(UUID medicationId, UUID hospitalId, Integer quantity);

    @org.springframework.data.jpa.repository.Query("SELECT b.medicationId, SUM(b.quantityCurrent) FROM MedicationBatch b WHERE b.hospitalId = :hospitalId GROUP BY b.medicationId")
    List<Object[]> sumQuantityByHospitalGroupedByMedication(@org.springframework.data.repository.query.Param("hospitalId") UUID hospitalId);

    @org.springframework.data.jpa.repository.Query("SELECT b.medicationId, SUM(b.quantityCurrent) FROM MedicationBatch b GROUP BY b.medicationId")
    List<Object[]> sumQuantityGroupedByMedication();
}
