/**
 * Environment variable loader for CAN Simulator
 * Centralizes all env var access with type safety and validation
 */

interface Environment {
  // API
  apiBaseUrl: string;
  apiTimeout: number;

  // Dev Server
  devServerPort: number;
  devServerHost: string;
  devServerUrl: string;

  // Supabase
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;

  // Razorpay
  razorpayKeyId: string | null;
  razorpayPlanPro: string | null;
  razorpayPlanTeam: string | null;

  // CAN Simulator
  canInterface: string;
  canBaudrate: number;
  simulatorDebug: boolean;

  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getEnvString(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] || defaultValue;
}

export const env: Environment = {
  // API
  apiBaseUrl: getEnvString('VITE_API_BASE_URL', 'http://localhost:5173'),
  apiTimeout: getEnvNumber('VITE_API_TIMEOUT', 30000),

  // Dev Server
  devServerPort: getEnvNumber('VITE_DEV_SERVER_PORT', 5173),
  devServerHost: getEnvString('VITE_DEV_SERVER_HOST', 'localhost'),
  devServerUrl: `http://${getEnvString('VITE_DEV_SERVER_HOST', 'localhost')}:${getEnvNumber('VITE_DEV_SERVER_PORT', 5173)}`,

  // Supabase
  supabaseUrl: getEnvString('VITE_SUPABASE_URL') || null,
  supabaseAnonKey: getEnvString('VITE_SUPABASE_ANON_KEY') || null,

  // Razorpay
  razorpayKeyId: getEnvString('VITE_RAZORPAY_KEY_ID') || null,
  razorpayPlanPro: getEnvString('VITE_RAZORPAY_PLAN_PRO') || null,
  razorpayPlanTeam: getEnvString('VITE_RAZORPAY_PLAN_TEAM') || null,

  // CAN Simulator
  canInterface: getEnvString('VITE_CAN_INTERFACE', 'can0'),
  canBaudrate: getEnvNumber('VITE_CAN_BAUDRATE', 500000),
  simulatorDebug: getEnvBoolean('VITE_SIMULATOR_DEBUG', false),

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTest: import.meta.env.TEST === 'true',
};

// Validate critical env vars in production
if (env.isProduction) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.error('[ENV] Supabase credentials missing in production!');
  }
}

// Log env config in development
if (env.isDevelopment) {
  console.debug('[ENV] Configuration loaded:', {
    devServerUrl: env.devServerUrl,
    canInterface: env.canInterface,
    canBaudrate: env.canBaudrate,
    debug: env.simulatorDebug,
  });
}

export default env;
