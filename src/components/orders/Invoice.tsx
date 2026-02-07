"use client";

import { useState } from "react";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  User,
} from "lucide-react";
import type { Order as OrderType } from "@/types/database.types";

// Extended types for Firestore timestamps

interface Order extends Omit<OrderType, 'created_at' | 'updated_at'> {
  created_at: string | { toDate: () => Date } | Date;
  updated_at?: string | { toDate: () => Date } | Date;
}

interface InvoiceProps {
  order: Order;
  showActions?: boolean;
}

// GST calculation helpers
const calculateGST = (subtotal: number) => {
  const gstRate = 0.18; // 18% GST
  const totalGST = subtotal * gstRate;
  const cgst = totalGST / 2; // 9% CGST
  const sgst = totalGST / 2; // 9% SGST
  return { cgst, sgst, totalGST };
};

// Brand colors
const BRAND_COLOR = "#2D5A27";

export default function Invoice({ order, showActions = true }: InvoiceProps) {
  const { settings } = useSiteSettings();
  const [isPrinting, setIsPrinting] = useState(false);

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string | { toDate: () => Date } | Date) => {
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const handleDownload = () => {
    // Create a hidden iframe for PDF generation
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { cgst, sgst } = calculateGST(order.subtotal);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${order.order_number}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1a1a1a;
            background: #fff;
          }
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${BRAND_COLOR};
          }
          .company-info h1 {
            color: ${BRAND_COLOR};
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h2 {
            color: ${BRAND_COLOR};
            margin: 0;
            font-size: 24px;
          }
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .detail-box {
            padding: 15px;
            background: #f8faf8;
            border-radius: 8px;
          }
          .detail-box h3 {
            margin: 0 0 10px 0;
            color: ${BRAND_COLOR};
            font-size: 14px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: ${BRAND_COLOR};
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e2e0da;
          }
          tr:nth-child(even) {
            background: #f8faf8;
          }
          .totals {
            margin-top: 30px;
            border-top: 2px solid ${BRAND_COLOR};
            padding-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
          }
          .total-row.final {
            font-size: 18px;
            font-weight: bold;
            color: ${BRAND_COLOR};
            border-top: 1px solid ${BRAND_COLOR};
            padding-top: 10px;
            margin-top: 10px;
          }
          .gst-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8faf8;
            border-radius: 8px;
          }
          .gst-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 13px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e0da;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>${settings.business_name}</h1>
              <p>${settings.business_address}</p>
              <p>${settings.business_city}, ${settings.business_state} ${settings.business_postal_code}</p>
              <p>GST: ${settings.business_gst_number}</p>
              <p>Phone: ${settings.business_phone}</p>
            </div>
            <div class="invoice-title">
              <h2>TAX INVOICE</h2>
              <p style="margin: 10px 0 0 0;">
                <span class="status" style="background: ${getStatusColor(order.status)}; color: white;">
                  ${order.status}
                </span>
              </p>
            </div>
          </div>

          <div class="invoice-details">
            <div class="detail-box">
              <h3>Bill To</h3>
              <p><strong>${order.shipping_address?.full_name}</strong></p>
              <p>${order.shipping_address?.street}</p>
              <p>${order.shipping_address?.city}, ${order.shipping_address?.state} ${order.shipping_address?.postal_code}</p>
              <p>Phone: ${order.shipping_address?.phone}</p>
              ${order.gst_number ? `<p>GST: ${order.gst_number}</p>` : ''}
            </div>
            <div class="detail-box">
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${order.order_number}</p>
              <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
              <p><strong>Payment:</strong> ${order.payment_status}</p>
              ${order.coupon_code ? `<p><strong>Coupon:</strong> ${order.coupon_code}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${formatPrice(item.price)}</td>
                  <td style="text-align: right;">${formatPrice(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatPrice(order.subtotal)}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="total-row" style="color: #16a34a;">
                <span>Discount</span>
                <span>-${formatPrice(order.discount)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Shipping</span>
              <span>${order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span>
            </div>
            <div class="gst-section">
              <div class="gst-row">
                <span>CGST (9%)</span>
                <span>${formatPrice(cgst)}</span>
              </div>
              <div class="gst-row">
                <span>SGST (9%)</span>
                <span>${formatPrice(sgst)}</span>
              </div>
            </div>
            <div class="total-row final">
              <span>Total Amount</span>
              <span>${formatPrice(order.total)}</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>${settings.footer_text}</p>
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "#16a34a";
      case "shipped":
        return "#3b82f6";
      case "processing":
        return "#8b5cf6";
      case "cancelled":
        return "#dc2626";
      default:
        return BRAND_COLOR;
    }
  };

  const { cgst, sgst } = calculateGST(order.subtotal);

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex gap-2 no-print mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Open for Print
          </Button>
        </div>
      )}

      {/* Print View */}
      <div className="bg-white p-6 md:p-8 print:p-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pb-4 border-b-2" style={{ borderColor: BRAND_COLOR }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: BRAND_COLOR }}>
              {settings.business_name}
            </h1>
            <p className="text-sm text-gray-600">{settings.business_address}</p>
            <p className="text-sm text-gray-600">
              {settings.business_city}, {settings.business_state} {settings.business_postal_code}
            </p>
            <p className="text-sm text-gray-600">GST: {settings.business_gst_number}</p>
            <p className="text-sm text-gray-600">Phone: {settings.business_phone}</p>
          </div>
          <div className="text-left md:text-right">
            <h2 className="text-xl font-bold" style={{ color: BRAND_COLOR }}>
              TAX INVOICE
            </h2>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white uppercase mt-2"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: BRAND_COLOR }}>
              <User className="h-4 w-4" /> Bill To
            </h3>
            <p className="font-medium">{order.shipping_address?.full_name}</p>
            <p className="text-sm text-gray-600">{order.shipping_address?.street}</p>
            <p className="text-sm text-gray-600">
              {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}
            </p>
            <p className="text-sm text-gray-600">Phone: {order.shipping_address?.phone}</p>
            {order.gst_number && (
              <p className="text-sm text-gray-600">GST: {order.gst_number}</p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-2" style={{ color: BRAND_COLOR }}>
              Invoice Details
            </h3>
            <p className="text-sm"><strong>Invoice #:</strong> {order.order_number}</p>
            <p className="text-sm"><strong>Date:</strong> {formatDate(order.created_at)}</p>
            <p className="text-sm"><strong>Payment:</strong> {order.payment_status}</p>
            {order.coupon_code && (
              <p className="text-sm"><strong>Coupon:</strong> {order.coupon_code}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: BRAND_COLOR }}>
                <th className="text-left p-3 text-white font-semibold">Item</th>
                <th className="text-center p-3 text-white font-semibold">Qty</th>
                <th className="text-right p-3 text-white font-semibold">Price</th>
                <th className="text-right p-3 text-white font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                  <td className="p-3">{item.product_name}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">{formatPrice(item.price)}</td>
                  <td className="p-3 text-right">{formatPrice(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 pt-4" style={{ borderColor: BRAND_COLOR }}>
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between py-1 text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span>Shipping</span>
            <span>{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</span>
          </div>
          
          {/* GST Breakdown */}
          <div className="bg-gray-50 p-3 rounded-lg my-3">
            <div className="flex justify-between text-sm">
              <span>CGST (9%)</span>
              <span>{formatPrice(cgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SGST (9%)</span>
              <span>{formatPrice(sgst)}</span>
            </div>
          </div>

          <div className="flex justify-between py-2 text-lg font-bold" style={{ color: BRAND_COLOR, borderTop: `1px solid ${BRAND_COLOR}` }}>
            <span>Total Amount</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <p className="font-medium mb-1">Thank you for your business!</p>
          <p>{settings.footer_text}</p>
        </div>
      </div>
    </div>
  );
}
