import { describe, expect, it } from 'vitest';
import { createServer } from '../core/index.js';
import { STORE_KEYS } from './constants.js';
import { seedFromConfig, workosPlugin } from './index.js';

describe('JWT template seed config', () => {
  it('stores config.jwt_template.custom_claims for token minting', () => {
    const { store } = createServer(workosPlugin, { port: 0, baseUrl: 'http://localhost:0' });

    seedFromConfig(store, 'http://localhost:0', {
      config: {
        jwt_template: {
          custom_claims: { account_type: '{{ organization.metadata.type }}' },
        },
      },
    });

    expect(store.getData(STORE_KEYS.jwtTemplate)).toEqual({
      object: 'jwt_template',
      custom_claims: { account_type: '{{ organization.metadata.type }}' },
    });
  });
});
