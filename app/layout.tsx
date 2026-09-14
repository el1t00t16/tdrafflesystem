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
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
