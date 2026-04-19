import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InventoryItem, StockSummary } from '../models';

export interface InventoryFilter {
  locationId?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly API = '/api/inventory';

  readonly summary = signal<StockSummary | null>(null);
  readonly isLoading = signal(false);

  constructor(private http: HttpClient) {}

  getInventory(filters: InventoryFilter = {}): Observable<{ items: InventoryItem[]; total: number }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v != null) params = params.set(k, String(v)); });
    this.isLoading.set(true);
    return this.http.get<{ items: InventoryItem[]; total: number }>(this.API, { params })
      .pipe(tap(() => this.isLoading.set(false)));
  }

  getItemById(id: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.API}/${id}`);
  }

  getSummary(locationId?: string): Observable<StockSummary> {
    const params = locationId ? new HttpParams().set('locationId', locationId) : undefined;
    return this.http.get<StockSummary>(`${this.API}/summary`, { params })
      .pipe(tap(s => this.summary.set(s)));
  }

  updateReorderLevel(itemId: string, level: number): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(`${this.API}/${itemId}/reorder-level`, { level });
  }

  exportCsv(filters: InventoryFilter = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v != null) params = params.set(k, String(v)); });
    return this.http.get(`${this.API}/export`, { params, responseType: 'blob' });
  }
}
