/**
 * Image compression utility
 * Compresses images to a target size while maintaining quality
 */

export interface CompressionOptions {
    maxSizeKB: number;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxSizeKB: 300,
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
};

/**
 * Compress an image file to target size
 */
export async function compressImage(
    file: File,
    options: Partial<CompressionOptions> = {}
): Promise<File> {
    const config = { ...DEFAULT_OPTIONS, ...options };

    // If file is already smaller than target, return as-is
    if (file.size <= config.maxSizeKB * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions maintaining aspect ratio
                if (config.maxWidth && width > config.maxWidth) {
                    height = (height * config.maxWidth) / width;
                    width = config.maxWidth;
                }
                if (config.maxHeight && height > config.maxHeight) {
                    width = (width * config.maxHeight) / height;
                    height = config.maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Use better quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Determine output format
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

                // Binary search for the right quality
                let minQuality = 0.1;
                let maxQuality = config.quality || 0.8;
                let bestBlob: Blob | null = null;
                let bestQuality = maxQuality;

                const tryCompression = (quality: number): Promise<Blob | null> => {
                    return new Promise((resolveBlob) => {
                        canvas.toBlob(
                            (blob) => resolveBlob(blob),
                            outputType,
                            quality
                        );
                    });
                };

                const compress = async () => {
                    let attempts = 0;
                    const maxAttempts = 10;

                    while (attempts < maxAttempts) {
                        const midQuality = (minQuality + maxQuality) / 2;
                        const blob = await tryCompression(midQuality);

                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        const sizeKB = blob.size / 1024;

                        if (sizeKB <= config.maxSizeKB) {
                            bestBlob = blob;
                            bestQuality = midQuality;
                            minQuality = midQuality;
                        } else {
                            maxQuality = midQuality;
                        }

                        if (maxQuality - minQuality < 0.05) {
                            break;
                        }
                        attempts++;
                    }

                    if (!bestBlob) {
                        // If we can't get under target, use lowest quality attempt
                        bestBlob = await tryCompression(minQuality);
                    }

                    // Create new file from blob
                    const compressedFile = new File(
                        [bestBlob!],
                        file.name,
                        {
                            type: outputType,
                            lastModified: Date.now(),
                        }
                    );

                    resolve(compressedFile);
                };

                compress();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
}

/**
 * Get file size in KB
 */
export function getFileSizeKB(file: File): number {
    return Math.round((file.size / 1024) * 100) / 100;
}

/**
 * Check if file needs compression
 */
export function needsCompression(file: File, maxSizeKB: number = 300): boolean {
    return file.size > maxSizeKB * 1024;
}
