'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Crown, Trash2, MoreVertical, UserPlus } from 'lucide-react'

import { Card } from '@/packages/components/ui/card'
import { Button } from '@/packages/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/packages/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/packages/components/ui/avatar'
import { Badge } from '@/packages/components/ui/badge'

import { AddMemberDialog } from '@/packages/components/discovery/add-member-dialog'
import { MemberRoleSelector } from '@/packages/components/discovery/member-role-selector'
import type { NexiumSquadMember } from '@/prisma/generated/prisma/client'

interface SquadMembersManagerProps {
  squadId: string
  members: (NexiumSquadMember & {
    user: { name: string | null; image: string | null; urlId: string }
  })[]
  isOwner: boolean
}

export function SquadMembersManager({ squadId, members: initialMembers, isOwner }: SquadMembersManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [loading, setLoading] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  const handleKickMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the squad?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/discovery/squads/${squadId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, kick: true }),
      })

      if (!response.ok) throw new Error('Failed to remove member')

      setMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/discovery/squads/${squadId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update role')

      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole as any } : m))
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAdded = (newMember: any) => {
    setMembers((prev) => [...prev, newMember])
    setAddMemberOpen(false)
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Squad Members</h3>
          <p className="text-sm text-muted-foreground">Manage your squad's team members</p>
        </div>
        {isOwner && (
          <AddMemberDialog squadId={squadId} open={addMemberOpen} onOpenChange={setAddMemberOpen} onMemberAdded={handleMemberAdded}>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </AddMemberDialog>
        )}
      </div>

      {members.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <p className="text-muted-foreground">No members yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
            <Card key={member.id} className="p-4 flex items-center justify-between">
              <Link href={`/profile/${member.user.urlId}`}>
                <div className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                  <Avatar className="h-10 w-10">
                    {member.user.image && <AvatarImage src={member.user.image} alt={member.user.name || 'User'} />}
                    <AvatarFallback>{member.user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.user.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {member.role === 'OWNER' && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  )}
                  {member.role !== 'OWNER' && isOwner && (
                    <MemberRoleSelector
                      role={member.role}
                      onRoleChange={(newRole) => handleRoleChange(member.userId, newRole)}
                      disabled={loading}
                    />
                  )}
                  {member.role !== 'OWNER' && !isOwner && <Badge variant="outline">{member.role}</Badge>}
                </div>

                {isOwner && member.role !== 'OWNER' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={loading}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleKickMember(member.userId)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Squad
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
