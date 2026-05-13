export interface MedicationBatch {
    id: number | string;
  
    medicationId: number | string;
    medicationName: string;
    genericName?: string;
    category: string;
    form?: string;
    concentration?: string;
    unit?: string;
  
    hospitalId: number | string;
    hospitalName: string;
  
    batchNumber: string;
    quantityInitial: number;
    quantityCurrent: number;
  
    expiryDate: string;
    receivedDate?: string;
  
    supplierName?: string;
    purchasePricePerUnit: number;
    disposalCostPerUnit?: number;
  
    storageCondition: 'normal' | 'cold' | 'frozen' | 'controlled';
    status: 'available' | 'reserved' | 'transferred' | 'expired' | 'disposed' | 'quarantined';
  }