import { and, desc, ilike, inArray, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';
import { buildOrderWithItems, type OrderWithItems } from './order.service';

type UserRow = InferSelectModel<typeof schema.usersTable>;

export type UserWithOrders = UserRow & {
  orders: OrderWithItems[];
};

export type UsersWithOrdersResult = {
  users: UserWithOrders[];
  total: number;
  limit: number;
  offset: number;
};

const MAX_LIMIT = 100;

export async function getUsersWithOrders({
  limit = 20,
  offset = 0,
  search,
}: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<UsersWithOrdersResult> {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, limit));
  const safeOffset = Math.max(0, offset);
  const trimmedSearch = search?.trim();
  const searchFilter = trimmedSearch
    ? ilike(schema.usersTable.name, `%${trimmedSearch}%`)
    : undefined;

  let totalQuery = db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(schema.usersTable);

  if (searchFilter) {
    totalQuery = totalQuery.where(searchFilter);
  }

  const [totalResult] = await totalQuery;

  let usersQuery = db
    .select()
    .from(schema.usersTable)
    .orderBy(desc(schema.usersTable.created_at))
    .limit(safeLimit)
    .offset(safeOffset);

  if (searchFilter) {
    usersQuery = usersQuery.where(searchFilter);
  }

  const users = await usersQuery;

  if (users.length === 0) {
    return {
      users: [],
      total: Number(totalResult?.count ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  const userIds = users.map((user) => user.id);

  const orders = await db
    .select()
    .from(schema.ordersTable)
    .where(inArray(schema.ordersTable.user_id, userIds))
    .orderBy(desc(schema.ordersTable.created_at));

  const ordersWithDetails = await Promise.all(
    orders.map((order) => buildOrderWithItems(order)),
  );

  const ordersByUser = new Map<number, OrderWithItems[]>();

  for (const order of ordersWithDetails) {
    const forUser = ordersByUser.get(order.user_id) ?? [];
    forUser.push(order);
    ordersByUser.set(order.user_id, forUser);
  }

  return {
    users: users.map((user) => ({
      ...user,
      orders: ordersByUser.get(user.id) ?? [],
    })),
    total: Number(totalResult?.count ?? 0),
    limit: safeLimit,
    offset: safeOffset,
  };
}
