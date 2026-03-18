"use client";

import { Plus, Check } from "lucide-react";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedAddress } from "@/types/database.types";

interface AddressSelectorProps {
  savedAddresses: SavedAddress[];
  selectedAddressId: string | null;
  showNewAddressForm: boolean;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

export function AddressSelector({
  savedAddresses,
  selectedAddressId,
  showNewAddressForm,
  onSelect,
  onAddNew,
}: AddressSelectorProps) {
  if (savedAddresses.length === 0) return null;

  return (
    <Card className="border-[#E2E0DA] shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
          <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-[#2D5A27]" />
          </div>
          Saved Addresses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          {savedAddresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelect(addr.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedAddressId === addr.id && !showNewAddressForm
                  ? "border-[#2D5A27] bg-[#2D5A27]/5"
                  : "border-[#E2E0DA] hover:border-[#2D5A27]/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F0EFE8] text-[#2D5A27]">
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="text-xs text-[#4CAF50] font-medium">Default</span>
                  )}
                </div>
                {selectedAddressId === addr.id && !showNewAddressForm && (
                  <Check className="h-5 w-5 text-[#2D5A27]" />
                )}
              </div>
              <p className="font-medium text-sm text-[#1A1A1A]">{addr.full_name}</p>
              <p className="text-xs text-[#6B7280] mt-1">{addr.street}, {addr.city}</p>
              <p className="text-xs text-[#6B7280]">{addr.state} - {addr.postal_code}</p>
              <p className="text-xs text-[#6B7280] mt-1">{addr.phone}</p>
            </button>
          ))}

          <button
            type="button"
            onClick={onAddNew}
            className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all min-h-[140px] ${
              showNewAddressForm
                ? "border-[#2D5A27] bg-[#2D5A27]/5"
                : "border-[#E2E0DA] hover:border-[#2D5A27]/50"
            }`}
          >
            <Plus className="h-6 w-6 text-[#6B7280]" />
            <span className="text-sm font-medium text-[#6B7280]">Add New Address</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
