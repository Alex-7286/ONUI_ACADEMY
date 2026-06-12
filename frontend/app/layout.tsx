import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONUI Academy",
  description: "Video learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}