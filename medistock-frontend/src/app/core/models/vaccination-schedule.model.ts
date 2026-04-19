export type VaccineStatus = 'completed' | 'scheduled' | 'overdue' | 'upcoming';

export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccineName: string;
  productId: string;
  dose: number;
  administeredDate?: string;
  scheduledDate?: string;
  batchNumber?: string;
  pharmacyName?: string;
  doctorName?: string;
  status: VaccineStatus;
  nextDoseDate?: string;
  nextDoseDays?: number;
  certificate?: string; // URL to vaccination certificate
}

export interface VaccinationScheme {
  vaccineId: string;
  vaccineName: string;
  totalDoses: number;
  intervalDays: number[]; // days between doses
  records: VaccinationRecord[];
  completionPercentage: number;
}
