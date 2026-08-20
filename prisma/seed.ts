import 'dotenv/config';
import { seedDatabase } from '../app/lib/seed';

async function main() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    throw new Error('缺少 DATABASE_URL / POSTGRES_URL，请检查 .env 文件');
  }

  const result = await seedDatabase();
  console.log('✅ 数据库种子数据填充成功！', result);
}

main()
  .catch((err) => {
    console.error('❌ 填充数据库时发生错误:', err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../app/lib/prisma');
    await prisma.$disconnect();
  });
