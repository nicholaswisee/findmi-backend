import { db, schema } from './db';
import { sql, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Configurable sizes
const NUM_USERS = Number(process.env.SEED_NUM_USERS ?? 100);
const NUM_ACCOUNTS = Number(process.env.SEED_NUM_ACCOUNTS ?? NUM_USERS);
const NUM_PRODUCTS = Number(process.env.SEED_NUM_PRODUCTS ?? 120);
const NUM_BUNDLES = Number(process.env.SEED_NUM_BUNDLES ?? 80);
const NUM_CARTS = Number(process.env.SEED_NUM_CARTS ?? 120);
const NUM_CART_ITEMS = Number(
  process.env.SEED_NUM_CART_ITEMS ?? Math.max(NUM_CARTS * 2, 240),
);
const NUM_ORDERS = Number(process.env.SEED_NUM_ORDERS ?? 220);
const NUM_ORDER_ITEMS = Number(
  process.env.SEED_NUM_ORDER_ITEMS ?? Math.max(NUM_ORDERS * 2, 240),
);

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[randInt(0, arr.length - 1)];
}

const departments = [
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
  'Panitia',
  'none',
] as const;

const divisions = [
  'Sekretaris',
  'Bendahara',
  'Sekretaris & Bendahara',
  'Perizinan',
  'MSDM',
  'PSDM',
  'Pengawasan',
  'Eksekusi',
  'Lapangan',
  'Tour',
  'Event Organizer',
  'Exhibition',
  'Pre-Event',
  'Intrakampus',
  'Ekstrakampus',
  'Grafis',
  'Dokumentasi',
  'Publikasi',
  'Musik',
  'Properti',
  'Diseminasi Umum',
  'Diseminasi Khusus',
  'Roadshow Paguyuban',
  'Forum Paguyuban',
  'Sponsorship',
  'Entrepreneurship',
  'Logistik',
  'Produksi',
  'Akomodasi dan Transportasi',
  'IT',
  'Panitia',
  'none',
] as const;

const ranks = [
  'Ketua',
  'Kepala Bidang',
  'Wakil Kepala Bidang',
  'Kepala Divisi',
  'Wakil Kepala Divisi',
  'Kepala Subdivisi',
  'Wakil Kepala Subdivisi',
  'Staff',
  'none',
] as const;

const roles = ['user', 'admin', 'subadmin'] as const;

const paymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'] as const;
const paymentMethods = ['Manual', 'Xendit', 'Midtrans', 'GoPay'] as const;

const DEFAULT_ADMIN_NIM = process.env.SEED_ADMIN_NIM ?? '13524034';
const DEFAULT_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? 'Password123!';
const DEFAULT_ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL ?? '13524034@admin.findmi.local';
const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? '13524034';

function randomDateWithinPastWeeks(weeks = 24) {
  const now = new Date();
  const totalDays = weeks * 7;
  const offsetDays = randInt(0, totalDays);
  const result = new Date(now);
  result.setDate(now.getDate() - offsetDays);
  result.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
  return result;
}

async function resetAll() {
  console.log('Truncating tables...');
  await db.execute(
    sql`TRUNCATE TABLE order_items, orders, cart_items, carts, bundles, products, accounts, users RESTART IDENTITY CASCADE`,
  );
}

async function seedUsers() {
  console.log(`Seeding ${NUM_USERS} users...`);
  const usersValues = Array.from({ length: NUM_USERS }, (_, i) => ({
    name: `User ${i + 1}`,
    department: pick(departments),
    division: pick(divisions),
    rank: pick(ranks),
    nim: String(13500000 + i),
    no_wa: `0812${String(34567890 + i).slice(0, 8)}`,
    line_id: `lineuser${i + 1}`,
    role: pick(roles),
  }));
  const inserted = await db
    .insert(schema.usersTable)
    .values(usersValues)
    .returning({ id: schema.usersTable.id });
  return inserted.map((r) => r.id);
}

