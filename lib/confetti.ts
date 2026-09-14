import confetti from 'canvas-confetti';

export function triggerConfetti() {
  if (typeof window === 'undefined') return;

  try {
    // Left side burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 65,
      origin: { x: 0.1, y: 0.7 },
      colors: ['#EA580C', '#F97316', '#FBBF24', '#34D399', '#FFFFFF']
    });

    // Right side burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 65,
      origin: { x: 0.9, y: 0.7 },
      colors: ['#EA580C', '#F97316', '#FBBF24', '#34D399', '#FFFFFF']
    });

    // Center grand burst after 300ms
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#EA580C', '#F97316', '#FBBF24', '#60A5FA', '#FFFFFF']
      });
    }, 300);
  } catch (err) {
    // Confetti fallback if canvas is restricted
  }
}
