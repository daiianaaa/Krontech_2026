export type UserRole = 'ADMIN' | 'PHARMACIST' | 'PROVIDER';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
}

export interface AuthUser {
  username: string;
  role: UserRole;
}