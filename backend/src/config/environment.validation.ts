interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  FRONTEND_ORIGINS: string;
  DATABASE_URL: string;
  DATABASE_DIRECT_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_SIZE: number;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  REFRESH_TOKEN_DAYS: number;
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USE_SSL: boolean;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  FRONTEND_BASE_URL: string;
  SMTP_FROM: string;
  RESEND_API_KEY: string;
  GOOGLE_OAUTH_CLIENT_IDS: string;
}

export function validateEnvironment(environment: Record<string, unknown>): EnvironmentVariables {
  const databaseUrl = readString(environment.DATABASE_URL);
  const databaseDirectUrl = readString(environment.DATABASE_DIRECT_URL);
  const nodeEnvironment = readString(environment.NODE_ENV, 'development');
  const requiredKeys = [
    'FRONTEND_ORIGINS',
    'JWT_ACCESS_SECRET',
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET'
  ];
  if (!databaseUrl) {
    requiredKeys.push('DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD');
  }
  const missingKeys = requiredKeys.filter((key) => !readString(environment[key]).trim());

  if (missingKeys.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missingKeys.join(', ')}.`);
  }

  const accessSecret = readString(environment.JWT_ACCESS_SECRET);
  if (accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET deve possuir pelo menos 32 caracteres.');
  }

  if (nodeEnvironment === 'production' && databaseUrl && !databaseDirectUrl) {
    throw new Error('DATABASE_DIRECT_URL é obrigatória em produção quando DATABASE_URL é utilizada.');
  }

  const databaseSsl = readString(environment.DATABASE_SSL, databaseUrl ? 'true' : 'false') === 'true';
  if (nodeEnvironment === 'production' && !databaseSsl) {
    throw new Error('DATABASE_SSL deve ser true em produção.');
  }

  const databasePoolSize = Number(environment.DATABASE_POOL_SIZE || 5);
  if (!Number.isInteger(databasePoolSize) || databasePoolSize < 1) {
    throw new Error('DATABASE_POOL_SIZE deve ser um número inteiro maior que zero.');
  }

  return {
    NODE_ENV: nodeEnvironment,
    PORT: Number(environment.PORT || 3000),
    FRONTEND_ORIGINS: readString(environment.FRONTEND_ORIGINS),
    DATABASE_URL: databaseUrl,
    DATABASE_DIRECT_URL: databaseDirectUrl,
    DATABASE_HOST: readString(environment.DATABASE_HOST),
    DATABASE_PORT: Number(environment.DATABASE_PORT || 5435),
    DATABASE_NAME: readString(environment.DATABASE_NAME),
    DATABASE_USER: readString(environment.DATABASE_USER),
    DATABASE_PASSWORD: readString(environment.DATABASE_PASSWORD),
    DATABASE_SSL: databaseSsl,
    DATABASE_POOL_SIZE: databasePoolSize,
    JWT_ACCESS_SECRET: accessSecret,
    JWT_ACCESS_EXPIRES_IN: readString(environment.JWT_ACCESS_EXPIRES_IN, '15m'),
    REFRESH_TOKEN_DAYS: Number(environment.REFRESH_TOKEN_DAYS || 30),
    MINIO_ENDPOINT: readString(environment.MINIO_ENDPOINT),
    MINIO_PORT: Number(environment.MINIO_PORT || 9000),
    MINIO_USE_SSL: readString(environment.MINIO_USE_SSL, 'false') === 'true',
    MINIO_ACCESS_KEY: readString(environment.MINIO_ACCESS_KEY),
    MINIO_SECRET_KEY: readString(environment.MINIO_SECRET_KEY),
    MINIO_BUCKET: readString(environment.MINIO_BUCKET),
    FRONTEND_BASE_URL: readString(environment.FRONTEND_BASE_URL, 'http://localhost:4200'),
    SMTP_FROM: readString(environment.SMTP_FROM, 'Home Easy <nao-responda@homeeasy.local>'),
    RESEND_API_KEY: readString(environment.RESEND_API_KEY),
    GOOGLE_OAUTH_CLIENT_IDS: readString(environment.GOOGLE_OAUTH_CLIENT_IDS)
  };
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
