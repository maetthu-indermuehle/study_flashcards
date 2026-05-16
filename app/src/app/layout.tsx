import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPL Flashcards",
  description: "Canadian PPL study flashcards with spaced repetition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
