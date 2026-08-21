import Form from '@/app/ui/invoices/create-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchCustomers, fetchTags } from '@/app/lib/data';

export default async function Page() {
  const [customers, tags] = await Promise.all([
    fetchCustomers(),
    fetchTags(),
  ]);

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: '发票', href: '/dashboard/invoices' },
          {
            label: '创建发票',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Form customers={customers} tags={tags} />
    </main>
  );
}
