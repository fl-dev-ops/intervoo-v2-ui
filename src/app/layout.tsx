import type { Metadata, Viewport } from "next";
import { Figtree, Geist, Geist_Mono, Noto_Serif } from "next/font/google";
import "@livekit/components-styles";
import "./globals.css";
import { PostHogPageView, PostHogProvider } from "@posthog/next";
import { ThemeProvider } from "next-themes";
import { RazorpayProvider } from "@/components/payments/razorpay-provider";
import { PostHogIdentify } from "@/components/posthog-identify";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
});

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
  icons: {
    icon: "/favicon.ico",
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        figtree.variable,
        notoSerif.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex h-dvh max-h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#0B061E_0%,#3C2390_100%)]">
        <PostHogProvider clientOptions={{ api_host: "/ingest" }}>
          <PostHogPageView />
          <PostHogIdentify />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            <RazorpayProvider>
              <TooltipProvider>
                <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>
                <Toaster />
              </TooltipProvider>
            </RazorpayProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
