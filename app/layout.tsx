import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const almoni = localFont({
  src: [
    { path: "./fonts/almoni-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/almoni-medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/almoni-demibold.otf", weight: "600", style: "normal" },
    { path: "./fonts/almoni-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-almoni",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BrightCRM",
  description: "ניהול לקוחות ומשימות פנימי לסוכנות Bright",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={almoni.variable}>
      <body>{children}</body>
    </html>
  );
}
