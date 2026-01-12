export interface UserProfile {
  userId: number;
  email: string;
  phoneNumber?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  roleName: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string; // ISO string
  user: UserProfile;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phoneNumber?: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileRequest {
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

