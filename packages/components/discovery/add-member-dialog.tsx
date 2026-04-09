'use client'

import { useState, ReactNode } from 'react'
import { Loader2, Search, Check } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/packages/components/ui/dialog'
import { Input } from '@/packages/components/ui/input'
import { Button } from '@/packages/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/packages/components/ui/avatar'
import { Badge } from '@/packages/components/ui/badge'

interface User {
  id: string
  name: string | null
  image: string | null
  urlId: string
  email?: string
}

interface AddMemberDialogProps {
  squadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded: (member: any) => void
  children: ReactNode
}

export function AddMemberDialog({ squadId, open, onOpenChange, onMemberAdded, children }: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    setAdding(userId)
    try {
      const response = await fetch(`/api/discovery/squads/${squadId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add member')
      }

      const data = await response.json()
      onMemberAdded(data)
      setSearchQuery('')
      setSearchResults([])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAdding(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div onClick={() => onOpenChange(true)}>{children}</div>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member to Squad</DialogTitle>
          <DialogDescription>Search and add users to your squad</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {user.image && <AvatarImage src={user.image} alt={user.name || 'User'} />}
                      <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name || 'Unknown'}</p>
                      {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={adding === user.id ? 'default' : 'outline'}
                    onClick={() => handleAddMember(user.id)}
                    disabled={adding !== null}
                  >
                    {adding === user.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
