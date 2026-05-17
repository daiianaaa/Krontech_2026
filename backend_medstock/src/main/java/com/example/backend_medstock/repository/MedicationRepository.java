package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, UUID> {

    @Query("SELECT m FROM Medication m WHERE " +
            "(:name IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', CAST(:name AS String), '%'))) AND " +
            "(:category IS NULL OR m.category = :category) AND " +
            "(:isActive IS NULL OR m.isActive = :isActive)")
    List<Medication> filterMedications(@Param("name") String name,
                                       @Param("category") String category,
                                       @Param("isActive") Boolean isActive);

    @Query(value = "SELECT DISTINCT m.* FROM medications m " +
            "JOIN medication_batches b ON m.id = b.medication_id WHERE " +
            "b.hospital_id = :hospitalId AND " +
            "(:name IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', CAST(:name AS text), '%'))) AND " +
            "(:category IS NULL OR m.category = :category) AND " +
            "(:isActive IS NULL OR m.is_active = :isActive)",
            nativeQuery = true)
    List<Medication> filterByHospital(@Param("hospitalId") UUID hospitalId,
                                      @Param("name") String name,
                                      @Param("category") String category,
                                      @Param("isActive") Boolean isActive);
}