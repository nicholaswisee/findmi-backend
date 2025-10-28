import { db, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import type { JWTPayload } from '../types/auth';
import type { Context } from 'hono';
import { randomBytes } from 'crypto';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT =
  'https://www.googleapis.com/oauth2/v3/userinfo';

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const CLIENT_ID = required('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = required('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = required('GOOGLE_REDIRECT_URI');

export function buildGoogleAuthUrl(c: any) {
  const state = randomBytes(16).toString('hex');
  c.header(
    'Set-Cookie',
    createCookie('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      domain: undefined,
    }),
  );

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', CLIENT_ID);
  console.log(REDIRECT_URI);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url;
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
  if (!res.ok) throw new Error('Failed to exchange code for tokens');
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
  if (!res.ok) throw new Error('Failed to fetch Google user info');
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
      name: google.name ?? 'Google User',
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

export async function generateToken(payload: JWTPayload): Promise<string> {
  return await sign(payload, JWT_SECRET, 'HS256');
}

export async function issueSessionCookie(c: Context, payload: JWTPayload) {
  const token = await sign(payload, process.env.JWT_SECRET!, 'HS256');
  // HttpOnly session cookie
  c.header(
    'Set-Cookie',
    createCookie('ami_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }),
  );
}

export function clearSessionCookie(c: any) {
  c.header(
    'Set-Cookie',
    createCookie('ami_session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    }),
  );
}

function createCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
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
