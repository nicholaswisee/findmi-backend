import { Hono } from 'hono';
import {
  loginController,
  logoutController,
  verifyController,
  beginGoogleOAuthController,
  googleOAuthCallbackController,
  meController,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const authRouter = new Hono();

// POST /auth/login
authRouter.post('/login', loginController);

// POST /auth/logout
authRouter.post('/logout', logoutController);

// GET /auth/verify
authRouter.get('/verify', verifyController);

// GET /auth/google
authRouter.get('/google', beginGoogleOAuthController);

// GET /auth/google/callback
authRouter.get('/google/callback', googleOAuthCallbackController);

// GET /auth/me
authRouter.get('/me', authMiddleware, meController);

export default authRouter;
