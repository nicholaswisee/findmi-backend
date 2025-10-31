import { z } from '@hono/zod-openapi';

export const baseSuccessSchema = z.object({
  success: z.literal(true).openapi({ example: true }),
  message: z.string().openapi({ example: 'Operation successful.' }),
});

export const baseErrorSchema = z.object({
  success: z.literal(false).openapi({ example: false }),
  message: z.string().openapi({ example: 'Something went wrong' }),
  details: z
    .unknown()
    .optional()
    .openapi({ description: 'Optional additional error information' }),
});

export const createSuccessResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  baseSuccessSchema.extend({
    data: dataSchema,
  });

export const createErrorResponse = (detailsSchema?: z.ZodTypeAny) =>
  baseErrorSchema.extend(
    detailsSchema ? { details: detailsSchema.optional() } : {},
  );

export const deleteResultSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Resource deleted.' }),
    deletedCount: z.number().optional().openapi({ example: 1 }),
  })
  .openapi('DeleteResult');

export const createPaginatedResponse = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  baseSuccessSchema.extend({
    meta: z.object({
      total: z.number().openapi({ example: 120 }),
      page: z.number().openapi({ example: 1 }),
      limit: z.number().openapi({ example: 10 }),
      totalPages: z.number().openapi({ example: 12 }),
    }),
    data: z.array(itemSchema),
  });
