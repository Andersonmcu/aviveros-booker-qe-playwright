import 'dotenv/config';

/** Configuración del entorno. Todo valor sale de variables de entorno con defaults de la demo pública. */
export const env = {
  baseURL: process.env.BASE_URL ?? 'https://automationintesting.online',
  adminUser: process.env.ADMIN_USER ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'password',
} as const;
