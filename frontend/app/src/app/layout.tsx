import './globals.css';

export const metadata = {
  title: 'Speak2Study 2.0',
  description: 'AI-Powered Flashcard Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}