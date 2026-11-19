'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Entry } from '../../types';

type ReviewPayload = {
  status: Entry['status'];
  category: string;
  caption: string;
  reason: string;
  overrideNote: string;
};

const card = 'rounded-xl border border-[#ead9c6] bg-white/90 p-5 shadow-[0_8px_24px_rgba(75,41,27,.04)]';

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<ReviewPayload>({ status: 'pending_review', category: '', caption: '', reason: '', overrideNote: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const data = await apiFetch<Entry>(`/api/v1/admin/entries/${encodeURIComponent(id)}`);
        setEntry(data);
        setDraft({
          status: data.status,
          category: data.category || '',
          caption: data.caption || '',
          reason: data.rejectionReason || '',
          overrideNote: data.overrideNote || '',
        });
      } catch {
        setError('Could not load this submission.');
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  async function saveReview() {
    if (!entry?.updatedAt) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiFetch<Entry>(`/api/v1/admin/entries/${encodeURIComponent(id)}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ ...draft, category: draft.category || null, expectedUpdatedAt: entry.updatedAt }),
      });
      setEntry(updated);
      setNotice('Review saved.');
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes('changed') ? reason.message : 'Could not save review. Check the fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-[#795b48]">Loading submission…</p>;
  if (!entry) return <p role="alert" className="rounded-lg bg-[#fae8df] p-4 text-sm text-[#96512d]">{error || 'Submission not found.'}</p>;

  const publicUrl = entry.publicId ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/entry/${entry.publicId}` : '';
  return (
    <>
      <Link href="/admin/submissions" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#7a3e2d]">← All submissions</Link>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fae8df] p-3 text-sm text-[#96512d]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-[#e5f1e7] p-3 text-sm text-[#3d7447]">{notice}</p>}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className={card}>
          <h2 className="text-xl font-black">{entry.name}</h2>
          <p className="mt-1 text-sm text-[#795b48]">{entry.city} · {[entry.email, entry.phone].filter(Boolean).join(' · ') || `${entry.contactType}: ${entry.contactValue}`}</p>
          <div className="mt-5 whitespace-pre-wrap rounded-xl bg-[#fcf8f2] p-4 text-sm leading-7">{entry.story}</div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-[#8b7565]">Consent</dt><dd>{entry.consent ? 'Yes' : 'No'} · {entry.consentAt ? new Date(entry.consentAt).toLocaleString() : '—'}</dd></div>
            <div><dt className="text-[#8b7565]">Created</dt><dd>{new Date(entry.createdAt).toLocaleString()}</dd></div>
            <div><dt className="text-[#8b7565]">Updated</dt><dd>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '—'}</dd></div>
            <div><dt className="text-[#8b7565]">IP hash</dt><dd className="break-all font-mono text-xs">{entry.ipHash || '—'}</dd></div>
          </dl>
          {entry.status === 'approved' && publicUrl && <a className="mt-5 inline-block font-semibold text-[#7a3e2d] underline" href={publicUrl} target="_blank" rel="noreferrer">Open public poster</a>}
        </section>

        <section className={card}>
          <h2 className="font-bold">Review decision</h2>
          <label className="mt-4 block text-sm font-semibold">Final status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Entry['status'] })} className="mt-1 w-full rounded-lg border border-[#d8c5ae] bg-white p-2.5">
              <option value="approved">Approved</option><option value="rejected">Rejected</option><option value="pending_review">Pending review</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">Final category
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 w-full rounded-lg border border-[#d8c5ae] bg-white p-2.5">
              <option value="">No category</option><option value="funny">Funny</option><option value="nostalgic">Nostalgic</option><option value="wholesome">Wholesome</option><option value="other">Other</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">Poster caption (max 12 words)
            <input value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className="mt-1 w-full rounded-lg border border-[#d8c5ae] px-3 py-2.5" />
          </label>
          <label className="mt-3 block text-sm font-semibold">Rejection reason
            <textarea value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-[#d8c5ae] px-3 py-2.5" />
          </label>
          <label className="mt-3 block text-sm font-semibold">Override note
            <textarea value={draft.overrideNote} onChange={(event) => setDraft({ ...draft, overrideNote: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-[#d8c5ae] px-3 py-2.5" />
          </label>
          <button disabled={saving} onClick={() => void saveReview()} className="mt-4 min-h-11 w-full rounded-full bg-[#7a3e2d] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save review'}</button>
        </section>
      </div>

      <section className={card}>
        <h2 className="font-bold">Original AI result (read-only)</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-[#8b7565]">Decision</dt><dd className="capitalize">{entry.aiDecision || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Reason</dt><dd>{entry.aiReason || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Category</dt><dd className="capitalize">{entry.aiCategory || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Caption</dt><dd>{entry.aiCaption || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Provider / model</dt><dd>{entry.aiProvider || '—'} / {entry.aiModel || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Attempts / latency</dt><dd>{entry.aiAttempts ?? 0} / {entry.aiLatencyMs ?? 0} ms</dd></div>
          <div><dt className="text-[#8b7565]">AI error</dt><dd>{entry.aiError || '—'}</dd></div>
          <div><dt className="text-[#8b7565]">Override history</dt><dd>{entry.overriddenAt ? `${new Date(entry.overriddenAt).toLocaleString()} · ${entry.overrideNote || 'No note'}` : 'No override recorded'}</dd></div>
        </dl>
        <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-[#7a3e2d]">Raw AI output</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg bg-[#fcf8f2] p-3 text-xs">{entry.aiRaw || 'No raw output recorded.'}</pre></details>
      </section>
    </>
  );
}
