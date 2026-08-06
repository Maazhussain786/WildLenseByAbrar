import type { Metadata } from "next";
import { Archivo_Narrow, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Three families, three jobs, no overlap:
 *   display — condensed grotesque for titles, section headers and the big
 *             numbers. Uppercase and tracked, it does the shouting.
 *   sans    — everything you actually read as prose.
 *   mono    — technical meta (distances, durations, codes) where digits need
 *             to line up column to column.
 */
const display = Archivo_Narrow({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
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
  title: "Wild Lens by Abrar — Pakistan → Saudi Arabia",
  description:
    "An interactive globe of Abrar's overland motorcycle journeys, one route per episode.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-ink-950">{children}</body>
    </html>
  );
}
