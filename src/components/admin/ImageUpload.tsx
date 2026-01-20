'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase/config'
import { toast } from 'sonner'

interface ImageUploadProps {
    value: string[]
    onChange: (urls: string[]) => void
    maxImages?: number
    folder?: string
}

export function ImageUpload({
    value = [],
    onChange,
    maxImages = 5,
    folder = 'products'
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const remainingSlots = maxImages - value.length
        if (remainingSlots <= 0) {
            toast.error(`Maximum ${maxImages} images allowed`)
            return
        }

        const filesToUpload = Array.from(files).slice(0, remainingSlots)
        setIsUploading(true)
        setUploadProgress(0)

        try {
            const uploadedUrls: string[] = []

            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i]

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    toast.error(`${file.name} is not an image`)
                    continue
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`${file.name} is too large (max 5MB)`)
                    continue
                }

                // Create unique filename
                const timestamp = Date.now()
                const randomString = Math.random().toString(36).substring(7)
                const extension = file.name.split('.').pop()
                const filename = `${folder}/${timestamp}-${randomString}.${extension}`

                // Upload to Firebase Storage
                const storageRef = ref(storage, filename)
                await uploadBytes(storageRef, file)
                const downloadUrl = await getDownloadURL(storageRef)

                uploadedUrls.push(downloadUrl)
                setUploadProgress(((i + 1) / filesToUpload.length) * 100)
            }

            if (uploadedUrls.length > 0) {
                onChange([...value, ...uploadedUrls])
                toast.success(`${uploadedUrls.length} image(s) uploaded`)
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload images')
        }

        setIsUploading(false)
        setUploadProgress(0)

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removeImage = async (indexToRemove: number) => {
        const urlToRemove = value[indexToRemove]

        // Try to delete from storage if it's a Firebase URL
        if (urlToRemove.includes('firebasestorage.googleapis.com')) {
            try {
                const storageRef = ref(storage, urlToRemove)
                await deleteObject(storageRef)
            } catch (error) {
                // Ignore errors - file might already be deleted
                console.log('Could not delete from storage:', error)
            }
        }

        onChange(value.filter((_, index) => index !== indexToRemove))
    }

    const moveImage = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= value.length) return

        const newImages = [...value]
        const [movedImage] = newImages.splice(fromIndex, 1)
        newImages.splice(toIndex, 0, movedImage)
        onChange(newImages)
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isUploading ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
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
                        <p className="text-sm text-muted-foreground">Uploading... {Math.round(uploadProgress)}%</p>
                        <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div
                        className="cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, WEBP up to 5MB ({value.length}/{maxImages} images)
                        </p>
                    </div>
                )}
            </div>

            {/* Image Preview Grid */}
            {value.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {value.map((url, index) => (
                        <div
                            key={url}
                            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                        >
                            <Image
                                src={url}
                                alt={`Product image ${index + 1}`}
                                fill
                                className="object-cover"
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
                First image will be used as the product thumbnail. Drag to reorder.
            </p>
        </div>
    )
}
