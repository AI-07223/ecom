'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { toast } from 'sonner'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { settings } = useSiteSettings()
    const oobCode = searchParams.get('oobCode')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const [success, setSuccess] = useState(false)
    const [email, setEmail] = useState('')

    // Verify the reset code on mount
    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                toast.error('Invalid or expired password reset link')
                setVerifying(false)
                return
            }

            try {
                const email = await verifyPasswordResetCode(auth, oobCode)
                setEmail(email)
                setIsValid(true)
            } catch (error) {
                console.error('Invalid reset code:', error)
                toast.error('This password reset link is invalid or has expired')
                setIsValid(false)
            }
            setVerifying(false)
        }

        verifyCode()
    }, [oobCode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        if (!oobCode) {
            toast.error('Invalid reset code')
            return
        }

        setLoading(true)

        try {
            await confirmPasswordReset(auth, oobCode, password)
            setSuccess(true)
            toast.success('Password reset successful!')
        } catch (error) {
            console.error('Error resetting password:', error)
            toast.error('Failed to reset password. Please try again.')
        }

        setLoading(false)
    }

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!isValid) {
        return (
            <div className="min-h-screen flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-red-600">
                            Invalid Link
                        </CardTitle>
                        <CardDescription>
                            This password reset link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Please request a new password reset link.
                        </p>
                        <Link href="/login">
                            <Button className="w-full" style={{ backgroundColor: settings.primary_color }}>
                                Back to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            Password Reset Successful!
                        </CardTitle>
                        <CardDescription>
                            Your password has been updated successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            You can now sign in with your new password.
                        </p>
                        <Link href="/login">
                            <Button className="w-full" style={{ backgroundColor: settings.primary_color }}>
                                Go to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle
                        className="text-2xl font-bold"
                        style={{ color: settings.primary_color }}
                    >
                        Reset Password
                    </CardTitle>
                    <CardDescription>
                        Create a new password for {email}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Must be at least 6 characters
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                            style={{ backgroundColor: settings.primary_color }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>

                    <Link
                        href="/login"
                        className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Login
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

function ResetPasswordSkeleton() {
    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md h-96 bg-muted rounded-lg animate-pulse"></div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordSkeleton />}>
            <ResetPasswordForm />
        </Suspense>
    )
}
