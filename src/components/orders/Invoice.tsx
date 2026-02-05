"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  FileText,
  Building2,
  User,
  Package,
  Hash,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_email?: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  subtotal: number;
  shipping: number;
  discount: number;
  coupon_code?: string | null;
  gst_number?: string | null;
  total: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: OrderItem[];
  created_at: { toDate: () => Date } | Date;
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

export default function Invoice({ order, showActions = true }: InvoiceProps) {
  const { settings } = useSiteSettings();
  const [isPrinting, setIsPrinting] = useState(false);

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: { toDate: () => Date } | Date) => {
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    const { cgst, sgst, totalGST } = calculateGST(order.subtotal);
    const totalWithGST =
      order.subtotal + totalGST + order.shipping - order.discount;

    const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${order.order_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 10mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice-wrapper {
      max-width: 190mm;
      margin: 0 auto;
      border: 1px solid #000;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 15px 20px;
      border-bottom: 2px solid #000;
    }

    .company-info {
      flex: 1;
    }

    .company-name {
      font-size: 18pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 4px;
    }

    .company-address {
      font-size: 9pt;
      color: #333;
      line-height: 1.5;
    }

    .company-contact {
      font-size: 8pt;
      color: #555;
      margin-top: 4px;
    }

    .invoice-title-section {
      text-align: right;
    }

    .invoice-title {
      font-size: 24pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 2px;
    }

    .invoice-details {
      margin-top: 10px;
      font-size: 9pt;
    }

    .invoice-row {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin: 2px 0;
    }

    .invoice-label {
      color: #555;
    }

    .invoice-value {
      font-weight: 600;
      min-width: 120px;
    }

    /* Parties Section */
    .parties-section {
      display: flex;
      border-bottom: 1px solid #000;
    }

    .party-box {
      flex: 1;
      padding: 12px 20px;
    }

    .party-box:first-child {
      border-right: 1px solid #000;
      background: #f5f5f5;
    }

    .party-label {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .party-name {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .party-address {
      font-size: 9pt;
      color: #333;
      line-height: 1.5;
    }

    .party-contact {
      font-size: 8pt;
      color: #555;
      margin-top: 6px;
    }

    .gst-badge {
      display: inline-block;
      background: #e8f5e9 !important;
      border: 1px solid #4caf50;
      color: #2e7d32;
      font-size: 8pt;
      padding: 2px 8px;
      margin-top: 6px;
      font-weight: 600;
    }

    /* Info Bar */
    .info-bar {
      display: flex;
      border-bottom: 1px solid #000;
      background: #f0f0f0 !important;
    }

    .info-item {
      flex: 1;
      padding: 10px;
      text-align: center;
      border-right: 1px solid #ccc;
    }

    .info-item:last-child {
      border-right: none;
    }

    .info-label {
      font-size: 7pt;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 9pt;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Items Table */
    .items-section {
      border-bottom: 1px solid #000;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #e0e0e0 !important;
    }

    th {
      padding: 10px 8px;
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: left;
      border-bottom: 1px solid #000;
      letter-spacing: 0.5px;
    }

    th:nth-child(3),
    th:nth-child(4),
    th:nth-child(5),
    th:nth-child(6) {
      text-align: right;
    }

    td {
      padding: 8px;
      font-size: 9pt;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }

    td:nth-child(1) {
      text-align: center;
      color: #555;
    }

    td:nth-child(3),
    td:nth-child(4),
    td:nth-child(5),
    td:nth-child(6) {
      text-align: right;
    }

    .item-name {
      font-weight: 600;
    }

    .item-sku {
      font-size: 7pt;
      color: #777;
    }

    tbody tr:last-child td {
      border-bottom: 1px solid #000;
    }

    /* Summary Section */
    .summary-section {
      display: flex;
      border-bottom: 1px solid #000;
    }

    .amount-words {
      flex: 1;
      padding: 15px 20px;
      border-right: 1px solid #000;
      background: #f5f5f5 !important;
    }

    .amount-words-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 4px;
    }

    .amount-words-value {
      font-size: 10pt;
      font-weight: 600;
      font-style: italic;
    }

    .totals-box {
      width: 280px;
      padding: 15px 20px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: 9pt;
    }

    .total-row.grand-total {
      border-top: 2px solid #000;
      margin-top: 10px;
      padding-top: 8px;
      font-size: 12pt;
      font-weight: bold;
    }

    .discount-row {
      color: #2e7d32;
    }

    /* GST Table */
    .gst-section {
      padding: 12px 20px;
      border-bottom: 1px solid #000;
      background: #fafafa !important;
    }

    .gst-title {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 8px;
      color: #555;
    }

    .gst-table {
      width: 100%;
      font-size: 8pt;
    }

    .gst-table th {
      background: #e8e8e8 !important;
      padding: 6px 8px;
      border-bottom: 1px solid #999;
    }

    .gst-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #ddd;
    }

    /* Footer */
    .footer-section {
      display: flex;
    }

    .terms-box {
      flex: 1;
      padding: 15px 20px;
      border-right: 1px solid #000;
    }

    .terms-title {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .terms-list {
      font-size: 7pt;
      color: #555;
      padding-left: 14px;
    }

    .terms-list li {
      margin: 2px 0;
    }

    .signature-box {
      width: 250px;
      padding: 15px 20px;
      text-align: center;
    }

    .signature-line {
      border-bottom: 1px solid #000;
      margin: 40px 20px 8px 20px;
    }

    .signature-text {
      font-size: 9pt;
      font-weight: 600;
    }

    .signature-company {
      font-size: 7pt;
      color: #555;
    }

    /* Bottom Bar */
    .bottom-bar {
      background: #000 !important;
      color: #fff !important;
      text-align: center;
      padding: 10px;
      font-size: 9pt;
    }

    .bottom-bar-title {
      font-weight: 600;
    }

    .bottom-bar-subtitle {
      font-size: 7pt;
      opacity: 0.8;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${settings.business_name || settings.site_name}</div>
        <div class="company-address">
          ${settings.business_address}<br>
          ${settings.business_city}, ${settings.business_state} - ${settings.business_postal_code}<br>
          ${settings.business_country}
        </div>
        <div class="company-contact">
          Ph: ${settings.business_phone || settings.contact_phone} | Email: ${settings.business_email || settings.contact_email}
        </div>
      </div>
      <div class="invoice-title-section">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-details">
          <div class="invoice-row">
            <span class="invoice-label">Invoice No:</span>
            <span class="invoice-value">${order.order_number}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">Date:</span>
            <span class="invoice-value">${formatDate(order.created_at)}</span>
          </div>
          ${
            settings.business_gst_number
              ? `
          <div class="invoice-row">
            <span class="invoice-label">GSTIN:</span>
            <span class="invoice-value">${settings.business_gst_number}</span>
          </div>
          `
              : ""
          }
          ${
            settings.business_pan_number
              ? `
          <div class="invoice-row">
            <span class="invoice-label">PAN:</span>
            <span class="invoice-value">${settings.business_pan_number}</span>
          </div>
          `
              : ""
          }
        </div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties-section">
      <div class="party-box">
        <div class="party-label">Bill To</div>
        <div class="party-name">${order.shipping_address.full_name}</div>
        <div class="party-address">
          ${order.shipping_address.address}<br>
          ${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.postal_code}<br>
          ${order.shipping_address.country}
        </div>
        <div class="party-contact">
          Ph: ${order.shipping_address.phone}<br>
          ${order.user_email ? `Email: ${order.user_email}` : ""}
        </div>
        ${order.gst_number ? `<div class="gst-badge">GSTIN: ${order.gst_number}</div>` : ""}
      </div>
      <div class="party-box">
        <div class="party-label">Ship To</div>
        <div class="party-name">${order.shipping_address.full_name}</div>
        <div class="party-address">
          ${order.shipping_address.address}<br>
          ${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.postal_code}<br>
          ${order.shipping_address.country}
        </div>
        <div class="party-contact">Ph: ${order.shipping_address.phone}</div>
      </div>
    </div>

    <!-- Info Bar -->
    <div class="info-bar">
      <div class="info-item">
        <div class="info-label">Order Status</div>
        <div class="info-value" style="text-transform: capitalize;">${order.status}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payment Status</div>
        <div class="info-value" style="text-transform: capitalize;">${order.payment_status}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payment Method</div>
        <div class="info-value">${order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Items</div>
        <div class="info-value">${order.items.length}</div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="items-section">
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Item Description</th>
            <th style="width: 12%;">HSN/SAC</th>
            <th style="width: 10%;">Qty</th>
            <th style="width: 15%;">Rate</th>
            <th style="width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div class="item-name">${item.product_name}</div>
              <div class="item-sku">SKU: ${item.product_id.slice(-8).toUpperCase()}</div>
            </td>
            <td>-</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(item.total)}</td>
          </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="summary-section">
      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        <div class="amount-words-value">${numberToWords(Math.round(totalWithGST))} Rupees Only</div>
        ${order.coupon_code ? `<div style="margin-top: 8px; font-size: 8pt; color: #2e7d32;">Coupon Applied: <strong>${order.coupon_code}</strong></div>` : ""}
      </div>
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatPrice(order.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>CGST (9%)</span>
          <span>${formatPrice(cgst)}</span>
        </div>
        <div class="total-row">
          <span>SGST (9%)</span>
          <span>${formatPrice(sgst)}</span>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <span>${order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
        </div>
        ${
          order.discount > 0
            ? `
        <div class="total-row discount-row">
          <span>Discount</span>
          <span>-${formatPrice(order.discount)}</span>
        </div>
        `
            : ""
        }
        <div class="total-row grand-total">
          <span>Total</span>
          <span>${formatPrice(totalWithGST)}</span>
        </div>
        <div style="text-align: right; font-size: 7pt; color: #777; margin-top: 4px;">Including all taxes</div>
      </div>
    </div>

    <!-- GST Summary -->
    <div class="gst-section">
      <div class="gst-title">GST Summary</div>
      <table class="gst-table">
        <thead>
          <tr>
            <th style="text-align: left;">Tax Type</th>
            <th style="text-align: right;">Taxable Amount</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CGST</td>
            <td style="text-align: right;">${formatPrice(order.subtotal)}</td>
            <td style="text-align: right;">9%</td>
            <td style="text-align: right;">${formatPrice(cgst)}</td>
          </tr>
          <tr>
            <td>SGST</td>
            <td style="text-align: right;">${formatPrice(order.subtotal)}</td>
            <td style="text-align: right;">9%</td>
            <td style="text-align: right;">${formatPrice(sgst)}</td>
          </tr>
          <tr style="font-weight: bold; background: #e8e8e8;">
            <td>Total GST</td>
            <td style="text-align: right;"></td>
            <td style="text-align: right;">18%</td>
            <td style="text-align: right;">${formatPrice(totalGST)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer-section">
      <div class="terms-box">
        <div class="terms-title">Terms & Conditions</div>
        <ul class="terms-list">
          <li>Goods once sold will not be taken back or exchanged.</li>
          <li>All disputes are subject to ${settings.business_city || "Mumbai"} jurisdiction.</li>
          <li>This is a computer-generated invoice and does not require a signature.</li>
          <li>Payment is due within 15 days from the invoice date.</li>
        </ul>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-text">Authorized Signatory</div>
        <div class="signature-company">for ${settings.business_name || settings.site_name}</div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <div class="bottom-bar-title">Thank you for shopping with ${settings.site_name}!</div>
      <div class="bottom-bar-subtitle">${settings.business_address}, ${settings.business_city} | ${settings.contact_email}</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 500);
    };

    // Fallback if onload doesn't trigger
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }
    }, 1000);
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const { cgst, sgst, totalGST } = calculateGST(order.subtotal);
  const totalWithGST =
    order.subtotal + totalGST + order.shipping - order.discount;

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 sm:flex-none"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Preparing..." : "Print Invoice"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isPrinting}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            Save as PDF
          </Button>
        </div>
      )}

      {/* On-Screen Preview */}
      <div className="bg-white border rounded-lg overflow-hidden print:hidden">
        {/* Preview Header */}
        <div className="border-b-2 border-gray-900 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {settings.business_name || settings.site_name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {settings.business_address}
                <br className="hidden sm:block" />
                {settings.business_city}, {settings.business_state} -{" "}
                {settings.business_postal_code}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ph: {settings.business_phone || settings.contact_phone} |{" "}
                {settings.business_email || settings.contact_email}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wider">
                TAX INVOICE
              </h2>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex sm:justify-end gap-2">
                  <span className="text-gray-500">Invoice No:</span>
                  <span className="font-mono font-semibold">
                    {order.order_number}
                  </span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-gray-500">Date:</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                {settings.business_gst_number && (
                  <div className="flex sm:justify-end gap-2">
                    <span className="text-gray-500">GSTIN:</span>
                    <span className="font-mono">
                      {settings.business_gst_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid sm:grid-cols-2 border-b">
          <div className="p-4 border-b sm:border-b-0 sm:border-r bg-gray-50">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <User className="h-3 w-3" /> Bill To
            </h3>
            <p className="font-semibold">{order.shipping_address.full_name}</p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.address}
            </p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.city}, {order.shipping_address.state} -{" "}
              {order.shipping_address.postal_code}
            </p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.country}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Ph: {order.shipping_address.phone}
            </p>
            {order.gst_number && (
              <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded mt-2 font-medium">
                GSTIN: {order.gst_number}
              </span>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Ship To
            </h3>
            <p className="font-semibold">{order.shipping_address.full_name}</p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.address}
            </p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.city}, {order.shipping_address.state} -{" "}
              {order.shipping_address.postal_code}
            </p>
            <p className="text-sm text-gray-600">
              {order.shipping_address.country}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Ph: {order.shipping_address.phone}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-2 text-left font-semibold text-xs uppercase w-10">
                  #
                </th>
                <th className="py-3 px-2 text-left font-semibold text-xs uppercase">
                  Item Description
                </th>
                <th className="py-3 px-2 text-center font-semibold text-xs uppercase w-16">
                  Qty
                </th>
                <th className="py-3 px-2 text-right font-semibold text-xs uppercase w-24">
                  Rate
                </th>
                <th className="py-3 px-2 text-right font-semibold text-xs uppercase w-24">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-2 text-gray-500">{index + 1}</td>
                  <td className="py-3 px-2">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      SKU: {item.product_id.slice(-8).toUpperCase()}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-center">{item.quantity}</td>
                  <td className="py-3 px-2 text-right">
                    {formatPrice(item.price)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium">
                    {formatPrice(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t grid sm:grid-cols-2 gap-4 p-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500 uppercase mb-1">
              Amount in Words
            </p>
            <p className="font-semibold italic text-sm">
              {numberToWords(Math.round(totalWithGST))} Rupees Only
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">CGST (9%)</span>
              <span>{formatPrice(cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">SGST (9%)</span>
              <span>{formatPrice(sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>
                {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatPrice(totalWithGST)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-500">
            This is a preview. Click &quot;Print Invoice&quot; for a professional PDF
            version.
          </p>
        </div>
      </div>

      {/* Hidden print-only content */}
      <div className="hidden print:block">
        {/* Print version is handled by the separate window */}
      </div>
    </div>
  );
}

// Number to Words conversion function
function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const scales = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";

  const convertBelowThousand = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " and " + convertBelowThousand(n % 100) : "")
    );
  };

  const convertIndian = (n: number): string => {
    if (n === 0) return "";

    const parts: string[] = [];
    let scaleIndex = 0;

    while (n > 0) {
      let chunk: number;
      if (scaleIndex === 0) {
        chunk = n % 1000;
        n = Math.floor(n / 1000);
      } else {
        chunk = n % 100;
        n = Math.floor(n / 100);
      }

      if (chunk > 0) {
        const chunkWords = convertBelowThousand(chunk);
        parts.unshift(
          chunkWords + (scales[scaleIndex] ? " " + scales[scaleIndex] : ""),
        );
      }

      scaleIndex++;
    }

    return parts.join(" ");
  };

  return convertIndian(num);
}
