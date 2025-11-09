import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { baseErrorSchema } from '../schemas/common/response';
import {
  cloudinarySignatureBodySchema,
  cloudinarySignatureSuccessSchema,
} from '../schemas/cloudinary';
import { createCloudinarySignatureController } from '../controllers/cloudinary.controller';

const errorSchema = baseErrorSchema.openapi('CloudinaryErrorResponse');

export const cloudinaryRouter = new OpenAPIHono();

type CloudinaryHandler = Parameters<typeof cloudinaryRouter.openapi>[1];

const registerCloudinaryRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: CloudinaryHandler,
) => cloudinaryRouter.openapi(createRoute(config), handler);

cloudinaryRouter.use('*', authMiddleware);
cloudinaryRouter.use('*', adminMiddleware);

registerCloudinaryRoute(
  {
    method: 'post',
    path: '/signature',
    summary: 'Generate Cloudinary upload signature',
    tags: ['Cloudinary'],
    request: {
      body: {
        content: {
          'application/json': { schema: cloudinarySignatureBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Signature created',
        content: {
          'application/json': { schema: cloudinarySignatureSuccessSchema },
        },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  createCloudinarySignatureController,
);

export default cloudinaryRouter;
