'use client';

import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function PageSizeSelect({
  defaultValue = 10,
}: {
  defaultValue?: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const current = Number(searchParams.get('pageSize')) || defaultValue;
  const active = PAGE_SIZE_OPTIONS.includes(current) ? current : defaultValue;

  const handleChange = (value: number) => {
    if (value === active) return;
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', String(value));
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">每页条数</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {PAGE_SIZE_OPTIONS.map((size, index) => (
          <button
            key={size}
            type="button"
            onClick={() => handleChange(size)}
            className={clsx(
              'min-w-[44px] px-3 py-1.5 text-sm font-medium transition-colors',
              index > 0 && 'border-l border-gray-200',
              active === size
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-sky-50 hover:text-blue-600',
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}
