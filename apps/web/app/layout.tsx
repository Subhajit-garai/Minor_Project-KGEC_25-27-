import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DPI Visualizer & Packet Stream Engine",
  description: "Real-time Deep Packet Inspection node graph and live packet animator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
