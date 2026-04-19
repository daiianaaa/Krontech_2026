export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  batches: InventoryBatch[];
  lastUpdated: string;
}

export interface InventoryBatch {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  daysToExpiry: number;
  status: 'safe' | 'warning' | 'critical' | 'expired';
}

export interface StockSummary {
  totalItems: number;
  totalValue: number;
  criticalItems: number;
  expiringItems: number;
  overstockedItems: number;
  wasteValue: number;
  efficiencyScore: number; // 0-100
}
