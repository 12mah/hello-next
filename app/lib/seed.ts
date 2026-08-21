import bcrypt from 'bcrypt';
import { prisma } from '@/app/lib/prisma';
import { customers, invoices, revenue, users,tag} from '@/app/lib/placeholder-data';

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
  await Promise.all(
    tag.map((tag) =>
      prisma.tag.upsert({
        where: { id: tag.id },
        update: { name: tag.name },
        create: { id: tag.id, name: tag.name },
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
  // 多对多中间表：给几张发票挂标签（可重复 seed）
const sampleInvoices = await prisma.invoice.findMany({
  take: 3,
  orderBy: { date: 'desc' },
  select: { id: true },
});

if (sampleInvoices.length > 0 && tag.length >= 2) {
  const links = [
    // 发票1 ← Tag1、Tag2（一张票多个标签）
    { invoiceId: sampleInvoices[0].id, tagId: tag[0].id },
    { invoiceId: sampleInvoices[0].id, tagId: tag[1].id },
    // 发票2 ← Tag3（同一标签也可再挂别的票，下面可选）
    ...(sampleInvoices[1]
      ? [{ invoiceId: sampleInvoices[1].id, tagId: tag[2].id }]
      : []),
    // 发票3 ← Tag1（Tag1 挂在多张票上 → 多对多）
    ...(sampleInvoices[2]
      ? [{ invoiceId: sampleInvoices[2].id, tagId: tag[0].id }]
      : []),
  ];

  await Promise.all(
    links.map((link) =>
      prisma.invoiceTag.upsert({
        where: {
          invoiceId_tagId: {
            invoiceId: link.invoiceId,
            tagId: link.tagId,
          },
        },
        update: {},
        create: {
          invoiceId: link.invoiceId,
          tagId: link.tagId,
        },
      }),
    ),
  );
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
    tags: tag.length,
  };
}
