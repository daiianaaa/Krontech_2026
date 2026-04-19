import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Alert, AlertStats } from '../models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly API = '/api/alerts';

  readonly alerts = signal<Alert[]>([]);
  readonly stats = signal<AlertStats>({ total: 0, unread: 0, critical: 0, warning: 0, info: 0 });

  constructor(private http: HttpClient) {}

  getAlerts(filters?: { severity?: string; type?: string; isRead?: boolean }): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.API, { params: filters as Record<string, string> })
      .pipe(tap(a => this.alerts.set(a)));
  }

  getStats(): Observable<AlertStats> {
    return this.http.get<AlertStats>(`${this.API}/stats`)
      .pipe(tap(s => this.stats.set(s)));
  }

  markAsRead(alertId: string): Observable<Alert> {
    return this.http.patch<Alert>(`${this.API}/${alertId}/read`, {}).pipe(
      tap(() => this.alerts.update(list => list.map(a => a.id === alertId ? { ...a, isRead: true } : a)))
    );
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.API}/mark-all-read`, {}).pipe(
      tap(() => this.alerts.update(list => list.map(a => ({ ...a, isRead: true }))))
    );
  }

  actionAlert(alertId: string, action: 'approve_transfer' | 'dismiss' | 'escalate'): Observable<Alert> {
    return this.http.post<Alert>(`${this.API}/${alertId}/action`, { action });
  }
}
