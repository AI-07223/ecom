'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { settings } = useSiteSettings()

    useEffect(() => {
        // Log the error to console for debugging
        console.error('Application error:', error)
    }, [error])

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: `${settings.accent_color}20` }}
                >
                    <AlertTriangle
                        className="h-10 w-10"
                        style={{ color: settings.accent_color }}
                    />
                </div>

                <h1 className="text-3xl font-bold mb-2">Something Went Wrong</h1>
                <p className="text-muted-foreground mb-8">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>

                {error.digest && (
                    <p className="text-xs text-muted-foreground mb-4">
                        Error ID: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="w-full sm:w-auto"
                        style={{ backgroundColor: settings.primary_color }}
                    >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Home className="h-4 w-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
