'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Application client-side exception caught:', error);

    // If it's a chunk loading failure caused by a new version deployment,
    // automatically reload once to fetch the latest bundles without user friction
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const hasAutoReloaded = sessionStorage.getItem('td26_chunk_reload');
      if (!hasAutoReloaded) {
        const reloadPage = () => {
          window.location.reload();
        };

        if (typeof caches !== 'undefined') {
          caches.keys().then((names) => {
            Promise.all(names.map((n) => caches.delete(n))).finally(reloadPage);
          }).catch(reloadPage);
        } else {
          reloadPage();
        }
      }
    }
  }, [error]);

  const handleResetCache = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('td26_chunk_reload');

        // Clear Service Worker CacheStorage
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch (err) {
            console.warn('Cache storage clear failed:', err);
          }
        }

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('td26_') || key.startsWith('teachers_day_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        window.location.href = '/';
      }
    } catch (e) {
      console.error('Failed to clear cache:', e);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#f8f7f4] flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-lg w-full bg-[#1a1a1a] border-2 border-[#ff6a00] p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[#ff6a00] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#ff6a00]">
            System Recovery Mode
          </span>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
            Application Recovery
          </h1>
          <p className="font-mono text-xs text-[#f8f7f4]/60 mt-2 leading-relaxed">
            The application encountered a client-side exception. You can reload the view or purge local browser storage to resume immediately.
          </p>
        </div>

        {error?.message && (
          <div className="bg-black/50 border border-white/10 p-3 font-mono text-[11px] text-red-300 break-words max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 bg-[#ff6a00] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#ff8533] transition-colors cursor-pointer text-center"
          >
            Try Again
          </button>
          <button
            onClick={handleResetCache}
            className="flex-1 py-3 px-4 bg-[#2a2a2a] border border-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors cursor-pointer text-center"
          >
            Clear Cache &amp; Reload
          </button>
        </div>
      </div>
    </div>
  );
}
