require('dotenv').config({ path: '.env' });

const fs = require('fs');
const path = require('path');
const Module = require('module');
const bcrypt = require('bcrypt');
const postgres = require('postgres');
function loadPlaceholderData() {
  const dataPath = path.join(__dirname, '../app/lib/placeholder-data.ts');
  const source = fs
    .readFileSync(dataPath, 'utf8')
    .replace(/export\s*\{([^}]+)\};?/, 'module.exports = {$1};');

  const mod = new Module(dataPath);
  mod.filename = dataPath;
  mod.paths = Module._nodeModulePaths(path.dirname(dataPath));
  mod._compile(source, dataPath);
  return mod.exports;
}

const { invoices, customers, revenue, users } = loadPlaceholderData();
const isLocalDb =
  /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL || '');
const sql = postgres(process.env.POSTGRES_URL, {
  ssl: isLocalDb ? false : 'require',
});

async function seedUsers(tx) {
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await tx`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return tx`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );
}

async function seedCustomers(tx) {
  await tx`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  await Promise.all(
    customers.map(
      (customer) => tx`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );
}

async function seedInvoices(tx) {
  await tx`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  await Promise.all(
    invoices.map(
      (invoice) => tx`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );
}

async function seedRevenue(tx) {
  await tx`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  await Promise.all(
    revenue.map(
      (rev) => tx`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('缺少 POSTGRES_URL，请检查 .env 文件');
  }
  await sql.begin(async (tx) => {
    await seedUsers(tx);
    await seedCustomers(tx);
    await seedInvoices(tx);
    await seedRevenue(tx);
  });

  console.log('✅ 数据库种子数据填充成功！');
  await sql.end();
}

main().catch(async (err) => {
  console.error('❌ 填充数据库时发生错误:', err);
  try {
    await sql.end();
  } catch {}
  process.exit(1);
});
