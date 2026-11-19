'use client';

import { useState } from 'react';

export function ShareStoryButton() {
  const [message, setMessage] = useState('');

  async function share() {
    const url = window.location.href;
    const text = 'My chai break story';
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        setMessage('Sharing was cancelled.');
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage('Link copied — share it with your friends.');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div>
      <button onClick={() => void share()} className="min-h-11 rounded-full bg-[#7a3e2d] px-6 py-3 text-sm font-bold text-white hover:bg-[#633327]">Share your chai break</button>
      {message && <p role="status" className="mt-2 text-xs text-[#795b48]">{message}</p>}
    </div>
  );
}
