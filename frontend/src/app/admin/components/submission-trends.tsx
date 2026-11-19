type Props = { trends: { _id: string; count: number }[] };

export function SubmissionTrends({ trends }: Props) {
  const data = trends.slice(-14);
  const max = Math.max(1, ...data.map((item) => item.count));
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? 50 : 30 + (index * 640) / (data.length - 1);
    const y = 205 - (item.count / max) * 170;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = points.length ? `${path} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z` : '';

  return (
    <section id="trends" className="min-h-[320px] rounded-xl border border-[#ead9c6] bg-white/90 p-5 shadow-[0_8px_24px_rgba(75,41,27,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-[#2b1a12]">Submission trends</h2><p className="mt-1 text-xs text-[#8b7565]">Daily totals · last 14 days</p></div>
        <span className="text-xs text-[#795b48]">● Stories</span>
      </div>
      {points.length ? (
        <div className="mt-4">
          <svg viewBox="0 0 700 245" role="img" aria-label="Daily submission totals over the last 14 days" className="h-[240px] w-full overflow-visible">
            {[35, 90, 145, 200].map((y) => <line key={y} x1="30" x2="670" y1={y} y2={y} stroke="#eee5da" strokeDasharray="4 5" />)}
            <path d={area} fill="#d7a762" fillOpacity=".18" />
            <path d={path} fill="none" stroke="#8d4b2d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((point) => <circle key={point._id} cx={point.x} cy={point.y} r="4" fill="#8d4b2d" />)}
            <text x="30" y="240" fill="#8b7565" fontSize="11">{points[0]._id}</text>
            <text x="670" y="240" fill="#8b7565" fontSize="11" textAnchor="end">{points[points.length - 1]._id}</text>
          </svg>
          <p className="text-xs text-[#795b48]">Peak: {max} submissions/day</p>
        </div>
      ) : <p className="mt-8 rounded-lg border border-dashed border-[#ead9c6] bg-[#fcf8f2] p-10 text-center text-sm text-[#8b7565]">No submissions in this period yet.</p>}
    </section>
  );
}
