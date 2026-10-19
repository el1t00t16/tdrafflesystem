'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PreDrawWinnerViewer } from '../../components/pre-draw/PreDrawWinnerViewer';
import { Winner } from '../../lib/types';
import { 
  fetchWinnersFromSupabase, 
  isSupabaseConfigured, 
  subscribeToRealtimeUpdates 
} from '../../lib/supabase';

export default function LedWallStandalonePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [winners, setWinners] = useState<Winner[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const local = localStorage.getItem('td26_winners');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading local winners:', e);
    }
    return [];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Hydrate from Supabase Cloud and subscribe to live changes
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchWinnersFromSupabase()
        .then((remoteWinners) => {
          if (remoteWinners && remoteWinners.length > 0) {
            setWinners((prev) => {
              const map = new Map<string, Winner>();
              prev.forEach((w) => map.set(w.winnerId, w));
              remoteWinners.forEach((w) => map.set(w.winnerId, w));
              const merged = Array.from(map.values());
              try {
                localStorage.setItem('td26_winners', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        })
        .catch((err) => console.warn('Supabase hydration notice:', err));

      const unsubscribe = subscribeToRealtimeUpdates({
        onWinnerChange: (newOrUpdatedWinner) => {
          setWinners((prev) => {
            const idx = prev.findIndex((w) => w.winnerId === newOrUpdatedWinner.winnerId);
            let next: Winner[];
            if (idx >= 0) {
              next = [...prev];
              next[idx] = newOrUpdatedWinner;
            } else {
              next = [newOrUpdatedWinner, ...prev];
            }
            try {
              localStorage.setItem('td26_winners', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        },
        onWinnerDelete: (deletedWinnerId) => {
          setWinners((prev) => {
            const next = prev.filter((w) => w.winnerId !== deletedWinnerId);
            try {
              localStorage.setItem('td26_winners', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-neutral-400 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#ff6a00] mr-2" />
        Loading LED Wall Showcase...
      </div>
    );
  }

  return (
    <PreDrawWinnerViewer
      winners={winners}
      onBack={() => {
        router.push('/');
      }}
      isFullscreen={isFullscreen}
      onToggleFullscreen={handleToggleFullscreen}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled((prev) => !prev)}
      eventName="MUNICIPAL TEACHERS' DAY 2026"
    />
  );
}
