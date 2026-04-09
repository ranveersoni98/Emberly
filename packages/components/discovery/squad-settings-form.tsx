'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle, Trash2, Check } from 'lucide-react'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/packages/components/ui/form'
import { Input } from '@/packages/components/ui/input'
import { Textarea } from '@/packages/components/ui/textarea'
import { Button } from '@/packages/components/ui/button'
import { Switch } from '@/packages/components/ui/switch'
import { Card } from '@/packages/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/packages/components/ui/alert-dialog'

import type { NexiumSquad } from '@/prisma/generated/prisma/client'

const updateSquadSchema = z.object({
  name: z.string().min(2, 'Squad name must be at least 2 characters').max(100, 'Squad name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  maxSize: z.number().min(2, 'Max size must be at least 2').max(100, 'Max size must be at most 100').optional(),
  isPublic: z.boolean().default(true),
  skills: z.string().optional(),
})

type UpdateSquadInput = z.infer<typeof updateSquadSchema>

interface SquadSettingsFormProps {
  squad: NexiumSquad
  onUpdated: () => void
}

export function SquadSettingsForm({ squad, onUpdated }: SquadSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDisbanding, setIsDisbanding] = useState(false)

  const form = useForm<UpdateSquadInput>({
    resolver: zodResolver(updateSquadSchema),
    defaultValues: {
      name: squad.name,
      description: squad.description || '',
      maxSize: squad.maxSize,
      isPublic: squad.isPublic,
      skills: squad.skills?.join(', ') || '',
    },
  })

  const onSubmit = async (data: UpdateSquadInput) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/discovery/squads/${squad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          maxSize: data.maxSize,
          isPublic: data.isPublic,
          skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update squad')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDisband = async () => {
    setIsDisbanding(true)
    try {
      const response = await fetch(`/api/discovery/squads/${squad.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to disband squad')

      router.push('/discovery/squads')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disband squad')
      setIsDisbanding(false)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Squad Settings</h3>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <p className="text-sm text-green-500">Squad settings updated successfully</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Squad Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>Optional description of your squad's purpose</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (Comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="React, TypeScript, UI Design" {...field} />
                  </FormControl>
                  <FormDescription>Skills your squad focuses on</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Squad Size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="2"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Maximum number of members allowed</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Public Squad</FormLabel>
                    <FormDescription>Anyone can discover and join your squad</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Once you disband the squad, there is no going back. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Disband Squad
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disband Squad?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently disband the squad. All members will be removed and this action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisband}
                disabled={isDisbanding}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDisbanding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Disband Squad
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  )
}
