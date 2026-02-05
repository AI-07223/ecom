import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { WishlistProvider } from "@/providers/WishlistProvider";
import { SiteSettingsProvider } from "@/providers/SiteSettingsProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Royal Trading Company - Premium Crockery, Cutlery & Homecare",
  description: "Your trusted destination for premium crockery, cutlery, homecare, and cleaning essentials since 2020",
};

// Viewport configuration with safe area support for mobile
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Critical for safe area insets on notched devices
  themeColor: "#2D5A27",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden`}>
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <MobileBottomNav />
                <AdminBottomNav />
                <Toaster
                  position="bottom-right"
                  richColors
                  className="!bottom-[calc(64px+env(safe-area-inset-bottom,0px)+8px)] md:!bottom-4"
                  toastOptions={{
                    classNames: {
                      toast:
                        "md:!w-[356px] !w-[calc(100vw-32px)] !max-w-[356px]",
                    },
                  }}
                />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
