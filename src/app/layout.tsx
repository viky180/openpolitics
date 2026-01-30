import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Politics - Decentralized Issue-Based Political Network",
  description: "A decentralized, issue-based political coordination platform for India. Form single-issue parties, build trust through votes, and escalate issues without central authority.",
  keywords: ["politics", "decentralized", "democracy", "India", "grassroots", "issue-based"],
  authors: [{ name: "Open Politics" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-bg-primary">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="footer border-t border-border-primary py-8 mt-auto bg-bg-secondary">
              <div className="container mx-auto px-4 text-center">
                <p className="text-text-muted text-sm">
                  Open Politics • Decentralized • No Central Authority
                </p>
                <p className="text-text-muted text-xs mt-2">
                  Exit must always be easier than control
                </p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

