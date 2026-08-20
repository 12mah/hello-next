import bcrypt from 'bcrypt';
import { prisma } from '@/app/lib/prisma';
import { customers, invoices, revenue, users } from '@/app/lib/placeholder-data';

export async function seedDatabase() {
  // 保证本地/Neon 可用 uuid 默认值（表已存在时无害）
  await prisma.$executeRawUnsafe(
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  );

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword,
        },
      });
    }),
  );

  // 一对一：库里每个用户一份空/默认资料（已有则不覆盖用户已改过的字段）
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  await Promise.all(
    allUsers.map((user) =>
      prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          nickname: user.name,
          avatarUrl: null,
          phone: null,
          bio: null,
        },
      }),
    ),
  );

  await Promise.all(
    customers.map((customer) =>
      prisma.customer.upsert({
        where: { id: customer.id },
        update: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          imageUrl: customer.image_url,
        },
        create: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          imageUrl: customer.image_url,
        },
      }),
    ),
  );

  // 发票 placeholder 无固定 id，重复 seed 会叠加；仅在空表时灌入
  const invoiceCount = await prisma.invoice.count();
  if (invoiceCount === 0) {
    await prisma.invoice.createMany({
      data: invoices.map((invoice) => ({
        customerId: invoice.customer_id,
        amount: invoice.amount,
        status: invoice.status,
        date: new Date(invoice.date),
      })),
    });
  }

  await Promise.all(
    revenue.map((rev) =>
      prisma.revenue.upsert({
        where: { month: rev.month },
        update: { revenue: rev.revenue },
        create: { month: rev.month, revenue: rev.revenue },
      }),
    ),
  );

  return {
    users: users.length,
    profiles: allUsers.length,
    customers: customers.length,
    invoices: invoiceCount === 0 ? invoices.length : invoiceCount,
    invoicesSeeded: invoiceCount === 0,
    revenue: revenue.length,
  };
}
