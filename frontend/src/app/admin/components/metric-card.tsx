import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
};

export function MetricCard({ label, value, note, icon: Icon, color, iconColor }: Props) {
  return (
    <article className="rounded-xl border border-[#ead9c6] bg-white/90 px-4 py-4 shadow-[0_8px_24px_rgba(75,41,27,.04)]">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${color}`}><Icon className={iconColor} size={19} /></span>
        <p className="text-xs font-semibold leading-4 text-[#795b48]">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 pl-1">
        <span className="text-[38px] font-bold leading-none tracking-tight text-[#2b1a12]">{value.toLocaleString()}</span>
        <span className="text-[11px] text-[#8b7565]">{note}</span>
      </div>
      <p className="mt-4 pl-1 text-[11px] text-[#8b7565]">Campaign submissions</p>
    </article>
  );
}
