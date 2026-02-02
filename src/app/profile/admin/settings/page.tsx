"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Palette,
  Store,
  Mail,
  Globe,
  RotateCcw,
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
    site_name: "",
    site_description: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    footer_text: "",
    contact_email: "",
    contact_phone: "",
    currency: "",
    currency_symbol: "",
    facebook: "",
    instagram: "",
    twitter: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (settings) {
      setFormData({
        site_name: settings.site_name || "",
        site_description: settings.site_description || "",
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        primary_color: settings.primary_color || "#7c3aed",
        secondary_color: settings.secondary_color || "#a78bfa",
        accent_color: settings.accent_color || "#f59e0b",
        footer_text: settings.footer_text || "",
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        currency: settings.currency || "INR",
        currency_symbol: settings.currency_symbol || "₹",
        facebook: settings.social_links?.facebook || "",
        instagram: settings.social_links?.instagram || "",
        twitter: settings.social_links?.twitter || "",
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
        { id: "site_name", value: formData.site_name },
        { id: "site_description", value: formData.site_description },
        { id: "logo_url", value: formData.logo_url },
        { id: "favicon_url", value: formData.favicon_url },
        { id: "primary_color", value: formData.primary_color },
        { id: "secondary_color", value: formData.secondary_color },
        { id: "accent_color", value: formData.accent_color },
        { id: "footer_text", value: formData.footer_text },
        { id: "contact_email", value: formData.contact_email },
        { id: "contact_phone", value: formData.contact_phone },
        { id: "currency", value: formData.currency },
        { id: "currency_symbol", value: formData.currency_symbol },
        {
          id: "social_links",
          value: {
            facebook: formData.facebook,
            instagram: formData.instagram,
            twitter: formData.twitter,
          },
        },
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
        { id: "site_name", value: defaultSettings.site_name },
        { id: "site_description", value: defaultSettings.site_description },
        { id: "logo_url", value: defaultSettings.logo_url },
        { id: "favicon_url", value: defaultSettings.favicon_url },
        { id: "primary_color", value: defaultSettings.primary_color },
        { id: "secondary_color", value: defaultSettings.secondary_color },
        { id: "accent_color", value: defaultSettings.accent_color },
        { id: "footer_text", value: defaultSettings.footer_text },
        { id: "contact_email", value: defaultSettings.contact_email },
        { id: "contact_phone", value: defaultSettings.contact_phone },
        { id: "currency", value: defaultSettings.currency },
        { id: "currency_symbol", value: defaultSettings.currency_symbol },
        { id: "social_links", value: defaultSettings.social_links },
      ];
      for (const setting of settingsToSave) {
        await setDoc(doc(db, "site_settings", setting.id), {
          value: setting.value,
          updated_at: serverTimestamp(),
        });
      }
      setFormData({
        site_name: defaultSettings.site_name || "",
        site_description: defaultSettings.site_description || "",
        logo_url: defaultSettings.logo_url || "",
        favicon_url: defaultSettings.favicon_url || "",
        primary_color: defaultSettings.primary_color || "#7c3aed",
        secondary_color: defaultSettings.secondary_color || "#a78bfa",
        accent_color: defaultSettings.accent_color || "#f59e0b",
        footer_text: defaultSettings.footer_text || "",
        contact_email: defaultSettings.contact_email || "",
        contact_phone: defaultSettings.contact_phone || "",
        currency: defaultSettings.currency || "INR",
        currency_symbol: defaultSettings.currency_symbol || "₹",
        facebook: defaultSettings.social_links?.facebook || "",
        instagram: defaultSettings.social_links?.instagram || "",
        twitter: defaultSettings.social_links?.twitter || "",
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
                Customize your store
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-5 w-5" /> Store Information
              </CardTitle>
              <CardDescription>Basic store details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site_name">Store Name</Label>
                <Input
                  id="site_name"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="site_description">Description</Label>
                <Textarea
                  id="site_description"
                  name="site_description"
                  value={formData.site_description}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="favicon_url">Favicon URL</Label>
                  <Input
                    id="favicon_url"
                    name="favicon_url"
                    value={formData.favicon_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="footer_text">Footer Text</Label>
                <Input
                  id="footer_text"
                  name="footer_text"
                  value={formData.footer_text}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5" /> Branding Colors
              </CardTitle>
              <CardDescription>Customize your store colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["primary_color", "secondary_color", "accent_color"].map(
                  (color) => (
                    <div key={color}>
                      <Label htmlFor={color}>
                        {color
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={color}
                          name={color}
                          type="color"
                          value={formData[color as keyof typeof formData]}
                          onChange={handleInputChange}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={formData[color as keyof typeof formData]}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [color]: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div
                className="mt-4 p-4 rounded-lg"
                style={{ backgroundColor: formData.primary_color }}
              >
                <p className="text-white text-center">Primary Color Preview</p>
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
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Phone</Label>
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
              style={{ backgroundColor: settings.primary_color }}
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
