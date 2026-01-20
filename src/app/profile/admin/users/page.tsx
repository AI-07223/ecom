'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Shield, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

interface UserProfile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    phone: string | null
    is_admin: boolean
    created_at: { toDate: () => Date } | Date
}

export default function AdminUsersPage() {
    const router = useRouter()
    const { user, isAdmin, isLoading: authLoading } = useAuth()
    const { settings } = useSiteSettings()

    const [users, setUsers] = useState<UserProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/profile')
        }
    }, [user, isAdmin, authLoading, router])

    const fetchUsers = async () => {
        try {
            const usersSnap = await getDocs(query(collection(db, 'profiles'), orderBy('created_at', 'desc')))
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[])
        } catch (error) {
            console.error('Error fetching users:', error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (isAdmin) {
            fetchUsers()
        }
    }, [isAdmin])

    const formatDate = (date: { toDate: () => Date } | Date | undefined) => {
        if (!date) return 'N/A'
        const d = 'toDate' in date ? date.toDate() : date
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const toggleAdmin = async (userId: string, currentStatus: boolean) => {
        if (userId === user?.uid) {
            toast.error("You can't change your own admin status")
            return
        }

        try {
            await updateDoc(doc(db, 'profiles', userId), {
                is_admin: !currentStatus,
                updated_at: serverTimestamp(),
            })
            toast.success(currentStatus ? 'Admin access removed' : 'Admin access granted')
            fetchUsers()
        } catch (error) {
            console.error('Error updating user:', error)
            toast.error('Failed to update user')
        }
    }

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Users</h1>
                <p className="text-muted-foreground">{users.length} registered users</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((profile) => (
                                    <TableRow key={profile.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={profile.avatar_url || undefined} />
                                                    <AvatarFallback>
                                                        {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{profile.full_name || 'No name'}</p>
                                                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{profile.phone || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={profile.is_admin ? 'default' : 'secondary'}>
                                                {profile.is_admin ? 'Admin' : 'Customer'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(profile.created_at)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleAdmin(profile.id, profile.is_admin)}
                                                disabled={profile.id === user?.uid}
                                            >
                                                {profile.is_admin ? (
                                                    <>
                                                        <ShieldOff className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="h-4 w-4 mr-1" />
                                                        Make Admin
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
