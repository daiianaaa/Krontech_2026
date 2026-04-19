import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTransfer, TransferSuggestion } from '../models';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly API = '/api/transfers';

  constructor(private http: HttpClient) {}

  getTransfers(status?: string): Observable<StockTransfer[]> {
    const params = status ? { status } : undefined;
    return this.http.get<StockTransfer[]>(this.API, { params });
  }

  getTransferById(id: string): Observable<StockTransfer> {
    return this.http.get<StockTransfer>(`${this.API}/${id}`);
  }

  createTransfer(transfer: Partial<StockTransfer>): Observable<StockTransfer> {
    return this.http.post<StockTransfer>(this.API, transfer);
  }

  approveTransfer(id: string): Observable<StockTransfer> {
    return this.http.patch<StockTransfer>(`${this.API}/${id}/approve`, {});
  }

  rejectTransfer(id: string, reason: string): Observable<StockTransfer> {
    return this.http.patch<StockTransfer>(`${this.API}/${id}/reject`, { reason });
  }

  completeTransfer(id: string): Observable<StockTransfer> {
    return this.http.patch<StockTransfer>(`${this.API}/${id}/complete`, {});
  }

  /** AI-generated transfer suggestions to prevent expiry waste */
  getSuggestions(): Observable<TransferSuggestion[]> {
    return this.http.get<TransferSuggestion[]>(`${this.API}/suggestions`);
  }

  acceptSuggestion(suggestion: TransferSuggestion): Observable<StockTransfer> {
    return this.http.post<StockTransfer>(`${this.API}/accept-suggestion`, suggestion);
  }
}
