export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  distance?: number; // km from patient
  openingHours: string;
  isOpen: boolean;
  rating: number;
  availableVaccines: AvailableVaccine[];
}

export interface AvailableVaccine {
  productId: string;
  vaccineName: string;
  availableQuantity: number;
  nextAvailableSlot?: string;
  pricePerDose?: number;
}
