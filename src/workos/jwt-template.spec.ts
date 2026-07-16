import { describe, expect, it } from 'vitest';
import { renderClaimValue, renderCustomClaims } from './jwt-template.js';

const context = {
  user: { metadata: { tier: 3 }, email_verified: true },
  organization: { name: 'Acme', metadata: { type: 'oem' } },
  role: 'admin',
  permissions: ['users:read'],
};

describe('JWT template rendering', () => {
  it('preserves the resolved type for a single expression', () => {
    expect(renderClaimValue('{{ organization.metadata.type }}', context)).toBe('oem');
    expect(renderClaimValue('{{ user.metadata.tier }}', context)).toBe(3);
    expect(renderClaimValue('{{ user.email_verified }}', context)).toBe(true);
  });

  it('substitutes expressions embedded in a larger string', () => {
    expect(renderClaimValue('org={{ organization.name }}; missing={{ organization.region }}', context)).toBe(
      'org=Acme; missing=',
    );
  });

  it('omits claims whose path is missing or resolves to null', () => {
    expect(
      renderCustomClaims(
        {
          account_type: '{{ organization.metadata.missing }}',
          nullable: '{{ missing }}',
          present: '{{ role }}',
        },
        { ...context, missing: null },
      ),
    ).toEqual({ present: 'admin' });
  });

  it('passes literal values through unchanged', () => {
    const literal = { enabled: true, count: 2 };
    expect(renderCustomClaims(literal, context)).toEqual(literal);
  });

  it('renders objects and arrays recursively', () => {
    expect(
      renderClaimValue(
        {
          org: '{{ organization.name }}',
          values: ['{{ role }}', '{{ user.metadata.tier }}', { type: '{{ organization.metadata.type }}' }],
        },
        context,
      ),
    ).toEqual({ org: 'Acme', values: ['admin', 3, { type: 'oem' }] });
  });
});
