import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../app/lib/prisma';

async function main() {
  const email = 'mahh@example.com';
  const plain = '123456';
  const password = await bcrypt.hash(plain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: '马欢欢', password },
    create: { name: '马欢欢', email, password },
  });

  console.log('created:', { id: user.id, name: user.name, email: user.email });
  console.log('login with:', email, plain);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
