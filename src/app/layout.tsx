import type { Metadata } from "next";
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
  title: "Royal Store - Premium E-Commerce",
  description: "Your one-stop shop for premium products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1 pb-20 md:pb-0">{children}</main>
                  <Footer />
                </div>
                <MobileBottomNav />
                <AdminBottomNav />
                <Toaster
                  position="bottom-right"
                  richColors
                  className="!bottom-[72px] md:!bottom-4"
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
