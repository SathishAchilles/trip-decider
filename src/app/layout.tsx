import type { Metadata, Viewport } from "next";
import { Figtree, IBM_Plex_Mono, Poppins } from "next/font/google";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const ticket = IBM_Plex_Mono({
  variable: "--font-ticket-face",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Trip Together — the trip you actually take, together",
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
    // Browser extensions add attributes to <html> before React loads; this ignores only those
    // attribute differences on this one element, not mismatches anywhere inside the app.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${poppins.variable} ${ticket.variable} h-full antialiased`}
    >
      <body className="grain sky-glow flex min-h-full flex-col bg-paper font-sans text-ink">
        <SkyBackdrop />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
