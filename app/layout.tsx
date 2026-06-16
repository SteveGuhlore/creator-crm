import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Creator CRM',
  description: 'Per-platform CRM for managing creator accounts (mock + CSV data).',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
