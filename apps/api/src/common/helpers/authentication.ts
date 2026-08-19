const BEARER_TOKEN_PATTERN = /^Bearer\s+/i;

export function extractBearerToken(authorization: string | undefined) {
  return authorization?.replace(BEARER_TOKEN_PATTERN, '');
}
