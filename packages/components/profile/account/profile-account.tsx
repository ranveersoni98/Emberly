'use client'

import { useRef, useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { ProfileAccountProps } from '@/packages/types/components/profile'
import { useSession } from 'next-auth/react'

import { Avatar, AvatarFallback, AvatarImage } from '@/packages/components/ui/avatar'
import { Button } from '@/packages/components/ui/button'
import { Input } from '@/packages/components/ui/input'
import { Label } from '@/packages/components/ui/label'
import { Textarea } from '@/packages/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/components/ui/select'
import { Switch } from '@/packages/components/ui/switch'

import { useToast } from '@/packages/hooks/use-toast'

export function ProfileAccount({ user, onUpdate }: ProfileAccountProps) {
  const { update: updateSession } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [linkedAccounts, setLinkedAccounts] = useState<Array<{ provider: string; providerUsername?: string }>>([])

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)
  const websiteRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch linked accounts on mount
  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      try {
        const response = await fetch('/api/profile/linked-accounts')
        if (response.ok) {
          const data = await response.json()
          setLinkedAccounts(data.linkedAccounts || [])
        }
      } catch (error) {
        console.error('Failed to fetch linked accounts:', error)
      }
    }
    fetchLinkedAccounts()
  }, [])

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setIsLoading(true)
    try {
      const file = e.target.files[0]
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload avatar')
      }

      const { url } = await response.json()

      await updateSession({
        user: {
          ...user,
          image: url,
        },
      })

      router.refresh()

      onUpdate()

      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to update avatar',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameRef.current?.value,
          email: emailRef.current?.value,
          bio: bioRef.current?.value || null,
          website: websiteRef.current?.value || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      const data = await response.json()

      await updateSession({
        user: {
          ...user,
          name: data.name,
          email: data.email,
        },
      })

      router.refresh()

      onUpdate()

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleValueChange = async (
    value: boolean | string,
    key: string,
    description: string
  ) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: value,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update settings')
      }

      router.refresh()

      onUpdate()

      toast({
        title: 'Success',
        description: description,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User avatar'}
              className="object-cover"
            />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerAvatarUpload}
            disabled={isLoading}
            className="mt-4 w-full"
          >
            {isLoading ? 'Uploading...' : 'Change Avatar'}
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="flex-1">
          <form
            onSubmit={handleProfileUpdate}
            className="flex flex-col justify-center h-full space-y-4"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  ref={nameRef}
                  defaultValue={user.name || ''}
                  placeholder="Your username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  ref={emailRef}
                  defaultValue={user.email || ''}
                  placeholder="Your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  ref={bioRef}
                  defaultValue={(user as any).bio || ''}
                  placeholder="Tell us about yourself (max 500 characters)"
                  maxLength={500}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {((user as any).bio || '').length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  ref={websiteRef}
                  type="url"
                  defaultValue={(user as any).website || ''}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      {/* Linked Accounts Section */}
      <p className="text-sm text-muted-foreground mt-6">
        To connect or manage your accounts, visit the <span className="font-medium">Linked Accounts</span> section in the tabs above
      </p>

      {/* Profile Visibility Section */}
      <div className="flex items-center justify-between rounded-lg border p-4 mt-6">
        <div className="space-y-0.5">
          <Label htmlFor="profile-visibility">Public Profile</Label>
          <p className="text-sm text-muted-foreground">
            Make your profile visible to other users at <span className="font-medium">/user/{(user as any).urlId || (user as any).vanityId}</span>
          </p>
        </div>
        <Switch
          id="profile-visibility"
          checked={(user as any).isProfilePublic ?? true}
          onCheckedChange={(c) =>
            handleValueChange(
              c,
              'isProfilePublic',
              'Profile visibility updated successfully'
            )
          }
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
        <div className="space-y-0.5">
          <Label htmlFor="randomize-urls">Randomize File URLs</Label>
          <p className="text-sm text-muted-foreground">
            When enabled, all new uploads will have randomized URLs instead of
            using the original filename.
          </p>
        </div>
        <Switch
          id="randomize-urls"
          checked={user.randomizeFileUrls}
          onCheckedChange={(c) =>
            handleValueChange(
              c,
              'randomizeFileUrls',
              'File URL settings updated successfully'
            )
          }
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
        <div className="space-y-0.5">
          <Label htmlFor="rich-embeds">Enable Rich Embeds</Label>
          <p className="text-sm text-muted-foreground">
            When enabled, your shared files will include rich metadata for
            previews on Discord, Twitter, and other platforms.
          </p>
        </div>
        <Switch
          id="rich-embeds"
          checked={user.enableRichEmbeds}
          onCheckedChange={(v) =>
            handleValueChange(
              v,
              'enableRichEmbeds',
              'Rich embed settings updated successfully'
            )
          }
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
        <div className="space-y-0.5">
          <Label>Default file expiry action</Label>
          <p className="text-sm text-muted-foreground">
            Set the default file expiry action when creating a new upload
          </p>
        </div>
        <div className="w-1/4 ml-auto">
          <Select
            value={user.defaultFileExpirationAction ?? undefined}
            onValueChange={(v) =>
              handleValueChange(
                v,
                'defaultFileExpirationAction',
                'Default file expiration action updated successfully'
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DELETE">Delete file</SelectItem>
              <SelectItem value="SET_PRIVATE">Set to private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
        <div className="space-y-0.5">
          <Label>Default file expiry time</Label>
          <p className="text-sm text-muted-foreground">
            Set the default relative time before an upload expires
          </p>
        </div>
        <div className="w-1/4 ml-auto">
          <Select
            value={user.defaultFileExpiration ?? undefined}
            onValueChange={(v) =>
              handleValueChange(
                v,
                'defaultFileExpiration',
                'Default file expiration time updated successfully'
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="DAY">One hour</SelectItem>
              <SelectItem value="HOUR">One day</SelectItem>
              <SelectItem value="WEEK">One week</SelectItem>
              <SelectItem value="MONTH">One month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}
