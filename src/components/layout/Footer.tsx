"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#2D5A27] text-white hidden md:block">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white/20 bg-white">
              <Image src="/logo.jpeg" alt="RTC" fill className="object-cover" />
            </div>
            <div>
              <span className="font-bold text-lg">Royal Trading</span>
              <p className="text-xs text-white/70">Premium Household Essentials</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/products" className="text-white/80 hover:text-white transition-colors">
              Products
            </Link>
            <Link href="/categories" className="text-white/80 hover:text-white transition-colors">
              Categories
            </Link>
            <Link href="/contact" className="text-white/80 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors">
              About
            </Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <a href="mailto:support@royaltrading.com" className="flex items-center gap-2 text-white/80 hover:text-white">
              <Mail className="h-4 w-4" />
              support@royaltrading.com
            </a>
            <a href="tel:+911234567890" className="flex items-center gap-2 text-white/80 hover:text-white">
              <Phone className="h-4 w-4" />
              +91 123 456 7890
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-6 pt-6 text-center text-sm text-white/60">
          © {new Date().getFullYear()} Royal Trading Company. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
