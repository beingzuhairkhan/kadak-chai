import type { Stats } from '../types';

type Props = { stats: Stats };

export function StatusDistribution({ stats }: Props) {
  const total = stats.pending + stats.approved + stats.rejected;
  const pendingEnd = total ? (stats.pending / total) * 100 : 0;
  const approvedEnd = total ? pendingEnd + (stats.approved / total) * 100 : 0;
  const chartStyle = {
    background: total
      ? `conic-gradient(#d7a762 0% ${pendingEnd}%, #6eaa7a ${pendingEnd}% ${approvedEnd}%, #bf6a3d ${approvedEnd}% 100%)`
      : '#ead9c6',
  };
  const items = [
    { label: 'Pending', value: stats.pending, color: 'bg-[#d7a762]' },
    { label: 'Approved', value: stats.approved, color: 'bg-[#6eaa7a]' },
    { label: 'Rejected', value: stats.rejected, color: 'bg-[#bf6a3d]' },
  ];

  return (
    <section id="status" className="rounded-xl border border-[#ead9c6] bg-white/90 p-5 shadow-[0_8px_24px_rgba(75,41,27,.04)]">
      <h2 className="font-bold text-[#2b1a12]">Submission status distribution</h2>
      <div className="mt-5 flex items-center justify-center gap-5 sm:gap-8">
        <div className="relative size-48 shrink-0 rounded-full p-0.5 sm:size-56" style={chartStyle}>
          <div className="absolute inset-[18%] grid place-content-center rounded-full bg-white text-center">
            <span className="text-3xl font-bold text-[#2b1a12]">{total.toLocaleString()}</span>
            <span className="text-[11px] text-[#8b7565]">Submissions</span>
          </div>
        </div>
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs text-[#795b48]">
              <span className={`size-2.5 rounded-sm ${item.color}`} />{item.label}
              <strong className="ml-auto pl-2 text-[#4b2d1d]">{item.value.toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
