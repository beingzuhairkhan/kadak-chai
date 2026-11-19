'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CircleCheckBig, Clock3, Files, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { MetricCard } from './components/metric-card';
import { StatusDistribution } from './components/status-distribution';
import { SubmissionTrends } from './components/submission-trends';
import type { Stats } from './types';

const emptyStats: Stats = { total: 0, approved: 0, rejected: 0, pending: 0, today: 0, fallback: 0, trends: [] };

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        setStats(await apiFetch<Stats>('/api/v1/admin/stats'));
      } catch {
        setError('Could not load campaign statistics.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <>
      {error && <p role="alert" className="rounded-lg bg-[#fae8df] px-4 py-3 text-sm text-[#96512d]">{error}</p>}
      {loading && <p className="text-sm text-[#795b48]">Loading campaign overview…</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total submissions" value={stats.total} note="All time" icon={Files} color="bg-[#f4e7c9]" iconColor="text-[#8d4b2d]" />
        <MetricCard label="Approved" value={stats.approved} note="Published" icon={CircleCheckBig} color="bg-[#e5f1e7]" iconColor="text-[#5d9568]" />
        <MetricCard label="Rejected" value={stats.rejected} note="Reviewed" icon={ShieldAlert} color="bg-[#fae8df]" iconColor="text-[#bf6a3d]" />
        <MetricCard label="Pending review" value={stats.pending} note="Needs attention" icon={Clock3} color="bg-[#f6edda]" iconColor="text-[#a87834]" />
        <MetricCard label="Submitted today" value={stats.today} note="Today" icon={Sparkles} color="bg-[#f4e7c9]" iconColor="text-[#8d4b2d]" />
      </section>
      <Link href="/admin/submissions?status=pending_review" className="block rounded-xl border border-[#d8b995] bg-[#fff9f0] p-4 text-sm font-bold text-[#7a3e2d] hover:bg-white">
        Needs review: {stats.pending} {stats.pending === 1 ? 'story' : 'stories'} →
      </Link>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
        <SubmissionTrends trends={stats.trends} />
        <StatusDistribution stats={stats} />
      </section>
      {stats.fallback > 0 && <p className="text-xs text-[#795b48]">Answered by fallback provider: {stats.fallback}</p>}
    </>
  );
}
