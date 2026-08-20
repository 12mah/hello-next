import Pagination from '@/app/ui/invoices/pagination';
import PageSizeSelect from '@/app/ui/invoices/page-size-select';
import Search from '@/app/ui/search';
import Table from '@/app/ui/invoices/table';
import { CreateInvoice } from '@/app/ui/invoices/buttons';
import { lusitana } from '@/app/ui/fonts';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { fetchInvoicesCount, fetchInvoicesPages } from '@/app/lib/data';

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = [10, 20, 50];

function resolvePageSize(raw?: string) {
  const size = Number(raw) || DEFAULT_PAGE_SIZE;
  return ALLOWED_PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE;
}

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = resolvePageSize(searchParams?.pageSize);
  const [totalCount, totalPages] = await Promise.all([
    fetchInvoicesCount(query),
    fetchInvoicesPages(query, pageSize),
  ]);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>发票</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="搜索发票..." />
        <CreateInvoice />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">共 {totalCount} 条</p>
        <PageSizeSelect defaultValue={DEFAULT_PAGE_SIZE} />
      </div>
      <Suspense
        key={`${query}-${currentPage}-${pageSize}`}
        fallback={<InvoicesTableSkeleton />}
      >
        <Table
          query={query}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      </Suspense>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
