export type AlertType = 'expiry' | 'low_stock' | 'overstock' | 'transfer_available' | 'recall' | 'cold_chain_breach';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  batchNumber?: string;
  expiryDate?: string;
  daysToExpiry?: number;
  quantity?: number;
  isRead: boolean;
  isActioned: boolean;
  createdAt: string;
  actionedAt?: string;
  actionedBy?: string;
}

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  info: number;
}
