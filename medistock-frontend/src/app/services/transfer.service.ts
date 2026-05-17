import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';

import { CreateTransferRequest, TransferRequest, TransferStatus } from '../models/transfer';
import { AuthUser } from '../models/auth';

export interface BackendTransferRequest {
  senderHospitalId?: string;
  receiverHospitalId?: string;
  sourceHospitalId?: string;
  destinationHospitalId?: string;
  transactionType: string;
  medicationId?: string;
  batchId?: string;
  quantity: number;
  reason: string;
  status: string;
  medicationNameSnapshot?: string;
  medicationCategorySnapshot?: string;
  medicationCriticalitySnapshot?: string;
  batchNumber?: string;
  expectedSavings?: number;
  avoidedDisposalCost?: number;
  transportCost?: number;
  netSavings?: number;
  requiredStorageType?: string;
  createdBy?: string;
}

export interface BackendTransfer {
  transactionId: string;
  senderHospitalId?: string;
  receiverHospitalId?: string;
  sourceHospitalId?: string;
  destinationHospitalId?: string;
  transactionType?: string;
  medicationId?: string;
  batchId?: string;
  quantity?: number;
  reason?: string;
  status?: string;
  medicationNameSnapshot?: string;
  medicationCategorySnapshot?: string;
  medicationCriticalitySnapshot?: string;
  batchNumber?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransferService {
  private readonly API_URL = '/api/transfers';
  private readonly INBOX_URL = '/api/inbox';

  private readonly transfersSubject = new BehaviorSubject<TransferRequest[]>([]);
  readonly transfers$ = this.transfersSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadTransfers(currentUser?: AuthUser): void {
    this.http
      .get<BackendTransfer[]>(this.API_URL, { withCredentials: true })
      .subscribe({
        next: (data) => {
          const mapped = data
            .filter((t) => {
              if (!currentUser) return true;
              const hospId = currentUser.hospitalId;
              const userId = currentUser.id?.toString();
              
              return (hospId && (
                       t.senderHospitalId === hospId || 
                       t.receiverHospitalId === hospId ||
                       t.sourceHospitalId === hospId || 
                       t.destinationHospitalId === hospId
                     )) || 
                     (userId && (
                       t.senderHospitalId === userId || 
                       t.receiverHospitalId === userId ||
                       t.sourceHospitalId === userId || 
                       t.destinationHospitalId === userId
                     ));
            })
            .map((t) => this.mapBackendToFrontend(t));
          this.transfersSubject.next(mapped);
        },
        error: (err) => console.error('Failed to load transfers', err)
      });
  }

  getTransfers(): TransferRequest[] {
    return this.transfersSubject.value;
  }

  createTransfer(
    request: CreateTransferRequest,
    requestedBy: string,
    currentUser?: AuthUser
  ): Observable<BackendTransfer> {
    const payload: BackendTransferRequest = {
      senderHospitalId: request.senderHospitalId || currentUser?.hospitalId,
      receiverHospitalId: request.receiverHospitalId,
      sourceHospitalId: request.sourceHospitalId || currentUser?.hospitalId,
      destinationHospitalId: request.destinationHospitalId,
      transactionType: (request.transactionType || 'request').toLowerCase(),
      medicationId: request.source.medicationId !== 'unknown'
        ? request.source.medicationId
        : undefined,
      batchId: request.batchId,
      quantity: request.quantity,
      reason: request.reason,
      status: 'pending',
      requiredStorageType: 'normal',
      expectedSavings: 0,
      avoidedDisposalCost: 0,
      transportCost: 0,
      netSavings: 0,
      medicationNameSnapshot: request.source.medicationName,
      medicationCategorySnapshot: request.source.category,
      medicationCriticalitySnapshot: request.source.criticality ? request.source.criticality.toLowerCase() : undefined,
      batchNumber: request.batchNumber,
      createdBy: currentUser?.id as string
    };

    return this.http
      .post<BackendTransfer>(this.API_URL, payload, { withCredentials: true })
      .pipe(
        tap((saved) => {
          const newTransfer = this.mapBackendToFrontend(saved);
          const current = this.transfersSubject.value;
          this.transfersSubject.next([newTransfer, ...current]);

          // Commented out to prevent duplication as there seems to be a DB trigger
          // this.createInboxMessage(saved, request, currentUser);
        })
      );
  }

  private createInboxMessage(
    savedTransfer: BackendTransfer,
    request: CreateTransferRequest,
    currentUser?: AuthUser
  ): void {
    // Logic: the notification recipient should be the "other" party
    // If I (current user) am the sender, notification goes to receiver.
    // If I (current user) am the receiver, notification goes to sender.
    
    const myId = currentUser?.id?.toString();
    const senderId = request.senderHospitalId; // This is now a UUID from the component
    const receiverId = request.receiverHospitalId; // This is now a UUID from the component
    
    // Default to receiverId if we are the sender, otherwise senderId
    const notificationRecipientId = (myId === senderId) ? receiverId : senderId;
    
    const type = (request.transactionType || 'request').toLowerCase();
    const isOffer = type === 'send';
    
    const inboxPayload = {
      transferRequestId: savedTransfer.transactionId,
      senderHospitalId: senderId,
      receiverHospitalId: notificationRecipientId, // This is who gets the message in their inbox
      sourceHospitalId: request.sourceHospitalId || senderId,
      destinationHospitalId: request.destinationHospitalId || receiverId,
      transactionType: type,
      medicationId: savedTransfer.medicationId,
      batchId: request.batchId,
      quantity: request.quantity,
      reason: request.reason,
      subject: `Transfer ${isOffer ? 'offer' : 'request'}: ${request.source.medicationName}`,
      message: `A transfer ${isOffer ? 'offer was sent' : 'request has been initiated'} for ${request.quantity} unit(s) of ${request.source.medicationName}. Reason: ${request.reason}`,
      transferStatus: 'pending',
      inboxStatus: 'unread'
    };

    this.http
      .post(this.INBOX_URL, inboxPayload, { withCredentials: true })
      .subscribe({
        error: (err) => console.error('Failed to create inbox message', err)
      });
  }

  updateStatus(id: number, status: TransferStatus, currentUserId?: string): void {
    const transfer = this.transfersSubject.value.find((t) => t.id === id);
    const backendId = (transfer as any)?.backendId;
    
    if (backendId) {
      this.updateStatusByBackendId(backendId, status, currentUserId).subscribe();
    } else {
      // Local only update if no backend ID
      this.transfersSubject.next(
        this.transfersSubject.value.map((t) =>
          t.id === id ? { ...t, status } : t
        )
      );
    }
  }

  updateStatusByBackendId(backendId: string, status: TransferStatus, currentUserId?: string): Observable<any> {
    console.log(`Updating transfer ${backendId} to ${status} by user ${currentUserId}`);
    let obs: Observable<any>;
    
    if (status === 'APPROVED') {
      const userId = currentUserId;
      const url = `${this.API_URL}/${backendId}/accept?acceptedByUserId=${userId || ''}`;
      obs = this.http.put(url, {}, { withCredentials: true });
    } else if (status === 'REJECTED') {
      const userId = currentUserId;
      const url = `${this.API_URL}/${backendId}/reject?rejectedByUserId=${userId || ''}`;
      // Send empty object as payload for now, or could send { rejectionReason: '...' }
      obs = this.http.put(url, {}, { withCredentials: true });
    } else {
      const statusMap: Record<TransferStatus, string> = {
        PENDING: 'pending',
        APPROVED: 'accepted',
        REJECTED: 'rejected',
        COMPLETED: 'completed'
      };
      obs = this.http.put(`${this.API_URL}/${backendId}`, { status: statusMap[status] }, { withCredentials: true });
    }

    return obs.pipe(
      tap(() => {
        // Sync local state
        const current = this.transfersSubject.value;
        const updated = current.map(t => (t as any).backendId === backendId ? { ...t, status } : t);
        this.transfersSubject.next(updated);
      })
    );
  }

  private mapBackendToFrontend(t: BackendTransfer): TransferRequest & { backendId?: string } {
    console.log('Mapping backend transfer:', t);
    return {
      id: this.uuidToInt(t.transactionId),
      backendId: t.transactionId,
      medicationId: t.medicationId || '',
      medicationName: t.medicationNameSnapshot || (t.medicationId ? `Medication (${t.medicationId.slice(0,8)})` : 'Manual Transfer'),
      batchNumber: t.batchNumber,
      fromFacility: t.senderHospitalId || t.sourceHospitalId || '',
      toFacility: t.receiverHospitalId || t.destinationHospitalId || '',
      senderHospitalId: t.senderHospitalId || t.sourceHospitalId,
      receiverHospitalId: t.receiverHospitalId || t.destinationHospitalId,
      quantity: t.quantity || 0,
      reason: t.reason || '',
      status: this.mapBackendStatus(t.status),
      requestedBy: t.createdBy || '',
      requestedAt: t.createdAt || '',
      estimatedSavedValue: 0
    } as any;
  }

  private mapBackendStatus(status?: string): TransferStatus {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'APPROVED';
      case 'rejected': return 'REJECTED';
      case 'completed': return 'COMPLETED';
      default: return 'PENDING';
    }
  }

  private uuidToInt(uuid?: string): number {
    if (!uuid) return Math.floor(Math.random() * 100000);
    const hex = uuid.replace(/-/g, '').slice(-8);
    return parseInt(hex, 16) % 1000000;
  }
}