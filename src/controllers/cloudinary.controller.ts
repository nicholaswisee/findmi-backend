import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { successResponse } from '../utils/response';
import {
  generateUploadSignature,
  type CloudinarySignatureOptions,
} from '../services/cloudinary.service';

export const createCloudinarySignatureController = controller(
  async (c: Context) => {
    const body = (await c.req.json()) as CloudinarySignatureOptions;
    const signature = generateUploadSignature(body);

    return successResponse(
      c,
      signature,
      'Cloudinary upload signature generated successfully.',
    );
  },
);
