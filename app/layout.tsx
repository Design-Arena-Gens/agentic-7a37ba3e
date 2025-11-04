import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Manga to Anime Agent',
  description: 'Autonomous agent that synthesizes anime sequences from manga scans.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-ink-900">
      <body className={`${inter.className} bg-ink-900`}>{children}</body>
    </html>
  );
}
