"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, Loader2, ImagePlus, Minimize2 } from "lucide-react";
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        // Compress image if needed
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
        const extension = file.name.split(".").pop();
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
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        "Image upload failed. Please add image URL manually or enable Firebase Storage.",
      );
    }

    setIsUploading(false);
    setUploadProgress(0);
    setCompressingFiles([]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isUploading
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || value.length >= maxImages}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {compressingFiles.length > 0
                ? `Compressing ${compressingFiles[0]}...`
                : `Uploading... ${Math.round(uploadProgress)}%`}
            </p>
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Images are automatically compressed to 300KB max
            </p>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <Minimize2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Click to upload images</p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WEBP up to 5MB ({value.length}/{maxImages} images)
            </p>
            <p className="text-xs text-green-600 mt-1">
              ✓ Automatic compression to 300KB
            </p>
          </div>
        )}
      </div>

      {/* URL Input Fallback */}
      <div className="flex gap-2">
        <Input
          placeholder="Or paste image URL here..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), addUrlImage())
          }
        />
        <Button type="button" variant="outline" onClick={addUrlImage}>
          Add URL
        </Button>
      </div>

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              <Image
                src={url}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
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
                    className="h-8 w-8"
                    onClick={() => moveImage(index, index + 1)}
                  >
                    →
                  </Button>
                )}
              </div>

              {/* Main image badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        First image will be used as the product thumbnail.
      </p>
    </div>
  );
}
