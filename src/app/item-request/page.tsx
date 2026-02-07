"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Plus, ArrowLeft, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import { compressImage } from "@/lib/utils/imageCompression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export default function ItemRequestPage() {
  const router = useRouter();
  const { user, profile, isWholeseller, isLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [formData, setFormData] = useState({
    item_name: "",
    item_description: "",
    requested_price: "",
    quantity_needed: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isLoading && (!user || !isWholeseller)) {
      router.push("/profile");
    }
  }, [user, isWholeseller, isLoading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      // Compress image
      try {
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, {
          type: "image/jpeg",
        });
        newImages.push(compressedFile);
        newPreviews.push(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const storageRef = ref(
        storage,
        `item_requests/${user!.uid}/${timestamp}-${randomString}.jpg`,
      );

      try {
        toast.loading(`Uploading image ${i + 1} of ${images.length}...`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
        setUploadProgress(((i + 1) / images.length) * 100);
        toast.dismiss();
      } catch (error: unknown) {
        console.error("Error uploading image:", error);
        toast.dismiss();
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to upload image ${i + 1}: ${errorMessage}`);
      }
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error("Please sign in to submit a request");
      return;
    }

    if (!formData.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (images.length > 0) {
        toast.loading("Uploading images...");
        imageUrls = await uploadImages();
        toast.dismiss();
      }

      // Create request document
      await addDoc(collection(db, "item_requests"), {
        user_id: user.uid,
        user_email: user.email,
        user_name: profile.full_name || user.email?.split("@")[0] || "Unknown",
        item_name: formData.item_name.trim(),
        item_description: formData.item_description.trim() || null,
        requested_price: formData.requested_price
          ? parseFloat(formData.requested_price)
          : null,
        quantity_needed: formData.quantity_needed
          ? parseInt(formData.quantity_needed)
          : null,
        images: imageUrls,
        status: "pending",
        admin_notes: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success("Item request submitted successfully!");
      router.push("/profile/item-requests");
    } catch (error: unknown) {
      console.error("Error submitting request:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Please try again";
      toast.error(`Failed to submit request: ${errorMessage}`);
    }

    setIsSubmitting(false);
  };

  if (isLoading || !isWholeseller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Request an Item</h1>
          <p className="text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Submit a request and
            we&apos;ll try to source it for you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Name */}
              <div>
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  placeholder="What product are you looking for?"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="item_description">Description</Label>
                <Textarea
                  id="item_description"
                  name="item_description"
                  value={formData.item_description}
                  onChange={handleInputChange}
                  placeholder="Provide details about the item (brand, model, specifications, etc.)"
                  rows={4}
                />
              </div>

              {/* Price and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requested_price">
                    Expected Price ({settings.currency_symbol})
                  </Label>
                  <Input
                    id="requested_price"
                    name="requested_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.requested_price}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity_needed">Quantity Needed</Label>
                  <Input
                    id="quantity_needed"
                    name="quantity_needed"
                    type="number"
                    min="1"
                    value={formData.quantity_needed}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <Label>Reference Images (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload photos of the item you&apos;re looking for (max 5
                  images, ~300KB each)
                </p>

                <div className="flex flex-wrap gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Link href="/profile" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
