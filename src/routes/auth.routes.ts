import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  loginController,
  logoutController,
  verifyController,
  beginGoogleOAuthController,
  googleOAuthCallbackController,
  meController,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { baseErrorSchema } from '../schemas/common/response';
import {
  loginBodySchema,
  loginSuccessSchema,
  logoutSuccessSchema,
  verifySuccessSchema,
  meSuccessSchema,
} from '../schemas/auth';

const authRouter = new OpenAPIHono();

const errorSchema = baseErrorSchema.openapi('ErrorResponse');

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: loginBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: loginSuccessSchema,
          },
        },
      },
      400: {
        description: 'Invalid request',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  loginController,
);

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Logged out',
        content: {
          'application/json': { schema: logoutSuccessSchema },
        },
      },
    },
  }),
  logoutController,
);

authRouter.use('/verify', authMiddleware);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/verify',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Token valid',
        content: {
          'application/json': { schema: verifySuccessSchema },
        },
      },
      401: {
        description: 'Invalid or expired token',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  verifyController,
);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/google',
    tags: ['Auth'],
    responses: {
      302: {
        description: 'Redirect to Google OAuth consent screen',
      },
      500: {
        description: 'Failed to start Google OAuth',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  beginGoogleOAuthController,
);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/google/callback',
    tags: ['Auth'],
    responses: {
      302: {
        description: 'Redirect back to frontend after OAuth',
      },
      401: {
        description: 'OAuth failed or invalid state',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  googleOAuthCallbackController,
);

authRouter.use('/me', authMiddleware);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Session OK',
        content: { 'application/json': { schema: meSuccessSchema } },
      },
      401: {
        description: 'Not authenticated',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'User not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  meController,
);

export default authRouter;
