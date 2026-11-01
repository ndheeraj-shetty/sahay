export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  dialect?: string;
  mode?: string;
  note?: string;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  app_name: string;
  app_env: string;
  app_version: string;
  timestamp: string;
  database: DatabaseHealth;
}

export interface SystemStatusResponse {
  name: string;
  version: string;
  phase: string;
  active_modules: string[];
  system_time: string;
}
