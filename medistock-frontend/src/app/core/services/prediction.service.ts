import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandPrediction, WastePrevention } from '../models';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly API = '/api/predictions';

  constructor(private http: HttpClient) {}

  getDemandForecast(productId: string, locationId: string, days = 30): Observable<DemandPrediction> {
    return this.http.get<DemandPrediction>(`${this.API}/demand`, {
      params: { productId, locationId, days: String(days) }
    });
  }

  getAllForecasts(locationId?: string): Observable<DemandPrediction[]> {
    const params = locationId ? { locationId } : undefined;
    return this.http.get<DemandPrediction[]>(`${this.API}/demand/all`, { params });
  }

  getWastePreventionStats(periodDays = 30): Observable<WastePrevention> {
    return this.http.get<WastePrevention>(`${this.API}/waste-prevention`, {
      params: { days: String(periodDays) }
    });
  }

  triggerReanalysis(locationId: string): Observable<{ jobId: string; estimatedCompletionMs: number }> {
    return this.http.post<{ jobId: string; estimatedCompletionMs: number }>(`${this.API}/reanalyze`, { locationId });
  }
}
