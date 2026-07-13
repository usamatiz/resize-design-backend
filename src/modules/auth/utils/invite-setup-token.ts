import { createHmac, timingSafeEqual } from 'crypto';

const PURPOSE = 'invite-setup';
const TTL_SECONDS = 15 * 60;

interface InviteSetupPayload {
  sub: string;
  purpose: string;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
}

function signSegment(data: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createInviteSetupToken(authId: string, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: authId,
      purpose: PURPOSE,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    } satisfies InviteSetupPayload),
  );
  const signature = signSegment(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

export function verifyInviteSetupToken(
  token: string,
  secret: string,
): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = signSegment(`${header}.${payload}`, secret);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  let parsed: InviteSetupPayload;
  try {
    parsed = JSON.parse(base64UrlDecode(payload)) as InviteSetupPayload;
  } catch {
    return null;
  }

  if (parsed.purpose !== PURPOSE || typeof parsed.sub !== 'string') {
    return null;
  }
  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return parsed.sub;
}
