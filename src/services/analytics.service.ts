import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/db';
import type { OrderPaymentStatusEnum, UserDepartmentEnum } from '../schemas';

type RecentOrder = {
  id: number;
  total_amount: number;
  payment_status: OrderPaymentStatusEnum;
  created_at: string;
  user: {
    id: number;
    name: string;
    department: UserDepartmentEnum;
  };
};

export type RevenueAnalyticsResult = {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  weeklyRevenue: Array<{ week: string; revenue: number }>;
  departmentBreakdown: Array<{
    department: UserDepartmentEnum;
    revenue: number;
    orders: number;
  }>;
  recentOrders: RecentOrder[];
};

export async function getRevenueAnalytics({
  department,
}: {
  department?: UserDepartmentEnum;
}): Promise<RevenueAnalyticsResult> {
  const conditions = [eq(schema.ordersTable.payment_status, 'Paid')];

  if (department) {
    conditions.push(eq(schema.usersTable.department, department));
  }

  const whereClause =
    conditions.length === 1 ? conditions[0] : and(...conditions);

  const [summaryRow] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${schema.ordersTable.total_amount}), 0)`,
      totalOrders: sql<number>`CAST(COUNT(*) AS INT)`,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.ordersTable.user_id, schema.usersTable.id),
    )
    .where(whereClause);

  const totalRevenue = Number(summaryRow?.totalRevenue ?? 0);
  const totalOrders = Number(summaryRow?.totalOrders ?? 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const departmentBreakdown = await db
    .select({
      department: schema.usersTable.department,
      revenue: sql<number>`COALESCE(SUM(${schema.ordersTable.total_amount}), 0)`,
      orders: sql<number>`CAST(COUNT(*) AS INT)`,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.ordersTable.user_id, schema.usersTable.id),
    )
    .where(whereClause)
    .groupBy(schema.usersTable.department)
    .orderBy(desc(sql`SUM(${schema.ordersTable.total_amount})`));

  const weeklyRevenue = await db
    .select({
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${schema.ordersTable.created_at}), '"W"IW YYYY')`,
      sortKey: sql<string>`TO_CHAR(DATE_TRUNC('week', ${schema.ordersTable.created_at}), 'YYYY-IW')`,
      revenue: sql<number>`COALESCE(SUM(${schema.ordersTable.total_amount}), 0)`,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.ordersTable.user_id, schema.usersTable.id),
    )
    .where(whereClause)
    .groupBy(sql`DATE_TRUNC('week', ${schema.ordersTable.created_at})`)
    .orderBy(desc(sql`DATE_TRUNC('week', ${schema.ordersTable.created_at})`))
    .limit(12);

  const recentOrdersRaw = await db
    .select({
      id: schema.ordersTable.id,
      total_amount: schema.ordersTable.total_amount,
      payment_status: schema.ordersTable.payment_status,
      created_at: schema.ordersTable.created_at,
      user_id: schema.usersTable.id,
      user_name: schema.usersTable.name,
      user_department: schema.usersTable.department,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.ordersTable.user_id, schema.usersTable.id),
    )
    .where(whereClause)
    .orderBy(desc(schema.ordersTable.created_at))
    .limit(180);

  const recentOrders: RecentOrder[] = recentOrdersRaw.map((order) => ({
    id: order.id,
    total_amount: Number(order.total_amount),
    payment_status: order.payment_status as OrderPaymentStatusEnum,
    created_at: order.created_at?.toISOString() ?? new Date().toISOString(),
    user: {
      id: order.user_id,
      name: order.user_name,
      department: order.user_department,
    },
  }));

  return {
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
    },
    weeklyRevenue: weeklyRevenue
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((row) => ({
        week: row.week,
        revenue: Number(row.revenue),
      })),
    departmentBreakdown: departmentBreakdown.map((row) => ({
      department: row.department,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    })),
    recentOrders,
  };
}
