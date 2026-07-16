import { describe, it, expect, afterEach } from 'vitest';
import { createEmulator, type Emulator } from './index.js';

/**
 * The emulator stamps its baseUrl as the JWT `iss` claim. When clients reach it under a host
 * other than localhost (e.g. a Docker service name), they verify the issuer against that host,
 * so the baseUrl override must flow all the way onto the minted token.
 */
describe('baseUrl override', () => {
  let emulator: Emulator | undefined;

  afterEach(async () => {
    await emulator?.close();
    emulator = undefined;
  });

  function decodeClaims(accessToken: string): Record<string, unknown> {
    const payload = accessToken.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>;
  }

  it('stamps the overridden baseUrl as the token issuer', async () => {
    const baseUrl = 'http://workos-emulator:4100';
    emulator = await createEmulator({ port: 0, baseUrl });
    // The public identity (and issuer) is the override; the server still binds a real localhost
    // port (port: 0 → OS-assigned), which is where requests actually go.
    expect(emulator.url).toBe(baseUrl);
    const origin = `http://localhost:${emulator.port}`;

    const headers = { Authorization: `Bearer ${emulator.apiKey}`, 'Content-Type': 'application/json' };
    const createRes = await fetch(`${origin}/user_management/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'iss@test.com', password: 'secret', email_verified: true }),
    });
    expect(createRes.ok).toBe(true);

    const authRes = await fetch(`${origin}/user_management/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'password', email: 'iss@test.com', password: 'secret', client_id: 'emulate' }),
    });
    expect(authRes.status).toBe(200);
    const body = (await authRes.json()) as { access_token: string };
    expect(decodeClaims(body.access_token).iss).toBe(baseUrl);
  });

  it('defaults the issuer to localhost when no baseUrl is given', async () => {
    emulator = await createEmulator({ port: 0 });
    expect(emulator.url).toMatch(/^http:\/\/localhost:\d+$/);
  });
});
