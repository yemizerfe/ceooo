import "./globals.css";
import ConditionalNavbar from "./components/ConditionalNavbar";
import ConditionalFooter from "./components/ConditionalFooter";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/app/components/ui/use-toast";
import AppLayoutShell from "./components/AppLayoutShell";
import SessionHydrator from "./components/SessionHydrator";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "next-themes";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: {
    default: 'CEOOO | Executive Decision-Making & Business Intelligence Platform',
    template: '%s | CEOOOO',
  },
  description: 'Executive decision-making and business intelligence platform.',
  other: {
    'google-notranslate': 'true',
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
      data-scroll-behavior="smooth"
      className={cn("font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body translate="no" className="min-h-screen bg-white text-slate-900 dark:bg-[#071a2e] dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <ToastProvider>
            <SessionHydrator />
            <ScrollToTop />
            <ConditionalNavbar />
            <AppLayoutShell>{children}</AppLayoutShell>
            <ConditionalFooter />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
