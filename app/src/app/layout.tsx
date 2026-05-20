import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    // suppressHydrationWarning prevents a React mismatch warning when
    // ThemeProvider adds the "dark" class client-side after hydration.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      {/* Runs before React renders — reads localStorage and applies 'dark' to <html>
          so there is no flash of wrong theme on load. Must stay inline/sync. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s?s==='dark':p)document.documentElement.classList.add('dark');}catch(e){}})()` }} />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 dark:bg-slate-900 transition-colors duration-200 safe-top">
        <ThemeProvider>
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
