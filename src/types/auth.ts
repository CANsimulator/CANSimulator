/**
 * Authentication Types
 * TypeScript interfaces for authentication state management
 */

export type UserType = 'beginner' | 'intermediate' | 'advanced';

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe: boolean;
}

export type UserRole = 'guest' | 'user' | 'premium' | 'admin';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: UserRole;
    commandLimit: number;
    userType: UserType;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    createdAt: string;
    currentPlan: string;
    subscriptionTier: string;
    subscriptionId: string | null;
    commandsUsedThisMonth: number;
    monthlyCommandLimit: number;
    lastQuotaReset: string;
    tierUpdatedAt: string;
}

export interface RateLimitInfo {
    attemptsRemaining: number;
    isLocked: boolean;
    lockoutEndTime: number | null;
    lastAttemptTime: number | null;
}

export interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: AuthError | null;
    rateLimitInfo: RateLimitInfo;
    sessionExpiry: number | null;
}

export type AuthErrorCode =
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'EMAIL_NOT_VERIFIED'
    | 'SESSION_EXPIRED'
    | 'NETWORK_ERROR'
    | 'RATE_LIMITED'
    | 'TWO_FACTOR_REQUIRED'
    | 'INVALID_2FA_CODE'
    | 'SERVER_ERROR';

export interface AuthError {
    code: AuthErrorCode;
    message: string;
    retryAfter?: number;
}

export const AUTH_STORAGE_KEYS = {
    TOKEN: 'can_auth_token',
    REFRESH_TOKEN: 'can_refresh_token',
    USER: 'can_auth_user',
    SESSION_EXPIRY: 'can_session_expiry',
    REMEMBER_ME: 'can_remember_me',
    RATE_LIMIT: 'can_rate_limit',
} as const;

export const AUTH_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000,
    SESSION_DURATION_MS: 30 * 60 * 1000,
    REMEMBER_ME_DURATION_MS: 30 * 24 * 60 * 60 * 1000,
} as const;
