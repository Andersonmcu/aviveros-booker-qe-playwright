import { APIRequestContext, expect } from '@playwright/test';

/** Cliente del servicio de autenticación (/api/auth). */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  /** Inicia sesión y devuelve el token. Falla con mensaje claro si las credenciales no sirven. */
  async login(username: string, password: string): Promise<string> {
    const response = await this.request.post('/api/auth/login', { data: { username, password } });
    expect(response.status(), `login de ${username} debería responder 200`).toBe(200);
    const body = (await response.json()) as { token?: string };
    expect(body.token, 'la respuesta de login debe incluir token').toBeTruthy();
    return body.token as string;
  }

  async validate(token: string) {
    return this.request.post('/api/auth/validate', { data: { token } });
  }
}
