import { TagField } from '@/app/lib/definitions';

export default function TagCheckboxes({
  tags,
  selectedIds = [],
}: {
  tags: TagField[];
  selectedIds?: string[];
}) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-gray-500">暂无标签，请先 seed tags 数据。</p>
    );
  }

  return (
    <fieldset className="mb-4">
      <legend className="mb-2 block text-sm font-medium">标签（可多选）</legend>
      <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <label
              key={tag.id}
              htmlFor={`tag-${tag.id}`}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                id={`tag-${tag.id}`}
                name="tagIds"
                type="checkbox"
                value={tag.id}
                defaultChecked={selectedIds.includes(tag.id)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
