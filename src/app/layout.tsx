import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleTagManager from "@/components/GoogleTagManager";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Golf Performance App - Login",
  description: "Master Your Game with Data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-WC9RDZMQ';
  
  return (
    <html lang="en" className={inter.variable}>
      <GoogleTagManager gtmId={GTM_ID} />
      <body>{children}</body>
    </html>
  );
}