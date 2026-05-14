package com.example.backend_medstock.repository;

import com.example.backend_medstock.model.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, UUID> {

}