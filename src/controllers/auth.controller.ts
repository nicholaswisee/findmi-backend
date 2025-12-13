import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  findOrCreateUserFromGoogle,
  createSessionCookie,
  clearSessionCookieHeader,
  buildSessionMetadata,
  getSessionClaims,
} from '../services/auth.service';
import { db, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function beginGoogleOAuthController(c: Context) {
  try {
    const { url, cookie } = buildGoogleAuthUrl();
    const res = c.redirect(url.toString(), 302);
    res.headers.append('Set-Cookie', cookie);
    return res;
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

    if (!code) return errorResponse(c, 'Kode otorisasi tidak ditemukan.', 400);
    if (
      !stateFromQuery ||
      !stateFromCookie ||
      stateFromQuery !== stateFromCookie
    )
      return errorResponse(
        c,
        'Status OAuth tidak valid (kemungkinan serangan CSRF).',
        400,
      );

    const tokens = await exchangeCodeForTokens(code);

    const profile = await getGoogleUserInfo(tokens.access_token);

    const { payload } = await findOrCreateUserFromGoogle(profile);

    const session = await createSessionCookie(payload);

    const frontend = `${process.env.FRONTEND_URL + '/profile'}`;
    const res = c.redirect(`${frontend}?login=success`, 302);
    res.headers.append('Set-Cookie', session.cookie);
    return res;
  } catch (err) {
    return errorResponse(c, (err as Error).message, 401);
  }
}

export async function loginController(c: Context) {
  try {
    const body = await c.req.json<{ nim: string; password: string }>();
    const { nim, password } = body;

    if (!nim || !password)
      return errorResponse(c, 'NIM dan kata sandi wajib diisi.', 400);

    const users = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.nim, nim));

    if (users.length === 0) {
      return errorResponse(c, 'NIM atau kata sandi tidak valid.', 401);
    }

    const user = users[0];

    const accounts = await db
      .select()
      .from(schema.accountsTable)
      .where(eq(schema.accountsTable.user_id, user.id));

    const localAccount = accounts.find((a) => a.password);

    if (!localAccount) {
      return errorResponse(c, 'Akun ini menggunakan login Google.', 400);
    }

    const match = await bcrypt.compare(password, localAccount.password!);
    if (!match)
      return errorResponse(c, 'NIM atau kata sandi tidak valid.', 401);

    const payload = {
      userId: user.id,
      accountId: localAccount.id,
      email: localAccount.email,
      role: user.role,
    };

    const session = await createSessionCookie(payload);
    const responseBody = {
      user: {
        ...user,
        email: localAccount.email,
        provider: localAccount.provider,
      },
      session: session.metadata,
    };

    const res = successResponse(c, responseBody, 'Login berhasil.');
    res.headers.append('Set-Cookie', session.cookie);
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function verifyController(c: Context) {
  try {
    const claims = getSessionClaims(c.get('user'));
    if (!claims)
      return errorResponse(c, 'Token tidak valid atau telah kedaluwarsa.', 401);
    return successResponse(
      c,
      {
        payload: claims,
        session: buildSessionMetadata(claims),
      },
      'Token masih berlaku.',
    );
  } catch (err) {
    console.error('Verify error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function logoutController(c: Context) {
  const cookie = clearSessionCookieHeader();
  const res = successResponse(c, { ok: true }, 'Berhasil keluar.');
  res.headers.append('Set-Cookie', cookie);
  return res;
}

export async function meController(c: Context) {
  try {
    const payload = c.get('user');

    if (!payload || !payload.userId) {
      return errorResponse(c, 'Tidak terautentikasi.', 401);
    }

    const [user] = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, payload.userId));

    if (!user) {
      return errorResponse(c, 'Pengguna tidak ditemukan.', 404);
    }

    const [account] = await db
      .select()
      .from(schema.accountsTable)
      .where(eq(schema.accountsTable.id, payload.accountId));

    const claims = getSessionClaims(payload);
    if (!claims) {
      return errorResponse(c, 'Sesi tidak valid atau telah kedaluwarsa.', 401);
    }
    return successResponse(
      c,
      {
        user: { ...user, email: account.email, provider: account.provider },
        session: buildSessionMetadata(claims),
      },
      'Sesi aktif.',
    );
  } catch (err) {
    console.error('meController error:', err);
    return errorResponse(c, 'Gagal mengambil data pengguna.', 500);
  }
}
