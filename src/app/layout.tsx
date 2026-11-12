import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { APP_NAME, CAMPUS_NAME } from "@/lib/constants";
import "./globals.css";

/*
 * Fonts are served from src/fonts by next/font/local: no request to a font
 * CDN, and Next.js preloads them and reserves space to avoid layout shift.
 *
 * Fraunces is a variable font with weight, optical-size, softness and "wonk"
 * axes; the softness is set in globals.css. The "-ext" files hold Latin
 * Extended characters (ɛ, ɔ...) and are only downloaded when a page uses one.
 */
const fraunces = localFont({
  src: "../fonts/fraunces-latin.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});
const frauncesExt = localFont({
  src: "../fonts/fraunces-latin-ext.woff2",
  variable: "--font-fraunces-ext",
  weight: "100 900",
  display: "swap",
  preload: false,
});
const atkinson = localFont({
  src: "../fonts/atkinson-next-latin.woff2",
  variable: "--font-atkinson",
  weight: "200 800",
  display: "swap",
});
const atkinsonExt = localFont({
  src: "../fonts/atkinson-next-latin-ext.woff2",
  variable: "--font-atkinson-ext",
  weight: "200 800",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME}: lost and found at ${CAMPUS_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description: `Report lost belongings, hand in found items and arrange verified returns at ${CAMPUS_NAME}. A student software engineering project.`,
};

export const viewport: Viewport = {
  themeColor: "#10233f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVariables = [fraunces, frauncesExt, atkinson, atkinsonExt]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {/* Lets keyboard users jump past the navigation. */}
        <a
          href="#main"
          className="btn btn-primary sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50"
        >
          Skip to main content
        </a>
        <Providers>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
