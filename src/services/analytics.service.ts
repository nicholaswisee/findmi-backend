import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/db';
import type {
  OrderPaymentStatusEnum,
  UserDepartmentEnum,
  UserDivisionEnum,
} from '../schemas';

type RecentOrder = {
  id: number;
  total_amount: number;
  payment_status: OrderPaymentStatusEnum;
  created_at: string;
  user: {
    id: number;
    name: string;
    department: UserDepartmentEnum;
    division: UserDivisionEnum;
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
  divisionBreakdown: Array<{
    division: UserDivisionEnum;
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

  const orders = await db
    .select({
      id: schema.ordersTable.id,
      created_at: schema.ordersTable.created_at,
      delivery_fee: schema.ordersTable.delivery_fee,
      payment_status: schema.ordersTable.payment_status,
      user_id: schema.usersTable.id,
      user_name: schema.usersTable.name,
      department: schema.usersTable.department,
      division: schema.usersTable.division,
      items_total: sql<number>`
        COALESCE(SUM(${schema.orderItemsTable.unit_price} * ${schema.orderItemsTable.quantity}), 0)
      `,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.orderItemsTable,
      eq(schema.orderItemsTable.order_id, schema.ordersTable.id),
    )
    .innerJoin(
      schema.usersTable,
      eq(schema.ordersTable.user_id, schema.usersTable.id),
    )
    .where(whereClause)
    .groupBy(
      schema.ordersTable.id,
      schema.ordersTable.created_at,
      schema.ordersTable.delivery_fee,
      schema.ordersTable.payment_status,
      schema.usersTable.id,
      schema.usersTable.name,
      schema.usersTable.department,
      schema.usersTable.division,
    );

  const ordersWithFees = orders.map((row) => {
    const itemsTotal = Number(row.items_total ?? 0);
    const deliveryFee = Number(row.delivery_fee ?? 0);
    const baseTotal = itemsTotal + deliveryFee;
    const serviceFee = Math.ceil(baseTotal * 0.02);
    const totalWithFee = baseTotal + serviceFee;
    return {
      id: row.id,
      createdAt: row.created_at ?? new Date(),
      department: row.department,
      division: row.division,
      payment_status: row.payment_status as OrderPaymentStatusEnum,
      user: {
        id: row.user_id,
        name: row.user_name,
        department: row.department,
        division: row.division,
      },
      totals: {
        itemsTotal,
        deliveryFee,
        serviceFee,
        totalWithFee,
      },
    };
  });

  const totalRevenue = ordersWithFees.reduce(
    (acc, order) => acc + order.totals.totalWithFee,
    0,
  );
  const totalOrders = ordersWithFees.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const departmentBreakdownMap = new Map<
    UserDepartmentEnum,
    { revenue: number; orders: number }
  >();
  const divisionBreakdownMap = new Map<
    UserDivisionEnum,
    { revenue: number; orders: number }
  >();

  const weeklyRevenueMap = new Map<
    string,
    { week: string; sortKey: string; revenue: number }
  >();

  const getIsoWeek = (date: Date) => {
    const utcDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    const year = utcDate.getUTCFullYear();
    const paddedWeek = String(weekNo).padStart(2, '0');
    return {
      weekLabel: `W${paddedWeek} ${year}`,
      sortKey: `${year}-${paddedWeek}`,
    };
  };

  for (const order of ordersWithFees) {
    const revenue = order.totals.totalWithFee;

    // Department aggregation
    const deptAgg = departmentBreakdownMap.get(order.department) ?? {
      revenue: 0,
      orders: 0,
    };
    departmentBreakdownMap.set(order.department, {
      revenue: deptAgg.revenue + revenue,
      orders: deptAgg.orders + 1,
    });

    // Division aggregation
    const divisionAgg = divisionBreakdownMap.get(order.division) ?? {
      revenue: 0,
      orders: 0,
    };
    divisionBreakdownMap.set(order.division, {
      revenue: divisionAgg.revenue + revenue,
      orders: divisionAgg.orders + 1,
    });

    // Weekly aggregation
    const createdAt =
      order.createdAt instanceof Date
        ? order.createdAt
        : new Date(order.createdAt);
    const { weekLabel, sortKey } = getIsoWeek(createdAt);
    const weeklyAgg = weeklyRevenueMap.get(sortKey) ?? {
      week: weekLabel,
      sortKey,
      revenue: 0,
    };
    weeklyRevenueMap.set(sortKey, {
      week: weekLabel,
      sortKey,
      revenue: weeklyAgg.revenue + revenue,
    });
  }

  const departmentBreakdown = Array.from(departmentBreakdownMap.entries()).map(
    ([department, value]) => ({
      department,
      revenue: value.revenue,
      orders: value.orders,
    }),
  );

  const divisionBreakdown = Array.from(divisionBreakdownMap.entries()).map(
    ([division, value]) => ({
      division,
      revenue: value.revenue,
      orders: value.orders,
    }),
  );

  const weeklyRevenueRows = Array.from(weeklyRevenueMap.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-12);
  const weeklyRevenue = weeklyRevenueRows.map((row) => ({
    week: row.week,
    revenue: Number(row.revenue),
  }));

  const recentOrders: RecentOrder[] = ordersWithFees
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 180)
    .map((order) => ({
      id: order.id,
      total_amount: order.totals.totalWithFee,
      payment_status: order.payment_status,
      created_at:
        order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : new Date(order.createdAt).toISOString(),
      user: order.user,
    }));

  return {
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
    },
    weeklyRevenue,
    departmentBreakdown: departmentBreakdown.map((row) => ({
      department: row.department,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    })),
    divisionBreakdown: divisionBreakdown.map((row) => ({
      division: row.division,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    })),
    recentOrders,
  };
}
