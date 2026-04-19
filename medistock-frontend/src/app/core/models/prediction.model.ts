export interface DemandPrediction {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  predictedDemand: number;
  currentStock: number;
  recommendedOrder: number;
  confidence: number; // 0-100%
  forecastPeriodDays: number;
  algorithm: 'linear_regression' | 'arima' | 'moving_average' | 'ml_ensemble';
  historicalData: DemandDataPoint[];
  forecastData: DemandDataPoint[];
  generatedAt: string;
}

export interface DemandDataPoint {
  date: string;
  value: number;
  isActual: boolean;
}

export interface WastePrevention {
  totalWastePrevented: number; // units
  valueWastePrevented: number; // EUR
  transfersInitiated: number;
  redistributionSuccessRate: number; // %
  periodDays: number;
}
