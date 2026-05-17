export type UserRole = 'ADMIN' | 'PHARMACIST' | 'PROVIDER' | 'MANAGER';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
}

export interface AuthUser {
  id?: string | number;
  username: string;
  role: UserRole;
  institutionName?: string;
  hospitalId?: string;
}