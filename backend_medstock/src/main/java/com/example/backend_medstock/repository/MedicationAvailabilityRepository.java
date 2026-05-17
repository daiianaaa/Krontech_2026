package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.MedicationAvailabilityView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationAvailabilityRepository extends JpaRepository<MedicationAvailabilityView, UUID> {
    List<MedicationAvailabilityView> findByHospitalNameContainingIgnoreCase(String hospitalName);

    @org.springframework.data.jpa.repository.Query("SELECT v.medicationId, SUM(v.quantityCurrent) FROM MedicationAvailabilityView v WHERE v.hospitalId = :hospitalId GROUP BY v.medicationId")
    List<Object[]> sumQuantityByHospitalGroupedByMedication(@org.springframework.data.repository.query.Param("hospitalId") UUID hospitalId);

    @org.springframework.data.jpa.repository.Query("SELECT v.medicationId, SUM(v.quantityCurrent) FROM MedicationAvailabilityView v GROUP BY v.medicationId")
    List<Object[]> sumQuantityGroupedByMedication();
}
