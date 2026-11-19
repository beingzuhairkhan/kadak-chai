'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL, apiFetch } from '@/lib/api';
import type { Entry, Listing } from '../types';

const pageSizes = ['10', '20', '50'] as const;
const allowedStatuses = ['all', 'pending_review', 'approved', 'rejected'];
const categories = ['all', 'funny', 'nostalgic', 'wholesome', 'other'];
const sortOptions = ['newest', 'oldest', 'name', 'status', 'category'];

function SubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const urlSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const [listing, setListing] = useState<Listing>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filters = new URLSearchParams(queryString);
  const page = Math.max(1, Number(filters.get('page') || 1));
  const pageSize = pageSizes.includes(filters.get('pageSize') as (typeof pageSizes)[number])
    ? Number(filters.get('pageSize'))
    : 10;

  const updateUrl = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if ((params.get(key) || '') === value) return;
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.replace(`/admin/submissions?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    void Promise.resolve().then(() => setSearch(urlSearch));
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => updateUrl('search', search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, updateUrl]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams(queryString);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        setListing(await apiFetch<Listing>(`/api/v1/admin/entries?${params}`));
      } catch {
        setError('Could not load submissions. Check your admin session and try again.');
      } finally {
        setLoading(false);
      }
    });
  }, [queryString, page, pageSize]);

  async function exportCsv() {
    setError('');
    try {
      const params = new URLSearchParams(queryString);
      if (search.trim()) params.set('search', search.trim());
      else params.delete('search');
      const response = await fetch(`${API_URL}/api/v1/admin/entries/export.csv?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'chai-submissions.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV export failed. Check your admin session and try again.');
    }
  }

  const from = (page - 1) * pageSize;
  const rows = listing.items;
  return (
    <section className="rounded-2xl border border-[#ead9c6] bg-white/90 p-4 shadow-[0_8px_24px_rgba(75,41,27,.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black text-[#2b1a12]">All Submissions</h2><p className="mt-1 text-sm text-[#8b7565]">{listing.total} matching stories</p></div>
        <button onClick={() => void exportCsv()} className="min-h-11 rounded-full bg-[#7a3e2d] px-5 py-2 text-sm font-bold text-white">Export CSV</button>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Search submissions" placeholder="Search name, city, contact, story" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-[#d8c5ae] px-3 py-2.5 text-sm sm:col-span-2" />
        <select aria-label="Status filter" value={filters.get('status') || 'all'} onChange={(event) => updateUrl('status', event.target.value)} className="rounded-lg border border-[#d8c5ae] px-3 py-2.5 text-sm">
          {allowedStatuses.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status === 'pending_review' ? 'Pending review' : status}</option>)}
        </select>
        <select aria-label="Category filter" value={filters.get('category') || 'all'} onChange={(event) => updateUrl('category', event.target.value)} className="rounded-lg border border-[#d8c5ae] px-3 py-2.5 text-sm">
          {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}
        </select>
        <select aria-label="Sort submissions" value={filters.get('sort') || 'newest'} onChange={(event) => updateUrl('sort', event.target.value)} className="rounded-lg border border-[#d8c5ae] px-3 py-2.5 text-sm">
          {sortOptions.map((sort) => <option key={sort} value={sort}>{sort === 'newest' ? 'Newest first' : sort === 'oldest' ? 'Oldest first' : `By ${sort}`}</option>)}
        </select>
        <select aria-label="Page size" value={String(pageSize)} onChange={(event) => updateUrl('pageSize', event.target.value)} className="rounded-lg border border-[#d8c5ae] px-3 py-2.5 text-sm">
          {pageSizes.map((size) => <option key={size} value={size}>{size} per page</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-[#795b48]">From<input type="date" value={filters.get('from') || ''} onChange={(event) => updateUrl('from', event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#d8c5ae] px-2 py-2" /></label>
        <label className="flex items-center gap-2 text-xs text-[#795b48]">To<input type="date" value={filters.get('to') || ''} onChange={(event) => updateUrl('to', event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#d8c5ae] px-2 py-2" /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fae8df] px-4 py-3 text-sm text-[#96512d]">{error}</p>}
      {loading && <p className="py-8 text-center text-sm text-[#795b48]">Loading submissions…</p>}
      {!loading && rows.length === 0 && <p className="py-10 text-center text-sm text-[#795b48]">No submissions match these filters.</p>}

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[#ead9c6] text-xs uppercase text-[#8b7565]"><tr>{['Name / city', 'Contact', 'Story', 'Category', 'AI decision', 'Final status', 'Created'].map((title) => <th key={title} className="px-3 py-3">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#f0e5d8]">{rows.map((entry) => <tr key={entry._id} onClick={() => router.push(`/admin/submissions/${entry._id}`)} className="cursor-pointer hover:bg-[#fcf8f2]">
            <td className="px-3 py-3 font-semibold">{entry.name}<span className="block text-xs font-normal text-[#8b7565]">{entry.city}</span></td>
            <td className="px-3 py-3">{[entry.email, entry.phone].filter(Boolean).join(' · ') || entry.contactValue}</td><td className="max-w-[220px] px-3 py-3"><span className="line-clamp-2">{entry.story}</span></td>
            <td className="px-3 py-3 capitalize">{entry.category || '—'}</td><td className="px-3 py-3 capitalize">{entry.aiDecision || '—'}</td>
            <td className="px-3 py-3 capitalize">{entry.status === 'pending_review' ? 'Pending' : entry.status}</td><td className="px-3 py-3">{new Date(entry.createdAt).toLocaleDateString()}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mt-4 space-y-3 md:hidden">{!loading && rows.map((entry: Entry) => <Link key={entry._id} href={`/admin/submissions/${entry._id}`} className="block rounded-xl border border-[#ead9c6] bg-[#fffdf9] p-4">
        <div className="flex justify-between gap-2"><strong>{entry.name}</strong><span className="text-xs capitalize">{entry.status === 'pending_review' ? 'Pending' : entry.status}</span></div>
        <p className="mt-1 text-xs text-[#8b7565]">{entry.city} · {[entry.email, entry.phone].filter(Boolean).join(' · ') || entry.contactValue}</p><p className="mt-2 line-clamp-2 text-sm">{entry.story}</p>
        <p className="mt-2 text-xs capitalize text-[#795b48]">{entry.category || 'Uncategorized'} · AI: {entry.aiDecision || '—'}</p>
      </Link>)}</div>
      <footer className="mt-5 flex items-center justify-between border-t border-[#f0e5d8] pt-4 text-sm text-[#795b48]">
        <span>{listing.total ? from + 1 : 0}–{Math.min(from + pageSize, listing.total)} of {listing.total}</span>
        <div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => updateUrl('page', String(page - 1))} className="min-h-10 rounded-full border border-[#d8c5ae] px-4 disabled:opacity-40">Previous</button><button disabled={from + pageSize >= listing.total || loading} onClick={() => updateUrl('page', String(page + 1))} className="min-h-10 rounded-full border border-[#d8c5ae] px-4 disabled:opacity-40">Next</button></div>
      </footer>
    </section>
  );
}

export default function SubmissionsPage() {
  return <Suspense fallback={<p className="text-sm text-[#795b48]">Loading filters…</p>}><SubmissionsContent /></Suspense>;
}
