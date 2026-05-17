import { Medicament } from './medicament';

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface FacilityStock {
    facilityId: number;
    facilityName: string;
    medicationId: string;
    medicationName: string;
    category: string;
    criticality?: string;
    isActive?: boolean;
}

export interface TransferRequest {
    id: number;
    backendId: string;
    medicationId: string;
    medicationName: string;
    batchNumber?: string;
    quantity: number;
    fromFacility: string;
    toFacility: string;
    senderHospitalId?: string;
    receiverHospitalId?: string;
    reason: string;
    status: TransferStatus;
    requestedBy: string;
    requestedAt: string;
    estimatedSavedValue: number;
}

export interface CreateTransferRequest {
    source: FacilityStock;
    batchNumber?: string;
    batchId?: string;
    senderHospitalId?: string;
    receiverHospitalId?: string;
    sourceHospitalId?: string;
    destinationHospitalId?: string;
    toFacility: string;
    quantity: number;
    reason: string;
    transactionType?: string;
}

export function mapMedicationToFacilityStock(
    medication: Medicament,
    facilityId = 1,
    facilityName = 'Central Hospital Pharmacy'
): FacilityStock {
    return {
        facilityId,
        facilityName,
        medicationId: medication.id,
        medicationName: medication.name,
        category: medication.category,
        criticality: medication.criticality,
        isActive: medication.isActive
    };
}