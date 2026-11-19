import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GSC Peoples',
  description: 'HR & People CRM - GrowSpark Consulting Business Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
