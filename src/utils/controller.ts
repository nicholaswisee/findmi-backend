import type { Context } from 'hono';
import { errorResponse } from './response';

type ControllerResult = Promise<Response> | Response;
type ControllerHandler = (c: Context) => ControllerResult;

export const controller =
  (handler: ControllerHandler) =>
  async (c: Context): Promise<Response> => {
    try {
      return await handler(c);
    } catch (error) {
      console.error(`${handler.name || 'controller'} error:`, error);
      return errorResponse(c, (error as Error).message, 500);
    }
  };
