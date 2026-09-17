import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  themeColor: '#FF6A00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Municipal Teachers' Day 2026 Raffle System",
  description: "Official Grand Raffle Draw, Gate Attendance Scanner, and Prize Disbursement System for Municipal Teachers' Day 2026 - Municipality of Malungon, Sarangani Province.",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "TD Raffle 2026",
  },
  openGraph: {
    title: "Municipal Teachers' Day 2026 Raffle System",
    description: "Official Grand Raffle Draw, Gate Attendance Scanner, and Prize Disbursement System for Municipal Teachers' Day 2026 - Municipality of Malungon, Sarangani Province.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Municipal Teachers' Day 2026 Raffle System",
    description: "Official Grand Raffle Draw, Gate Attendance Scanner, and Prize Disbursement System for Municipal Teachers' Day 2026 - Municipality of Malungon, Sarangani Province.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FF6A00" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TD Raffle 2026" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('td26_theme_mode');
                  if (mode === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}

                // Service Worker Registration for PWA
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('[PWA] Service Worker registered with scope:', reg.scope);
                    }).catch(function(err) {
                      console.warn('[PWA] Service Worker registration failed:', err);
                    });
                  });
                }
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

