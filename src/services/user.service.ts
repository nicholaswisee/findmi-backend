import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';
import { buildOrderWithItems, type OrderWithItems } from './order.service';
import type { User, UserDepartmentEnum } from '../schemas';

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
const MULTIKAMPUS_REQUIRED_DEPARTMENTS = new Set<UserDepartmentEnum>([
  'Ketua AMI',
  'Kesekjenan',
  'Manajemen Personalia',
  'Materi dan Metode',
  'Relasi',
  'ITB Day',
  'Paguyuban Membangun',
  'Diseminasi',
  'Kreatif',
  'Fundraising',
  'Operasional',
  'Perangkat Lapangan Utama',
  'IT',
]);

const assertMultikampusRequirement = (
  department: UserDepartmentEnum,
  multikampus?: UserRow['multikampus'] | null,
) => {
  if (
    MULTIKAMPUS_REQUIRED_DEPARTMENTS.has(department) &&
    (!multikampus || multikampus === 'none')
  ) {
    throw new Error('Multikampus wajib diisi.');
  }
};

export async function getUsersWithOrders({
  limit = 20,
  offset = 0,
  search,
  department,
}: {
  limit?: number;
  offset?: number;
  search?: string;
  department?: UserDepartmentEnum;
} = {}): Promise<UsersWithOrdersResult> {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, limit));
  const safeOffset = Math.max(0, offset);
  const trimmedSearch = search?.trim();
  const searchFilter = trimmedSearch
    ? or(
        ilike(schema.usersTable.name, `%${trimmedSearch}%`),
        ilike(schema.usersTable.nim, `%${trimmedSearch}%`),
        ilike(schema.usersTable.no_wa, `%${trimmedSearch}%`),
        ilike(schema.usersTable.line_id, `%${trimmedSearch}%`),
      )
    : undefined;
  const departmentFilter = department
    ? eq(schema.usersTable.department, department)
    : undefined;
  const combinedFilter =
    searchFilter && departmentFilter
      ? and(searchFilter, departmentFilter)
      : (searchFilter ?? departmentFilter);

  const totalQuery = db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(schema.usersTable);

  const [totalResult] = await (combinedFilter
    ? totalQuery.where(combinedFilter)
    : totalQuery);

  const usersQuery = db
    .select()
    .from(schema.usersTable)
    .orderBy(desc(schema.usersTable.created_at))
    .limit(safeLimit)
    .offset(safeOffset);

  const users = await (combinedFilter
    ? usersQuery.where(combinedFilter)
    : usersQuery);

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

export async function updateUser(
  userId: number,
  data: Partial<UserRow>,
): Promise<UserRow> {
  const allowedFields: Array<keyof UserRow> = [
    'name',
    'department',
    'division',
    'multikampus',
    'rank',
    'nim',
    'no_wa',
    'line_id',
    'role',
  ];

  const [currentUser] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, userId));

  if (!currentUser) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  const nextDepartment =
    (data.department as UserDepartmentEnum | undefined) ??
    currentUser.department;
  const nextMultikampus =
    (data.multikampus as UserRow['multikampus'] | undefined) ??
    currentUser.multikampus;

  assertMultikampusRequirement(nextDepartment, nextMultikampus);

  const updateData: Partial<UserRow> = {};
  for (const key of allowedFields) {
    if (typeof data[key] !== 'undefined') {
      updateData[key] = data[key] as UserRow[keyof UserRow];
    }
  }

  updateData.updated_at = new Date();

  const [updatedUser] = await db
    .update(schema.usersTable)
    .set(updateData)
    .where(eq(schema.usersTable.id, userId))
    .returning();

  return updatedUser ?? currentUser;
}

export async function updateMyProfile(
  userId: number,
  data: Partial<UserRow>,
): Promise<UserRow> {
  const allowedFields: Array<keyof UserRow> = [
    'name',
    'department',
    'division',
    'multikampus',
    'rank',
    'nim',
    'no_wa',
    'line_id',
  ];

  const [currentUser] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, userId));

  if (!currentUser) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  const nextDepartment =
    (data.department as UserDepartmentEnum | undefined) ??
    currentUser.department;
  const nextMultikampus =
    (data.multikampus as UserRow['multikampus'] | undefined) ??
    currentUser.multikampus;

  assertMultikampusRequirement(nextDepartment, nextMultikampus);

  const updateData: Partial<UserRow> = {};
  for (const key of allowedFields) {
    if (typeof data[key] !== 'undefined') {
      updateData[key] = data[key] as UserRow[keyof UserRow];
    }
  }

  updateData.updated_at = new Date();

  const [updatedUser] = await db
    .update(schema.usersTable)
    .set(updateData)
    .where(eq(schema.usersTable.id, userId))
    .returning();

  return updatedUser ?? currentUser;
}
