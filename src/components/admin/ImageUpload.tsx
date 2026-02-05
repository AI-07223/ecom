"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, Loader2, ImagePlus, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  compressImage,
  getFileSizeKB,
  needsCompression,
} from "@/lib/utils/imageCompression";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  folder = "products",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressingFiles, setCompressingFiles] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, source: "gallery" | "camera" = "gallery") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Dynamically import storage to prevent crashes if not configured
      const { ref, uploadBytes, getDownloadURL } =
        await import("firebase/storage");
      const { storage } = await import("@/lib/firebase/config");

      const uploadedUrls: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        let file = filesToUpload[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Compress image if needed (target 300KB)
        if (needsCompression(file, 300)) {
          setCompressingFiles((prev) => [...prev, file.name]);
          const originalSize = getFileSizeKB(file);
          try {
            file = await compressImage(file, { maxSizeKB: 300 });
            const compressedSize = getFileSizeKB(file);
            toast.success(
              `Compressed ${file.name} from ${originalSize}KB to ${compressedSize}KB`,
            );
          } catch (error) {
            console.error("Compression failed:", error);
            toast.error(`Failed to compress ${file.name}, uploading original`);
          }
          setCompressingFiles((prev) =>
            prev.filter((name) => name !== file.name),
          );
        }

        // Create unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = file.name.split(".").pop() || "jpg";
        const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

        // Upload to Firebase Storage
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        uploadedUrls.push(downloadUrl);
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} image(s) uploaded`);
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);
      let errorMsg = "Image upload failed";
      if (error instanceof Error) {
        if (
          error.message.includes("unauthorized") ||
          error.message.includes("Unauthorized")
        ) {
          errorMsg =
            "Upload failed: You don't have permission. Please check if you're logged in as admin.";
        } else if (
          error.message.includes("cors") ||
          error.message.includes("CORS")
        ) {
          errorMsg =
            "Upload failed: CORS error. Please try again or use image URL.";
        } else if (error.message.includes("network")) {
          errorMsg =
            "Upload failed: Network error. Please check your connection.";
        } else {
          errorMsg = `Upload failed: ${error.message}`;
        }
      }
      toast.error(errorMsg);
    }

    setIsUploading(false);
    setUploadProgress(0);
    setCompressingFiles([]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const addUrlImage = () => {
    if (!urlInput.trim()) return;

    if (value.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
      onChange([...value, urlInput.trim()]);
      setUrlInput("");
      toast.success("Image added");
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length) return;

    const newImages = [...value];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  const remainingSlots = maxImages - value.length;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {remainingSlots > 0 && !isUploading && (
        <div className="grid grid-cols-2 gap-3">
          {/* Gallery Upload */}
          <div
            className="border-2 border-dashed border-[#E2E0DA] rounded-xl p-4 text-center transition-colors hover:border-[#2D5A27] hover:bg-[#F0EFE8] cursor-pointer tap-active"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e, "gallery")}
              className="hidden"
              disabled={isUploading || remainingSlots <= 0}
            />
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
              <ImagePlus className="h-5 w-5 text-[#2D5A27]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]">Gallery</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Choose from photos</p>
          </div>

          {/* Camera Capture */}
          <div
            className="border-2 border-dashed border-[#E2E0DA] rounded-xl p-4 text-center transition-colors hover:border-[#2D5A27] hover:bg-[#F0EFE8] cursor-pointer tap-active"
            onClick={() => cameraInputRef.current?.click()}
          >
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileSelect(e, "camera")}
              className="hidden"
              disabled={isUploading || remainingSlots <= 0}
            />
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
              <Camera className="h-5 w-5 text-[#2D5A27]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]">Camera</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Take a photo</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="border-2 border-[#2D5A27] rounded-xl p-6 text-center bg-[#F0EFE8]">
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-[#2D5A27]" />
            <p className="text-sm text-[#6B7280]">
              {compressingFiles.length > 0
                ? `Compressing ${compressingFiles[0]}...`
                : `Uploading... ${Math.round(uploadProgress)}%`}
            </p>
            <div className="w-full max-w-xs mx-auto bg-[#E2E0DA] rounded-full h-2">
              <div
                className="bg-[#2D5A27] h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#6B7280]">
              Images are automatically compressed to 300KB max
            </p>
          </div>
        </div>
      )}

      {/* URL Input Fallback */}
      {remainingSlots > 0 && !isUploading && (
        <div className="flex gap-2">
          <Input
            placeholder="Or paste image URL here..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addUrlImage())
            }
            className="border-[#E2E0DA] focus:border-[#2D5A27]"
          />
          <Button type="button" variant="outline" onClick={addUrlImage} className="border-[#E2E0DA]">
            Add URL
          </Button>
        </div>
      )}

      {/* Image Limit Indicator */}
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>{value.length} / {maxImages} images</span>
        {remainingSlots === 0 && (
          <span className="text-amber-600">Maximum images reached</span>
        )}
      </div>

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#F0EFE8] border border-[#E2E0DA] group"
            >
              <Image
                src={url}
                alt={`Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                unoptimized
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={() => moveImage(index, index - 1)}
                  >
                    ←
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {index < value.length - 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={() => moveImage(index, index + 1)}
                  >
                    →
                  </Button>
                )}
              </div>

              {/* Main image badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-[#2D5A27] text-white text-xs px-2 py-1 rounded-lg font-medium">
                  Main
                </div>
              )}

              {/* Image number */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#6B7280]">
        First image will be used as the product thumbnail. Tap arrows to reorder, X to remove.
      </p>
    </div>
  );
}
