'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application exception:', error);
  }, [error]);

  const handleClearCache = () => {
    try {
      if (typeof window !== 'undefined') {
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
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <html lang="en">
      <body style={{ backgroundColor: '#121212', color: '#f8f7f4', fontFamily: 'monospace', padding: '2rem' }}>
        <div style={{ maxWidth: '500px', margin: '4rem auto', border: '2px solid #ff6a00', padding: '2rem', background: '#1a1a1a' }}>
          <h2 style={{ color: '#ff6a00', margin: '0 0 1rem 0' }}>APPLICATION RECOVERY</h2>
          <p style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.6 }}>
            A client-side exception occurred while rendering the page. Click below to clear stored state and resume.
          </p>
          {error?.message && (
            <pre style={{ background: '#000', padding: '0.8rem', color: '#ff8585', fontSize: '11px', overflow: 'auto', maxHeight: '120px' }}>
              {error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button
              onClick={() => reset()}
              style={{ flex: 1, padding: '10px', background: '#ff6a00', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              TRY AGAIN
            </button>
            <button
              onClick={handleClearCache}
              style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}
            >
              PURGE STORAGE &amp; RELOAD
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
