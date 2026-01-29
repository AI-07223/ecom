"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, Loader2, Upload, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  compressImage,
  getFileSizeKB,
  needsCompression,
} from "@/lib/utils/imageCompression";

interface SingleImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
}

export function SingleImageUpload({
  value,
  onChange,
  folder = "categories",
  label = "Category Image",
}: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large (max 5MB before compression)");
      return;
    }

    setIsUploading(true);

    let fileToUpload = file;

    // Compress image if needed
    if (needsCompression(file, 300)) {
      setIsCompressing(true);
      const originalSize = getFileSizeKB(file);
      try {
        fileToUpload = await compressImage(file, { maxSizeKB: 300 });
        const compressedSize = getFileSizeKB(fileToUpload);
        toast.success(
          `Compressed from ${originalSize}KB to ${compressedSize}KB`,
        );
      } catch (error) {
        console.error("Compression failed:", error);
        toast.error("Failed to compress image, uploading original");
      }
      setIsCompressing(false);
    }

    try {
      // Dynamically import storage to prevent crashes if not configured
      const { ref, uploadBytes, getDownloadURL } =
        await import("firebase/storage");
      const { storage } = await import("@/lib/firebase/config");

      // Create unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = fileToUpload.name.split(".").pop();
      const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, fileToUpload);
      const downloadUrl = await getDownloadURL(storageRef);

      onChange(downloadUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Try using an image URL instead.");
      setShowUrlInput(true);
    }

    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addUrlImage = () => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      new URL(urlInput);
      onChange(urlInput.trim());
      setUrlInput("");
      setShowUrlInput(false);
      toast.success("Image added");
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>

      {value ? (
        /* Image Preview */
        <div className="relative w-full aspect-video max-w-[300px] rounded-lg overflow-hidden bg-muted group">
          <Image
            src={value}
            alt={label}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={removeImage}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer max-w-[300px] ${
              isUploading
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading || isCompressing ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {isCompressing ? "Compressing..." : "Uploading..."}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP up to 5MB
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ✓ Auto-compressed to 300KB
                </p>
              </div>
            )}
          </div>

          {/* Toggle URL Input */}
          {!showUrlInput && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowUrlInput(true)}
            >
              Or use image URL instead
            </button>
          )}

          {/* URL Input */}
          {showUrlInput && (
            <div className="flex gap-2 max-w-[300px]">
              <Input
                placeholder="Paste image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addUrlImage())
                }
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUrlImage}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