async function seedAccounts(userIds: number[]) {
  console.log(`Seeding ${NUM_ACCOUNTS} accounts...`);
  // Two–three password variants; allow override via env list
  const envPw = process.env.SEED_PASSWORDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const PASSWORD_VARIANTS =
    envPw && envPw.length >= 2
      ? envPw.slice(0, 3)
      : ['Password123!', 'Admin!234', 'User@2025'];

  console.log('Plaintext password variants to try:');
  PASSWORD_VARIANTS.forEach((p, i) => console.log(`- Variant ${i + 1}: ${p}`));

  // Pre-hash variants once
  const hashedByVariant = Object.fromEntries(
    await Promise.all(
      PASSWORD_VARIANTS.map(
        async (p) => [p, await bcrypt.hash(p, 10)] as const,
      ),
    ),
  ) as Record<string, string>;

  const localAccountsPlain: Array<{
    email: string;
    nim: string;
    password: string;
  }> = [];

  const accountsValues = Array.from({ length: NUM_ACCOUNTS }, (_, i) => {
    const userId = userIds[i % userIds.length];

    // Ensure first 6 are local and cover all variants; others ~40% local
    const forceLocal = i < 6;
    const isLocal = forceLocal || Math.random() < 0.4;

    const email = forceLocal
      ? `testuser${i + 1}@example.com`
      : `user${i + 1}@example.com`;

    if (isLocal) {
      const variant = PASSWORD_VARIANTS[i % PASSWORD_VARIANTS.length];
      const hash = hashedByVariant[variant];
      const userId = userIds[i % userIds.length];
      const nim = String(13500000 + (userId - 1));
      localAccountsPlain.push({ email, nim, password: variant });
      return {
        provider: 'local',
        provider_id: `local_${i + 1}_${Date.now()}`,
        email,
        user_id: userId,
        password: hash,
      };
    }

    return {
      provider: 'google',
      provider_id: `google_${i + 1}_${Date.now()}`,
      email,
      user_id: userId,
      password: null,
    };
  });

  console.log('Local test accounts (nim, email -> plaintext password)');
  localAccountsPlain.forEach(({ email, nim, password }) =>
    console.log(`- ${nim}, ${email} -> ${password}`),
  );

  const inserted = await db
    .insert(schema.accountsTable)
    .values(accountsValues)
    .returning({ id: schema.accountsTable.id });
  return inserted.map((r) => r.id);
}

async function seedAdminUser() {
  console.log('Ensuring default admin account...');
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const existingUser = await db
    .select({ id: schema.usersTable.id })
    .from(schema.usersTable)
    .where(eq(schema.usersTable.nim, DEFAULT_ADMIN_NIM))
    .limit(1);

  let userId: number;

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    await db
      .update(schema.usersTable)
      .set({
        name: DEFAULT_ADMIN_NAME,
        department: 'IT',
        division: 'IT',
        rank: 'Ketua',
        no_wa: '081234567890',
        line_id: 'admin13524034',
        role: 'admin',
        updated_at: new Date(),
      })
      .where(eq(schema.usersTable.id, userId));
    await db
      .delete(schema.accountsTable)
      .where(eq(schema.accountsTable.user_id, userId));
  } else {
    const [insertedUser] = await db
      .insert(schema.usersTable)
      .values({
        name: DEFAULT_ADMIN_NAME,
        department: 'IT',
        division: 'IT',
        rank: 'Ketua',
        nim: DEFAULT_ADMIN_NIM,
        no_wa: '081234567890',
        line_id: 'admin13524034',
        role: 'admin',
      })
      .returning({ id: schema.usersTable.id });
    userId = insertedUser.id;
  }

  await db.insert(schema.accountsTable).values({
    provider: 'local',
    provider_id: `admin_${DEFAULT_ADMIN_NIM}`,
    email: DEFAULT_ADMIN_EMAIL,
    user_id: userId,
    password: passwordHash,
  });

  console.log(
    `Admin account created. NIM: ${DEFAULT_ADMIN_NIM} Password: ${DEFAULT_ADMIN_PASSWORD}`,
  );

  return userId;
}

async function seedProducts() {
  console.log(`Seeding ${NUM_PRODUCTS} products...`);
  const productsValues = Array.from({ length: NUM_PRODUCTS }, (_, i) => ({
    name: `Product ${i + 1}`,
    description: `Description for product ${i + 1}`,
    price: randInt(10, 200) * 1000,
    category: pick(departments),
    image_url: `https://example.com/product-${i + 1}.png`,
  }));
  const inserted = await db
    .insert(schema.productsTable)
    .values(productsValues)
    .returning({ id: schema.productsTable.id });
  return inserted.map((r) => r.id);
}

