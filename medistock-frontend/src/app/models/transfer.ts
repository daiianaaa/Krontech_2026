import { Medicament } from './medicament';

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface FacilityStock {
    facilityId: number;
    facilityName: string;
    city: string;
    medicationId: number;
    medicationName: string;
    category: string;
    batchNumber: string;
    stock: number;
    expiryDate: string;
    daysUntilExpiry: number;
    price: number;
}

export interface TransferRequest {
    id: number;
    medicationId: number;
    medicationName: string;
    batchNumber: string;
    quantity: number;
    fromFacility: string;
    toFacility: string;
    reason: string;
    status: TransferStatus;
    requestedBy: string;
    requestedAt: string;
    estimatedSavedValue: number;
}

export interface CreateTransferRequest {
    source: FacilityStock;
    toFacility: string;
    quantity: number;
    reason: string;
}

export function mapMedicationToFacilityStock(
    medication: Medicament,
    facilityId = 1,
    facilityName = 'Central Hospital Pharmacy',
    city = 'Cluj-Napoca'
): FacilityStock {
    return {
        facilityId,
        facilityName,
        city,
        medicationId: medication.id,
        medicationName: medication.name,
        category: medication.category,
        batchNumber: medication.batchNumber,
        stock: medication.stock,
        expiryDate: medication.expiryDate,
        daysUntilExpiry: medication.daysUntilExpiry,
        price: medication.price
    };
}