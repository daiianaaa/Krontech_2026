export interface AiPrediction {
  id: string;
  aiRunId: string;
  hospitalId: string;
  medicationId: string;
  predictionType: string;   // 'SHORTAGE_RISK' | 'EXPIRY_RISK' | ...
  riskLevel: string;        // 'OK' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  predictedDailyDemand: number;
  stockCoverageDays: number;
  daysToExpiry: number | null;
  estimatedExpiredQuantity: number | null;
  confidenceScore: number;
  recommendationText: string;
  inputSnapshot: AiInputSnapshot | null;
  createdAt: string;
}

export interface AiInputSnapshot {
  current_stock?: number;
  avg_7d?: number;
  avg_30d?: number;
  avg_90d?: number;
  target_buffer_days?: number;
  incoming_restock_quantity?: number;
  first_restock_days?: number;
}

export interface PredictionSummary {
  predictionType: string;
  riskLevel: string;
  avgDailyDemand: number;
  avgCoverageDays: number;
  totalExpiredQty: number;
  maxConfidence: number;
  predictionCount: number;
}

export interface TransferRecommendation {
  recommendationId: string;
  status: string;
  riskLevel: string;

  sourceHospitalId: string;
  sourceHospitalName: string;
  sourceCity: string;
  sourceCounty: string;

  destinationHospitalId: string;
  destinationHospitalName: string;
  destinationCity: string;
  destinationCounty: string;

  medicationId: string;
  medicationName: string;
  medicationCategory: string;
  medicationCode: string;

  batchId: string;
  batchNumber: string;
  sourceBatchCurrentQuantity: number;
  recommendedQuantity: number;

  expiryDate: string;
  recommendedTransferDate: string;

  reason: string;
  confidenceScore: number;

  expectedSavings: number;
  avoidedDisposalCost: number;
  transportCost: number;
  netSavings: number;
  distanceKm: number;

  createdAt: string;
  updatedAt: string;
}

export interface AiDashboardSummary {
  high_expiry_risks: number;
  mid_expiry_risks: number;
  high_shortage_risks: number;
  mid_shortage_risks: number;
  pending_transfer_recommendations: number;
  estimated_pending_savings: number;
  new_alerts: number;
  active_restock_orders: number;
  last_ai_prediction_at: string | null;
  last_successful_ai_run_at: string | null;
}
