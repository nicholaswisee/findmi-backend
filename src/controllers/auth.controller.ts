import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  findOrCreateUserFromGoogle,
  issueSessionCookie,
  clearSessionCookie,
} from '../services/auth.service';
import { db, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function beginGoogleOAuthController(c: Context) {
  try {
    const url = buildGoogleAuthUrl(c);
    return c.redirect(url.toString(), 302);
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function googleOAuthCallbackController(c: Context) {
  try {
    const currentUrl = new URL(c.req.url);
    const code = currentUrl.searchParams.get('code');
    const stateFromQuery = currentUrl.searchParams.get('state');

    const cookieHeader = c.req.header('Cookie') || '';
    const match = /google_oauth_state=([^;]+)/.exec(cookieHeader);
    const stateFromCookie = match ? decodeURIComponent(match[1]) : null;

    if (!code) return errorResponse(c, 'Missing authorization code', 400);
    if (
      !stateFromQuery ||
      !stateFromCookie ||
      stateFromQuery !== stateFromCookie
    )
      return errorResponse(
        c,
        'Invalid OAuth state (possible CSRF attack)',
        400,
      );

    const tokens = await exchangeCodeForTokens(code);

    const profile = await getGoogleUserInfo(tokens.access_token);

    const { payload } = await findOrCreateUserFromGoogle(profile);

    await issueSessionCookie(c, payload);

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:4242';
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontend}?login=success`,
        'Set-Cookie': c.res.headers.get('Set-Cookie')!,
      },
    });
  } catch (err) {
    return errorResponse(c, (err as Error).message, 401);
  }
}

export async function loginController(c: Context) {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    const { email, password } = body;

    if (!email || !password)
      return errorResponse(c, 'Email and password are required', 400);

    const accounts = await db
      .select()
      .from(schema.accountsTable)
      .where(eq(schema.accountsTable.email, email));

    if (accounts.length === 0)
      return errorResponse(c, 'Invalid email or password', 401);

    const account = accounts[0];

    const [user] = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, account.user_id));

    if (!account.password) {
      return errorResponse(c, 'This account uses Google login', 400);
    }

    const match = await bcrypt.compare(password, account.password);

    if (!match) return errorResponse(c, 'Invalid email or password', 401);

    const payload = {
      userId: user.id,
      accountId: account.id,
      email: account.email,
      role: user.role,
    };

    issueSessionCookie(c, payload);

    return successResponse(c, { user }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function verifyController(c: Context) {
  try {
    const user = c.get('user'); // set by authMiddleware after verifying JWT
    if (!user) return errorResponse(c, 'Invalid or expired token', 401);
    return successResponse(c, user, 'Token valid');
  } catch (err) {
    console.error('Verify error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function logoutController(c: Context) {
  clearSessionCookie(c);
  return successResponse(c, { ok: true }, 'Logged out');
}

export async function meController(c: Context) {
  try {
    const payload = c.get('user');

    if (!payload || !payload.userId) {
      return errorResponse(c, 'Not authenticated', 401);
    }

    const [user] = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, payload.userId));

    if (!user) {
      return errorResponse(c, 'User not found', 404);
    }

    const [account] = await db
      .select()
      .from(schema.accountsTable)
      .where(eq(schema.accountsTable.id, payload.accountId));

    return successResponse(
      c,
      { ...user, email: account.email, provider: account.provider },
      'Session OK',
    );
  } catch (err) {
    console.error('meController error:', err);
    return errorResponse(c, 'Failed to fetch user', 500);
  }
}
