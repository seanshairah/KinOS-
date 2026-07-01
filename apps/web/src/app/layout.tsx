import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "KinOS — the private family operating system",
    template: "%s · KinOS",
  },
  description:
    "KinOS turns scattered life updates — check-ins, receipts, medications, appointments — into quiet awareness. The people you love, in one calm orbit.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  openGraph: {
    title: "KinOS — the private family operating system",
    description: "The people you love, in one calm orbit.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KinOS — the people you love, in one calm orbit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KinOS — the private family operating system",
    description: "The people you love, in one calm orbit.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#35335F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body
        className={`${newsreader.variable} ${inter.variable} ${plexMono.variable}`}
        style={
          {
            "--serif": "var(--font-serif), Georgia, serif",
            "--sans": "var(--font-sans), system-ui, sans-serif",
            "--mono": "var(--font-mono), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
