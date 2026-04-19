export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface VaccineBooking {
  id: string;
  patientId: string;
  patientName: string;
  productId: string;
  vaccineName: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  dose: number; // 1st, 2nd, booster etc.
  status: BookingStatus;
  confirmationCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remainingSlots: number;
}
