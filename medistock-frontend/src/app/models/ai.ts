export type RiskLevel = 'OK' | 'LOW' | 'MID' | 'HIGH';

export interface ExpiryRisk {
  medicationName: string;
  batchNumber: string;
  currentStock: number;
  daysToExpiry: number;
  estimatedExpiredQuantity: number;
  predictedDailyDemand: number;
  riskLevel: RiskLevel;
}

export interface ShortageRisk {
  medicationName: string;
  batchNumber: string;
  currentStock: number;
  predictedDailyDemand: number;
  stockCoverageDays: number;
  riskLevel: RiskLevel;
}

export interface AiRecommendation {
  id: number;
  medicationName: string;
  batchNumber: string;
  fromFacility: string;
  toFacility: string;
  recommendedQuantity: number;
  riskLevel: RiskLevel;
  reason: string;
  expectedSavingsRon: number;
  avoidedDisposalCostRon: number;
  transportCostRon: number;
  netSavings: number;
  confidenceScore: number;
  recommendedTransferDate: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AiSummary {
  highExpiryRiskCount: number;
  highShortageRiskCount: number;
  pendingRecommendationsCount: number;
  estimatedSavingsRon: number;
}