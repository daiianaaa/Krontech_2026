import { TransferRequest } from '../models/transfer';

export const TRANSFERS_MOCK: TransferRequest[] = [
    {
        id: 1,
        medicationId: 3,
        medicationName: 'Influenza Vaccine',
        batchNumber: 'VAC-2026-A1',
        quantity: 25,
        fromFacility: 'Spitalul Clinic Județean Timișoara',
        toFacility: 'Institutul Oncologic București',
        reason: 'Batch expires soon and receiving unit has active demand.',
        status: 'PENDING',
        requestedBy: 'admin',
        requestedAt: '2026-05-01 10:30',
        estimatedSavedValue: 1875
    },
    {
        id: 2,
        medicationId: 8,
        medicationName: 'Ibuprofen',
        batchNumber: 'IBU-008',
        quantity: 40,
        fromFacility: 'Spitalul Clinic Județean de Urgență Brașov',
        toFacility: 'Spitalul Universitar de Urgență București',
        reason: 'Low stock alert in destination facility.',
        status: 'APPROVED',
        requestedBy: 'pharmacist',
        requestedAt: '2026-04-30 16:15',
        estimatedSavedValue: 920
    }
];

export const DESTINATION_FACILITIES_MOCK = [
    'Spitalul Clinic Județean de Urgență Brașov',
    'Spitalul Clinic Județean de Urgență Cluj-Napoca',
    'Spitalul Universitar de Urgență București',
    'Spitalul Clinic Colentina București',
    'Spitalul Clinic de Urgență Târgu Mureș',
    'Spitalul Clinic Județean Timișoara',
    'Institutul Oncologic București',
    'Spitalul de Boli Infecțioase Iași'
];
