"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";

const footerLinks = {
  shop: [
    { label: "All Products", href: "/products" },
    { label: "Categories", href: "/categories" },
    { label: "Featured", href: "/products?featured=true" },
    { label: "New Arrivals", href: "/products" },
  ],
  support: [
    { label: "Contact Us", href: "/contact" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "FAQ", href: "/contact" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Privacy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#2D5A27] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-white">
                <Image
                  src="/logo.jpeg"
                  alt="Royal Trading Company"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">
                  Royal Trading
                </span>
                <span className="text-[10px] text-white/70 tracking-widest uppercase">
                  Company
                </span>
              </div>
            </Link>
            <p className="text-white/80 text-sm mb-4 max-w-xs leading-relaxed">
              Your trusted destination for premium crockery, cutlery, homecare,
              and cleaning essentials since 2020.
            </p>

            {/* Contact Info */}
            <div className="space-y-2">
              <a
                href="mailto:support@royaltrading.com"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@royaltrading.com
              </a>
              <a
                href="tel:+911234567890"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4" />
                +91 123 456 7890
              </a>
            </div>
          </div>

          {/* Links - Mobile Accordion Style */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white">
              Support
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white">
              Company
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-white/70 text-center sm:text-left">
              &copy; {new Date().getFullYear()} Royal Trading Company. All
              rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-[#2D5A27] transition-colors tap-scale"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-[#2D5A27] transition-colors tap-scale"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-[#2D5A27] transition-colors tap-scale"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
