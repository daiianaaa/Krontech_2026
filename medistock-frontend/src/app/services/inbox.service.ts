import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface InboxMessage {
  inboxId?: string;
  transferRequestId?: string;
  senderHospitalId?: string;
  receiverHospitalId?: string;
  sourceHospitalId?: string;
  destinationHospitalId?: string;
  transactionType?: string;
  medicationId?: string;
  quantity?: number;
  reason?: string;
  subject?: string;
  message?: string;
  transferStatus?: string;
  inboxStatus?: string;
  createdAt?: string;
  readAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private readonly API_URL = '/api/inbox';

  private readonly messagesSubject = new BehaviorSubject<InboxMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadMessages(hospitalId?: string): void {
    // The new backend refactor removed the /hospital/{id} endpoint.
    // We fetch all and filter in frontend to maintain isolation.
    this.http
      .get<InboxMessage[]>(this.API_URL, { withCredentials: true })
      .subscribe({
        next: (data) => {
          if (hospitalId) {
            // Filter messages where the hospital is the receiver (for inbox)
            const filtered = data.filter(m => 
              m.receiverHospitalId === hospitalId
            );
            this.messagesSubject.next(filtered);
          } else {
            this.messagesSubject.next(data);
          }
        },
        error: (err) => console.error('Failed to load inbox messages', err)
      });
  }

  getMessages(): InboxMessage[] {
    return this.messagesSubject.value;
  }

  get unreadCount(): number {
    return this.messagesSubject.value.filter(
      (m) => m.inboxStatus === 'unread'
    ).length;
  }

  markAsRead(id: string): Observable<InboxMessage> {
    return this.http
      .put<InboxMessage>(`${this.API_URL}/${id}/read`, {}, { withCredentials: true })
      .pipe(
        tap((updated) => {
          const current = this.messagesSubject.value.map((m) =>
            m.inboxId === id ? { ...m, inboxStatus: 'read', readAt: updated.readAt } : m
          );
          this.messagesSubject.next(current);
        })
      );
  }

  deleteMessage(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.API_URL}/${id}`, { withCredentials: true })
      .pipe(
        tap(() => {
          this.messagesSubject.next(
            this.messagesSubject.value.filter((m) => m.inboxId !== id)
          );
        })
      );
  }
}