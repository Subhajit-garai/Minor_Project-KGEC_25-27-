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
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
