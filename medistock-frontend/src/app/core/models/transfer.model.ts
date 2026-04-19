export type TransferStatus = 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected' | 'cancelled';

export interface StockTransfer {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  reason: 'expiry_prevention' | 'demand_rebalance' | 'emergency' | 'manual';
  status: TransferStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  estimatedSavings: number; // EUR value of waste prevented
  notes?: string;
}

export interface TransferSuggestion {
  productId: string;
  productName: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  quantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  expiryDate: string;
  daysToExpiry: number;
  estimatedSavings: number;
  reason: string;
}
