import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@acme/ui";
import { ThemeProvider } from "@acme/ui/theme";
import { themeDetectorScript } from "@acme/ui/theme-script";
import { Toaster } from "@acme/ui/toast";

import { getPublicMetadataBaseUrl } from "~/public-web-url";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

const publicMetadataBaseUrl = getPublicMetadataBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(publicMetadataBaseUrl),
  title: "Rastro",
  description: "Red de recuperación de mascotas en Bolivia",
  openGraph: {
    title: "Rastro",
    description: "Red de recuperación de mascotas en Bolivia",
    url: publicMetadataBaseUrl,
    siteName: "Rastro",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="es-BO" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <script
          dangerouslySetInnerHTML={{ __html: themeDetectorScript }}
          suppressHydrationWarning
        />
        <ThemeProvider>
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
