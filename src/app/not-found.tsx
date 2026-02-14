import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1
                    className="text-9xl font-bold mb-4 text-[#2D5A27]"
                >
                    404
                </h1>
                <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
                <p className="text-muted-foreground mb-8">
                    Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/">
                        <Button
                            className="w-full sm:w-auto bg-[#2D5A27] hover:bg-[#3B7D34]"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                    <Link href="/products">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Search className="h-4 w-4 mr-2" />
                            Browse Products
                        </Button>
                    </Link>
                    <button onClick={() => window.history.back()}>
                        <Button variant="ghost" className="w-full sm:w-auto">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </button>
                </div>
            </div>
        </div>
    )
}
