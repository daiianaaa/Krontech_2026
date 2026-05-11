export interface Medicament {
    id: number;
    name: string;
    category: string;
    stock: number;
    expiryDate: string;
    daysUntilExpiry: number;
    batchNumber: string;
    price: number;
    supplier: string;
}