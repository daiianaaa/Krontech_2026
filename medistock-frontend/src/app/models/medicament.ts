export interface Medicament {
    id: string;
  
    code: string;
    name: string;
    genericName: string;
  
    category: string;
    therapeuticClass: string;
  
    form: string;
    concentration: string;
    unit: string;
  
    criticality: string;
    requiredStorageType: string;
  
    controlledSubstance: boolean;
  
    standardDailyUsagePerPatient?: number;
    defaultMinBufferDays?: number;
    defaultTargetBufferDays?: number;
  
    isActive: boolean;
    totalStock?: number;
  
    createdAt?: string;
    updatedAt?: string;
  }