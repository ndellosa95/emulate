export type ClaimContext = Record<string, unknown>;

/** Resolve a dotted path against a claim context. */
function resolvePath(path: string, ctx: ClaimContext): unknown {
  const segments = path.split('.');
  let current: unknown = ctx;

  for (const segment of segments) {
    if (
      !segment ||
      current === null ||
      (typeof current !== 'object' && typeof current !== 'function') ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/** Render a JWT template value against the supplied login context. */
export function renderClaimValue(value: unknown, ctx: ClaimContext): unknown {
  if (typeof value === 'string') {
    const exactExpression = value.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
    if (exactExpression) {
      return resolvePath(exactExpression[1].trim(), ctx);
    }

    return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, path: string) => {
      const resolved = resolvePath(path.trim(), ctx);
      return resolved == null ? '' : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => renderClaimValue(entry, ctx));
  }

  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, renderClaimValue(entry, ctx)]));
  }

  return value;
}

/** Render all configured custom claims, omitting unresolved or null top-level values. */
export function renderCustomClaims(
  claims: Record<string, unknown> | undefined,
  ctx: ClaimContext,
): Record<string, unknown> {
  if (!claims) return {};

  const rendered: Record<string, unknown> = {};
  for (const [claim, value] of Object.entries(claims)) {
    const renderedValue = renderClaimValue(value, ctx);
    if (renderedValue !== undefined && renderedValue !== null) {
      rendered[claim] = renderedValue;
    }
  }
  return rendered;
}
