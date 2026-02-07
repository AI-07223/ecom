"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Mail,
  Globe,
  RotateCcw,
  Building2,
  Receipt,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import {
  useSiteSettings,
  defaultSettings,
} from "@/providers/SiteSettingsProvider";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings, refreshSettings } = useSiteSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({
    // Contact
    contact_email: "",
    contact_phone: "",
    currency: "",
    currency_symbol: "",
    // Social
    facebook: "",
    instagram: "",
    twitter: "",
    // Business details for invoice
    business_name: "",
    business_address: "",
    business_city: "",
    business_state: "",
    business_postal_code: "",
    business_country: "",
    business_gst_number: "",
    business_pan_number: "",
    business_phone: "",
    business_email: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (settings) {
      setFormData({
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        currency: settings.currency || "INR",
        currency_symbol: settings.currency_symbol || "₹",
        facebook: settings.social_links?.facebook || "",
        instagram: settings.social_links?.instagram || "",
        twitter: settings.social_links?.twitter || "",
        // Business details
        business_name: settings.business_name || "",
        business_address: settings.business_address || "",
        business_city: settings.business_city || "",
        business_state: settings.business_state || "",
        business_postal_code: settings.business_postal_code || "",
        business_country: settings.business_country || "",
        business_gst_number: settings.business_gst_number || "",
        business_pan_number: settings.business_pan_number || "",
        business_phone: settings.business_phone || "",
        business_email: settings.business_email || "",
      });
    }
  }, [settings]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const settingsToSave = [
        // Contact
        { id: "contact_email", value: formData.contact_email },
        { id: "contact_phone", value: formData.contact_phone },
        { id: "currency", value: formData.currency },
        { id: "currency_symbol", value: formData.currency_symbol },
        // Social
        {
          id: "social_links",
          value: {
            facebook: formData.facebook,
            instagram: formData.instagram,
            twitter: formData.twitter,
          },
        },
        // Business details
        { id: "business_name", value: formData.business_name },
        { id: "business_address", value: formData.business_address },
        { id: "business_city", value: formData.business_city },
        { id: "business_state", value: formData.business_state },
        { id: "business_postal_code", value: formData.business_postal_code },
        { id: "business_country", value: formData.business_country },
        {
          id: "business_gst_number",
          value: formData.business_gst_number.toUpperCase(),
        },
        {
          id: "business_pan_number",
          value: formData.business_pan_number.toUpperCase(),
        },
        { id: "business_phone", value: formData.business_phone },
        { id: "business_email", value: formData.business_email },
      ];
      for (const setting of settingsToSave) {
        await setDoc(doc(db, "site_settings", setting.id), {
          value: setting.value,
          updated_at: serverTimestamp(),
        });
      }
      await refreshSettings();
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };

  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const settingsToSave = [
        { id: "contact_email", value: defaultSettings.contact_email },
        { id: "contact_phone", value: defaultSettings.contact_phone },
        { id: "currency", value: defaultSettings.currency },
        { id: "currency_symbol", value: defaultSettings.currency_symbol },
        { id: "social_links", value: defaultSettings.social_links },
        // Reset business details
        { id: "business_name", value: defaultSettings.business_name },
        { id: "business_address", value: defaultSettings.business_address },
        { id: "business_city", value: defaultSettings.business_city },
        { id: "business_state", value: defaultSettings.business_state },
        {
          id: "business_postal_code",
          value: defaultSettings.business_postal_code,
        },
        { id: "business_country", value: defaultSettings.business_country },
        {
          id: "business_gst_number",
          value: defaultSettings.business_gst_number,
        },
        {
          id: "business_pan_number",
          value: defaultSettings.business_pan_number,
        },
        { id: "business_phone", value: defaultSettings.business_phone },
        { id: "business_email", value: defaultSettings.business_email },
      ];
      for (const setting of settingsToSave) {
        await setDoc(doc(db, "site_settings", setting.id), {
          value: setting.value,
          updated_at: serverTimestamp(),
        });
      }
      setFormData({
        contact_email: defaultSettings.contact_email || "",
        contact_phone: defaultSettings.contact_phone || "",
        currency: defaultSettings.currency || "INR",
        currency_symbol: defaultSettings.currency_symbol || "₹",
        facebook: defaultSettings.social_links?.facebook || "",
        instagram: defaultSettings.social_links?.instagram || "",
        twitter: defaultSettings.social_links?.twitter || "",
        business_name: defaultSettings.business_name || "",
        business_address: defaultSettings.business_address || "",
        business_city: defaultSettings.business_city || "",
        business_state: defaultSettings.business_state || "",
        business_postal_code: defaultSettings.business_postal_code || "",
        business_country: defaultSettings.business_country || "",
        business_gst_number: defaultSettings.business_gst_number || "",
        business_pan_number: defaultSettings.business_pan_number || "",
        business_phone: defaultSettings.business_phone || "",
        business_email: defaultSettings.business_email || "",
      });
      await refreshSettings();
      toast.success("Settings reset to default successfully");
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("Failed to reset settings");
    }
    setIsResetting(false);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Site Settings</h1>
              <p className="text-sm text-muted-foreground">
                Customize your store and business details
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Details for Invoice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5" /> Business Details
              </CardTitle>
              <CardDescription>
                These details will appear on your tax invoices and bills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Legal Business Name</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Royal Store Pvt. Ltd."
                />
              </div>
              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_city">City</Label>
                  <Input
                    id="business_city"
                    name="business_city"
                    value={formData.business_city}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="business_state">State</Label>
                  <Input
                    id="business_state"
                    name="business_state"
                    value={formData.business_state}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_postal_code">Postal Code</Label>
                  <Input
                    id="business_postal_code"
                    name="business_postal_code"
                    value={formData.business_postal_code}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="business_country">Country</Label>
                  <Input
                    id="business_country"
                    name="business_country"
                    value={formData.business_country}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="business_gst_number"
                    className="flex items-center gap-2"
                  >
                    <Receipt className="h-4 w-4" />
                    GST Number
                  </Label>
                  <Input
                    id="business_gst_number"
                    name="business_gst_number"
                    value={formData.business_gst_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 27AABCU9603R1ZX"
                    className="uppercase"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="business_pan_number"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PAN Number
                  </Label>
                  <Input
                    id="business_pan_number"
                    name="business_pan_number"
                    value={formData.business_pan_number}
                    onChange={handleInputChange}
                    placeholder="e.g., AABCU9603R"
                    className="uppercase"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    name="business_phone"
                    value={formData.business_phone}
                    onChange={handleInputChange}
                    placeholder="+91 1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input
                    id="business_email"
                    name="business_email"
                    type="email"
                    value={formData.business_email}
                    onChange={handleInputChange}
                    placeholder="billing@yourstore.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="currency_symbol">Currency Symbol</Label>
                  <Input
                    id="currency_symbol"
                    name="currency_symbol"
                    value={formData.currency_symbol}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-5 w-5" /> Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleInputChange}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isResetting || isSaving}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset to Default
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Reset to Default Settings?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all settings to default values. This cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetToDefault}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="submit"
              disabled={isSaving || isResetting}
              className="bg-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
