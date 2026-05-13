export type UserRole = 'ADMIN' | 'PHARMACIST' | 'PROVIDER';

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

}