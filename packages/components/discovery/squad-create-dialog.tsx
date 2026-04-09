'use client'

import { useState, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/packages/components/ui/dialog'
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

const createSquadSchema = z.object({
  name: z.string().min(2, 'Squad name must be at least 2 characters').max(100, 'Squad name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  maxSize: z.number().min(2, 'Max size must be at least 2').max(100, 'Max size must be at most 100').optional(),
  isPublic: z.boolean().default(true),
  skills: z.string().optional(),
})

type CreateSquadInput = z.infer<typeof createSquadSchema>

interface SquadCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSquadCreated: () => void
  children: ReactNode
}

export function SquadCreateDialog({ open, onOpenChange, onSquadCreated, children }: SquadCreateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateSquadInput>({
    resolver: zodResolver(createSquadSchema),
    defaultValues: {
      name: '',
      description: '',
      maxSize: 5,
      isPublic: true,
      skills: '',
    },
  })

  const onSubmit = async (data: CreateSquadInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/discovery/squads', {
        method: 'POST',
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
        throw new Error(error.error || 'Failed to create squad')
      }

      form.reset()
      onSquadCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div onClick={() => onOpenChange(true)}>{children}</div>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Squad</DialogTitle>
          <DialogDescription>Set up your team for collaboration and project work.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Squad Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Squad" {...field} />
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
                    <Textarea placeholder="What's this squad about?" {...field} />
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Squad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
