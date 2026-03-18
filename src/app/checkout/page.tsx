"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { SavedAddress } from "@/types/database.types";
import { createOrder } from "@/app/actions/order";
import { CheckoutSchema } from "@/lib/validations/checkout";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { AddressForm, AddressFormData } from "@/components/checkout/AddressForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { OrderSummary } from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { items, subtotal, clearCart, appliedCoupon, discountAmount, removeCoupon } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [gstNumber, setGstNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [formData, setFormData] = useState<AddressFormData>({
    fullName: profile?.full_name || "",
    email: user?.email || "",
    phone: profile?.phone || "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const savedAddresses = profile?.saved_addresses || [];

  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId && !showNewAddressForm) {
      const defaultAddr = savedAddresses.find((a) => a.is_default);
      setSelectedAddressId(defaultAddr?.id || savedAddresses[0].id);
    } else if (savedAddresses.length === 0) {
      setShowNewAddressForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.saved_addresses, selectedAddressId, showNewAddressForm]);

  const shipping = subtotal >= 999 ? 0 : 99;
  const discount = discountAmount;
  const total = subtotal - discount + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const getShippingAddress = () => {
    if (selectedAddressId && !showNewAddressForm) {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        return {
          full_name: addr.full_name,
          phone: addr.phone,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
        };
      }
    }
    return {
      full_name: formData.fullName,
      phone: formData.phone,
      street: formData.street,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postalCode,
      country: formData.country,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to place an order"); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }

    if (showNewAddressForm || savedAddresses.length === 0) {
      if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        toast.error("Please enter a valid 10-digit phone number");
        return;
      }
    }

    const shippingAddress = getShippingAddress();
    const parsed = CheckoutSchema.safeParse({
      shipping_address: shippingAddress,
      gst_number: gstNumber.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues?.[0]?.message || "Please fill in valid address fields");
      return;
    }

    setIsProcessing(true);
    try {
      if (showNewAddressForm && saveAddress) {
        const newAddress: SavedAddress = {
          id: `addr_${crypto.randomUUID()}`,
          label: addressLabel,
          full_name: formData.fullName,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
          is_default: savedAddresses.length === 0,
        };
        await updateDoc(doc(db, "profiles", user.uid), {
          saved_addresses: arrayUnion(newAddress),
          updated_at: serverTimestamp(),
        });
      }

      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("Authentication error. Please sign in again.");
        setIsProcessing(false);
        return;
      }

      const result = await createOrder({
        user_id: user.uid,
        id_token: idToken,
        items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        shipping_address: shippingAddress,
        coupon_code: appliedCoupon?.code || null,
        gst_number: gstNumber.trim() || null,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to place order");
        setIsProcessing(false);
        return;
      }

      await clearCart();
      removeCoupon();
      await refreshProfile();
      toast.success("Order placed successfully!");
      router.push(`/profile/orders/${result.order_id}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : typeof error === "string" ? error : "Failed to place order. Please try again.";
      toast.error(`Error: ${msg}`);
    }
    setIsProcessing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto shadow-soft">
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">Please Sign In</h1>
            <p className="text-[#6B7280] mb-6">You need to be signed in to checkout.</p>
            <Link href="/login?redirect=/checkout">
              <Button className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full px-8">Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto shadow-soft">
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">Your Cart is Empty</h1>
            <p className="text-[#6B7280] mb-6">Add some items to your cart before checking out.</p>
            <Link href="/products">
              <Button className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full px-8">Browse Products</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Link
          href="/cart"
          className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#2D5A27] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Link>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
          Checkout
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <AddressSelector
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                showNewAddressForm={showNewAddressForm}
                onSelect={(id) => { setSelectedAddressId(id); setShowNewAddressForm(false); }}
                onAddNew={() => { setShowNewAddressForm(true); setSelectedAddressId(null); }}
              />

              {(showNewAddressForm || savedAddresses.length === 0) && (
                <AddressForm
                  formData={formData}
                  addressLabel={addressLabel}
                  saveAddress={saveAddress}
                  hasSavedAddresses={savedAddresses.length > 0}
                  onInputChange={handleInputChange}
                  onPhoneChange={handlePhoneChange}
                  onLabelChange={setAddressLabel}
                  onSaveAddressChange={setSaveAddress}
                />
              )}

              {/* GST Number */}
              <Card className="border-[#E2E0DA] shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
                    <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-[#2D5A27]" />
                    </div>
                    Business Details
                    <span className="text-xs font-normal text-[#6B7280]">(Optional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="gstNumber" className="text-[#1A1A1A]">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 22AAAAA0000A1Z5"
                    className="mt-1 uppercase bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                    maxLength={15}
                  />
                  <p className="text-xs text-[#6B7280] mt-1">
                    Enter your GST number if you need a GST invoice
                  </p>
                </CardContent>
              </Card>

              <PaymentMethodSelector paymentMethod={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <div>
              <OrderSummary
                items={items}
                subtotal={subtotal}
                discount={discount}
                appliedCoupon={appliedCoupon}
                shipping={shipping}
                total={total}
                gstNumber={gstNumber}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
