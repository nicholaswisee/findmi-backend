import { db, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import type { JWTPayload } from '../types/auth';
import { randomBytes, createHmac } from 'crypto';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT =
  'https://www.googleapis.com/oauth2/v3/userinfo';

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Variabel lingkungan ${name} tidak ditemukan.`);
  return v;
}

const CLIENT_ID = required('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = required('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = required('GOOGLE_REDIRECT_URI');

export function buildGoogleAuthUrl() {
  const state = randomBytes(16).toString('hex');
  const cookie = createCookie('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 5,
    path: '/',
  });

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', CLIENT_ID);
  console.log(REDIRECT_URI);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return { url, cookie };
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams();
  body.set('code', code);
  body.set('client_id', CLIENT_ID);
  body.set('client_secret', CLIENT_SECRET);
  body.set('redirect_uri', REDIRECT_URI);
  body.set('grant_type', 'authorization_code');

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Gagal menukar kode dengan token.');
  return (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };
}

export async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Gagal mengambil data pengguna Google.');
  return (await res.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
  };
}

export async function findOrCreateUserFromGoogle(google: {
  sub: string;
  email: string;
  name?: string;
}) {
  const existingAccount = await db
    .select()
    .from(schema.accountsTable)
    .where(eq(schema.accountsTable.provider_id, google.sub));

  if (existingAccount.length > 0) {
    const account = existingAccount[0];
    const [user] = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, account.user_id));

    const payload = {
      userId: user.id,
      accountId: account.id,
      email: account.email,
      role: user.role,
    } satisfies JWTPayload;

    return { user, payload };
  }

  const [user] = await db
    .insert(schema.usersTable)
    .values({
      name: google.name ?? 'Pengguna Google',
      department: 'none',
      division: 'none',
      rank: 'none',
      nim: '',
      no_wa: '',
      line_id: '',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({
      id: schema.usersTable.id,
      name: schema.usersTable.name,
      role: schema.usersTable.role,
    });

  const [account] = await db
    .insert(schema.accountsTable)
    .values({
      provider: 'google',
      provider_id: google.sub,
      email: google.email,
      user_id: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({
      id: schema.accountsTable.id,
      email: schema.accountsTable.email,
    });

  const payload = {
    userId: user.id,
    accountId: account.id,
    email: account.email,
    role: user.role,
  } satisfies JWTPayload;

  return { user, payload };
}

const JWT_SECRET = required('JWT_SECRET');
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export type SessionClaims = JWTPayload &
  Required<Pick<JWTPayload, 'iat' | 'exp'>>;

function withSessionClaims(payload: JWTPayload): SessionClaims {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  };
}

export type SessionMetadata = {
  fingerprint: string;
  issuedAt: number;
  expiresAt: number;
};

function fingerprintForClaims(claims: SessionClaims): string {
  return createHmac('sha256', JWT_SECRET)
    .update(`${claims.userId}.${claims.accountId}.${claims.iat}`)
    .digest('base64url');
}

export function buildSessionMetadata(claims: SessionClaims): SessionMetadata {
  return {
    fingerprint: fingerprintForClaims(claims),
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  };
}

export function getSessionClaims(
  payload: JWTPayload | undefined,
): SessionClaims | null {
  if (!payload) return null;
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
    return null;
  }
  return payload as SessionClaims;
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const claims = withSessionClaims(payload);
  return await sign(claims, JWT_SECRET, 'HS256');
}

export async function createSessionCookie(payload: JWTPayload) {
  const claims = withSessionClaims(payload);
  const token = await sign(claims, JWT_SECRET, 'HS256');
  return {
    cookie: createCookie('ami_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    }),
    claims,
    metadata: buildSessionMetadata(claims),
  };
}

export function clearSessionCookieHeader() {
  return createCookie('ami_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 0,
    path: '/',
  });
}

function createCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    maxAge?: number;
    path?: string;
    domain?: string;
  },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}
