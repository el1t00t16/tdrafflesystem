import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Municipal Teachers' Day 2026 Raffle System",
  description: "A reliable, projector-ready raffle system for Municipal Teachers' Day 2026 in Malungon with 5 simultaneous district cards and complete Google Apps Script / Google Sheets integration.",
  openGraph: {
    title: "Municipal Teachers' Day 2026 Raffle System",
    description: "A reliable, projector-ready raffle system for Municipal Teachers' Day 2026 in Malungon with 5 simultaneous district cards and complete Google Apps Script / Google Sheets integration.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Municipal Teachers' Day 2026 Raffle System",
    description: "A reliable, projector-ready raffle system for Municipal Teachers' Day 2026 in Malungon with 5 simultaneous district cards and complete Google Apps Script / Google Sheets integration.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('td26_theme_preference');
                  var theme = saved || 'royal-gold';
                  document.documentElement.setAttribute('data-theme', theme);
                  var isDark = theme !== 'editorial';
                  document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
