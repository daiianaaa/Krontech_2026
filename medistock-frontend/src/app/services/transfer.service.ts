import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CreateTransferRequest, TransferRequest, TransferStatus } from '../models/transfer';

@Injectable({
    providedIn: 'root'
})
export class TransferService {
    private readonly transfersSubject = new BehaviorSubject<TransferRequest[]>([]);
    readonly transfers$ = this.transfersSubject.asObservable();

    getTransfers(): TransferRequest[] {
        return this.transfersSubject.value;
    }

    createTransfer(request: CreateTransferRequest, requestedBy: string): TransferRequest {
        const current = this.transfersSubject.value;

        const transfer: TransferRequest = {
            id: this.getNextId(),
            medicationId: request.source.medicationId,
            medicationName: request.source.medicationName,
            batchNumber: request.batchNumber,
            fromFacility: request.source.facilityName,
            toFacility: request.toFacility,
            quantity: request.quantity,
            reason: request.reason,
            status: 'PENDING',
            requestedBy,
            requestedAt: this.formatDateTime(new Date()),
            estimatedSavedValue: 0
        };

        this.transfersSubject.next([transfer, ...current]);
        return transfer;
    }

    updateStatus(id: number, status: TransferStatus): void {
        this.transfersSubject.next(
            this.transfersSubject.value.map((transfer) =>
                transfer.id === id ? { ...transfer, status } : transfer
            )
        );
    }

    private getNextId(): number {
        return Math.max(0, ...this.transfersSubject.value.map((transfer) => transfer.id)) + 1;
    }

    private formatDateTime(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
}