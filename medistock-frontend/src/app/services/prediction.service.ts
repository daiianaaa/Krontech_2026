import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  AiPrediction,
  AiDashboardSummary,
  PredictionSummary,
  TransferRecommendation,
} from '../models/prediction';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly RECOMMENDATIONS_API = '/api/recommendations';

  constructor(private http: HttpClient) {}

  getPredictions(medicationId: string): Observable<AiPrediction[]> {
    return of([]);
  }

  getPredictionSummary(medicationId: string): Observable<PredictionSummary[]> {
    return of([]);
  }

  getAllTransferRecommendations(): Observable<TransferRecommendation[]> {
    return this.http.get<TransferRecommendation[]>(this.RECOMMENDATIONS_API, { withCredentials: true });
  }

  getTransferRecommendationById(id: string): Observable<TransferRecommendation> {
    return this.http.get<TransferRecommendation>(`${this.RECOMMENDATIONS_API}/${id}`, { withCredentials: true });
  }

  getDashboardSummary(): Observable<AiDashboardSummary> {
    return of({
      high_expiry_risks: 0,
      mid_expiry_risks: 0,
      high_shortage_risks: 0,
      mid_shortage_risks: 0,
      pending_transfer_recommendations: 0,
      estimated_pending_savings: 0,
      new_alerts: 0,
      active_restock_orders: 0,
      last_ai_prediction_at: null,
      last_successful_ai_run_at: null
    });
  }

  acceptRecommendation(id: string, userId: string): Observable<any> {
    return this.http.put(`${this.RECOMMENDATIONS_API}/${id}/accept?acceptedByUserId=${userId}`, {}, { withCredentials: true });
  }
}