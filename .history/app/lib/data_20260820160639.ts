import {
  InvoiceForm,
  InvoicesTable,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from './prisma';
import { Prisma } from '@/generated/prisma/client';

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

function invoiceSearchWhere(query: string): Prisma.InvoiceWhereInput {
  if (!query) return {};

  const or: Prisma.InvoiceWhereInput[] = [
    { customer: { name: { contains: query, mode: 'insensitive' } } },
    { customer: { email: { contains: query, mode: 'insensitive' } } },
    { status: { contains: query, mode: 'insensitive' } },
  ];

  const asNumber = Number(query);
  if (!Number.isNaN(asNumber) && query.trim() !== '') {
    // 支持搜「分」或「美元」大致金额
    or.push({ amount: Math.round(asNumber) });
    or.push({ amount: Math.round(asNumber * 100) });
  }

  return { OR: or };
}

function customerSearchWhere(query: string): Prisma.CustomerWhereInput {
  if (!query) return {};
  return {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
    ],
  };
}

export async function fetchRevenue() {
  noStore();
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching revenue data...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const data = await prisma.revenue.findMany();

    if (process.env.NODE_ENV === 'development') {
      console.log('Data fetch completed after 3 seconds.');
    }

    return data as Revenue[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    const data = await prisma.invoice.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        customer: {
          select: {
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    return data.map((invoice) => ({
      id: invoice.id,
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.imageUrl,
      amount: formatCurrency(invoice.amount),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();
  try {
    const [numberOfInvoices, numberOfCustomers, paid, pending] =
      await Promise.all([
        prisma.invoice.count(),
        prisma.customer.count(),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: 'paid' },
        }),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: 'pending' },
        }),
      ]);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices: formatCurrency(paid._sum.amount ?? 0),
      totalPendingInvoices: formatCurrency(pending._sum.amount ?? 0),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
  itemsPerPage: number = 10,
) {
  noStore();
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    const invoices = await prisma.invoice.findMany({
      where: invoiceSearchWhere(query),
      orderBy: { date: 'desc' },
      skip: offset,
      take: itemsPerPage,
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        customerId: true,
        customer: {
          select: {
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    return invoices.map(
      (invoice): InvoicesTable => ({
        id: invoice.id,
        customer_id: invoice.customerId,
        amount: invoice.amount,
        date: toDateString(invoice.date),
        status: invoice.status as 'pending' | 'paid',
        name: invoice.customer.name,
        email: invoice.customer.email,
        image_url: invoice.customer.imageUrl,
      }),
    );
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesCount(query: string) {
  noStore();
  try {
    return prisma.invoice.count({
      where: invoiceSearchWhere(query),
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoicesPages(
  query: string,
  itemsPerPage: number = 10,
) {
  const count = await fetchInvoicesCount(query);
  return Math.max(1, Math.ceil(count / itemsPerPage));
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
      },
    });

    if (!invoice) return undefined;

    const result: InvoiceForm = {
      id: invoice.id,
      customer_id: invoice.customerId,
      amount: invoice.amount / 100,
      status: invoice.status as 'pending' | 'paid',
    };
    return result;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();
  try {
    return prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    const customers = await prisma.customer.findMany({
      where: customerSearchWhere(query),
      orderBy: { name: 'asc' },
      include: {
        invoices: {
          select: { amount: true, status: true },
        },
      },
    });

    return customers.map((customer) => {
      const total_invoices = customer.invoices.length;
      const total_pending = customer.invoices
        .filter((invoice) => invoice.status === 'pending')
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const total_paid = customer.invoices
        .filter((invoice) => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        image_url: customer.imageUrl,
        total_invoices,
        total_pending: formatCurrency(total_pending),
        total_paid: formatCurrency(total_paid),
      };
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
/** 读：用户 + 一对一资料（设置页用） */
export async function fetchUserWithProfile(userId: string) {
  noStore();
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch user profile.');
  }
}
