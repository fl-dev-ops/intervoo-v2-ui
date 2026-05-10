import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@livekit/components-styles";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diagnostics | Intervoo.ai",
  description: "Diagnostics by Intervoo.ai",
  openGraph: {
    title: "Diagnostics | Intervoo.ai",
    description: "Diagnostics by Intervoo.ai",
    siteName: "Diagnostics | Intervoo.ai",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Diagnostics | Intervoo.ai",
    description: "Diagnostics by Intervoo.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
