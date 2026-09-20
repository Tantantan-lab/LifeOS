import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LifeOS",
    template: "%s · LifeOS",
  },
  description: "Compete with your past. Benchmark against the world.",
};

/**
 * Applies the stored theme BEFORE first paint (default: dark) so there is
 * no flash; ThemeProvider then owns the class for interactive switches.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('lifeos-theme');var d=t==='light'?false:t==='system'?!window.matchMedia('(prefers-color-scheme: dark)').matches:true;if(!d)document.documentElement.classList.remove('dark');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-[1560px] px-6 py-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
