export type UserRole = 'ADMIN' | 'PHARMACIST' | 'PROVIDER';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthUser {
    id: number;
    username: string;
    role: UserRole;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}