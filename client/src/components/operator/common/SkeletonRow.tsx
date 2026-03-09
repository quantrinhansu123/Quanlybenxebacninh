export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-8 w-20 bg-slate-200 rounded-lg" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
          <div className="h-4 w-48 bg-slate-200 rounded" />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 bg-slate-200 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-6 w-12 bg-slate-200 rounded-full mx-auto" />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-6 w-20 bg-slate-200 rounded-full mx-auto" />
      </td>
      <td className="px-6 py-4">
        <div className="h-8 w-24 bg-slate-200 rounded mx-auto" />
      </td>
    </tr>
  );
}
