import { z } from '@hono/zod-openapi';

export const listingQuerySchema = z
  .object({
    category: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['latest', 'price_asc', 'price_desc']).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional(),
  })
  .openapi('ListingQuery');

export const searchQuerySchema = z
  .object({ keyword: z.string().min(1) })
  .openapi('SearchQuery');
