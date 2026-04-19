export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'warehouse' | 'patient' | 'doctor';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
