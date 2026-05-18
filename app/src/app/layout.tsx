import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: {
    default: "PPL Flashcards",
    template: "%s — PPL Flashcards",
  },
  description: "Canadian PPL groundschool flashcards with spaced repetition.",
  applicationName: "PPL Flashcards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PPL Cards",
  },
  formatDetection: {
    telephone: false,
  },
};

// Viewport is exported separately — Next.js 16 requires this for
// theme-color and other viewport-related meta tags.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