async function seedBundles(productIds: number[]) {
  console.log(`Seeding ${NUM_BUNDLES} bundles...`);
  const bundlesValues = Array.from({ length: NUM_BUNDLES }, (_, i) => {
    const itemsCount = randInt(2, 4);
    const picked = new Set<number>();
    const bundleItems = Array.from({ length: itemsCount }, () => {
      let pid = pick(productIds);
      while (picked.has(pid)) pid = pick(productIds);
      picked.add(pid);
      return { product_id: pid, amount: randInt(1, 3) };
    });
    return {
      name: `Bundle ${i + 1}`,
      description: `Bundle description ${i + 1}`,
      bundle_items: bundleItems as any,
      image_url: `https://example.com/bundle-${i + 1}.png`,
      price: randInt(20, 400) * 1000,
      category: pick(departments),
      is_hidden: Math.random() < 0.1,
    };
  });
  const inserted = await db
    .insert(schema.bundlesTable)
    .values(bundlesValues)
    .returning({ id: schema.bundlesTable.id });
  return inserted.map((r) => r.id);
}

async function seedCarts(userIds: number[]) {
  console.log(`Seeding ${NUM_CARTS} carts...`);
  const cartValues = Array.from({ length: NUM_CARTS }, (_, i) => ({
    user_id: userIds[i % userIds.length],
  }));
  const inserted = await db
    .insert(schema.cartsTable)
    .values(cartValues)
    .returning({ id: schema.cartsTable.id });
  return inserted.map((r) => r.id);
}

async function seedCartItems(
  cartIds: number[],
  productIds: number[],
  bundleIds: number[],
) {
  console.log(`Seeding ${NUM_CART_ITEMS} cart items...`);
  const values = Array.from({ length: NUM_CART_ITEMS }, () => {
    const isProduct = Math.random() < 0.6;
    const base = { cart_id: pick(cartIds), quantity: randInt(1, 5) } as any;
    if (isProduct) {
      base.product_id = pick(productIds);
      base.bundle_id = null;
    } else {
      base.product_id = null;
      base.bundle_id = pick(bundleIds);
    }
    return base;
  });
  await db.insert(schema.cartItemsTable).values(values);
}

async function seedOrders(userIds: number[]) {
  console.log(`Seeding ${NUM_ORDERS} orders...`);
  const values = Array.from({ length: NUM_ORDERS }, () => {
    const createdAt = randomDateWithinPastWeeks(26);
    const payment_status = Math.random() < 0.7 ? 'Paid' : pick(paymentStatuses);
    const transaction_id =
      payment_status === 'Paid' || Math.random() < 0.4
        ? `tx_${createdAt.getTime()}_${randInt(1000, 9999)}`
        : null;
    return {
      user_id: pick(userIds),
      total_amount: randInt(30, 800) * 1000,
      payment_status,
      payment_method: pick(paymentMethods),
      transaction_id,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
  const inserted = await db
    .insert(schema.ordersTable)
    .values(values)
    .returning({ id: schema.ordersTable.id });
  return inserted.map((r) => r.id);
}

async function seedOrderItems(
  orderIds: number[],
  productIds: number[],
  bundleIds: number[],
) {
  console.log(`Seeding ${NUM_ORDER_ITEMS} order items...`);
  const values = Array.from({ length: NUM_ORDER_ITEMS }, () => {
    const isProduct = Math.random() < 0.7;
    const base = {
      order_id: pick(orderIds),
      quantity: randInt(1, 5),
      unit_price: randInt(10, 300) * 1000,
    } as any;
    if (isProduct) {
      base.product_id = pick(productIds);
      base.bundle_id = null;
    } else {
      base.product_id = null;
      base.bundle_id = pick(bundleIds);
    }
    return base;
  });
  await db.insert(schema.orderItemsTable).values(values);
}

async function main() {
  const shouldReset = process.env.SEED_RESET !== 'false';
  if (shouldReset) {
    await resetAll();
  }

  const userIds = await seedUsers();
  await seedAccounts(userIds);
  const adminUserId = await seedAdminUser();
  if (!userIds.includes(adminUserId)) {
    userIds.push(adminUserId);
  }

  const productIds = await seedProducts();
  const bundleIds = await seedBundles(productIds);

  const cartIds = await seedCarts(userIds);
  await seedCartItems(cartIds, productIds, bundleIds);

  const orderIds = await seedOrders(userIds);
  await seedOrderItems(orderIds, productIds, bundleIds);

  console.log('Seeding completed.');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
