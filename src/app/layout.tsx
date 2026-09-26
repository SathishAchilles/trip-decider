import type { Metadata, Viewport } from "next";
import { Figtree, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Trip Together",
  description:
    "Everyone submits their trip preferences through one link; get the best options and see where each person stands.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1a24" },
    { media: "(prefers-color-scheme: light)", color: "#f3f5f7" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${poppins.variable} h-full antialiased`}>
      <body className="grain flex min-h-full flex-col bg-paper font-sans text-ink">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
