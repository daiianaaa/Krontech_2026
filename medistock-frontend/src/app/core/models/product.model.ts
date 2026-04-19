export type ProductCategory = 'vaccine' | 'antibiotic' | 'analgesic' | 'antiviral' | 'supplement' | 'other';

export interface Product {
  id: string;
  name: string;
  genericName: string;
  category: ProductCategory;
  manufacturer: string;
  sku: string;
  barcode?: string;
  unit: string; // e.g. 'vials', 'tablets', 'bottles'
  requiresColdChain: boolean;
  minTemperature?: number; // Celsius
  maxTemperature?: number;
  description?: string;
  imageUrl?: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  locationId: string;
  supplierId: string;
  receivedAt: string;
  costPerUnit: number;
  status: 'active' | 'quarantine' | 'recalled' | 'expired';
}
