// Firebase doesn't need a callback route for popup auth
// This route is kept for potential email link authentication in the future
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const mode = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')

    // Handle email verification or password reset if needed
    if (mode === 'verifyEmail' && oobCode) {
        // Email verification would be handled here
        return NextResponse.redirect(`${origin}/login?verified=true`)
    }

    if (mode === 'resetPassword' && oobCode) {
        // Redirect to password reset page
        return NextResponse.redirect(`${origin}/reset-password?oobCode=${oobCode}`)
    }

    // Default redirect to profile
    return NextResponse.redirect(`${origin}/profile`)
}
