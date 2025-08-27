import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitCheck — Virtual Try-On",
  description: "AI-powered virtual try-on & digital closet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased flex flex-col`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30">
          <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-7 rounded-md gradient-primary" />
              <span className="font-semibold tracking-wide">FitCheck</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="hidden sm:inline">Virtual Try-On Demo</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer (optional) */}
        <footer className="border-t border-[var(--border)] text-xs text-gray-500">
          <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
            <span>© {new Date().getFullYear()} FitCheck</span>
            <span className="hidden sm:inline">Built with Next.js</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
