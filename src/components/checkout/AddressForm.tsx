"use client";

import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface AddressFormData {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressFormProps {
  formData: AddressFormData;
  addressLabel: string;
  saveAddress: boolean;
  hasSavedAddresses: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLabelChange: (value: string) => void;
  onSaveAddressChange: (value: boolean) => void;
}

function isValidPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

export function AddressForm({
  formData,
  addressLabel,
  saveAddress,
  hasSavedAddresses,
  onInputChange,
  onPhoneChange,
  onLabelChange,
  onSaveAddressChange,
}: AddressFormProps) {
  return (
    <Card className="border-[#E2E0DA] shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
          <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-[#2D5A27]" />
          </div>
          {hasSavedAddresses ? "New Shipping Address" : "Shipping Address"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSavedAddresses && (
          <div className="flex items-center gap-4 pb-4 border-b border-[#E2E0DA]">
            <div className="flex-1">
              <Label htmlFor="addressLabel" className="text-[#1A1A1A]">Address Label</Label>
              <Input
                id="addressLabel"
                value={addressLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="e.g., Home, Office, Warehouse"
                className="mt-1 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="saveAddress"
                checked={saveAddress}
                onCheckedChange={(c) => onSaveAddressChange(c === true)}
                className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
              />
              <Label htmlFor="saveAddress" className="text-sm text-[#1A1A1A]">Save this address</Label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="fullName" className="text-[#1A1A1A]">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={onInputChange}
              required
              className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-2">
            <Label htmlFor="phone" className="text-[#1A1A1A]">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              pattern="[6-9]\d{9}"
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              value={formData.phone}
              onChange={onPhoneChange}
              required
              className={`bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20 ${
                formData.phone && !isValidPhone(formData.phone) ? "border-red-500" : ""
              }`}
            />
            {formData.phone && !isValidPhone(formData.phone) && (
              <p className="text-sm text-red-500">Please enter a valid 10-digit mobile number</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-[#1A1A1A]">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onInputChange}
            required
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
        </div>

        <div>
          <Label htmlFor="street" className="text-[#1A1A1A]">Street Address</Label>
          <Input
            id="street"
            name="street"
            value={formData.street}
            onChange={onInputChange}
            required
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city" className="text-[#1A1A1A]">City</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={onInputChange}
              required
              className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-[#1A1A1A]">State</Label>
            <Input
              id="state"
              name="state"
              value={formData.state}
              onChange={onInputChange}
              required
              className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="postalCode" className="text-[#1A1A1A]">Postal Code</Label>
            <Input
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={onInputChange}
              required
              className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
            />
          </div>
          <div>
            <Label htmlFor="country" className="text-[#1A1A1A]">Country</Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              disabled
              className="bg-[#F0EFE8] border-[#E2E0DA]"
            />
          </div>
        </div>

        {!hasSavedAddresses && (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="saveAddressFirst"
              checked={saveAddress}
              onCheckedChange={(c) => onSaveAddressChange(c === true)}
              className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
            />
            <Label htmlFor="saveAddressFirst" className="text-sm text-[#1A1A1A]">
              Save this address for future orders
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
