'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/components/ui/select'

interface MemberRoleSelectorProps {
  role: string
  onRoleChange: (role: string) => void
  disabled?: boolean
}

export function MemberRoleSelector({ role, onRoleChange, disabled }: MemberRoleSelectorProps) {
  return (
    <Select value={role} onValueChange={onRoleChange} disabled={disabled}>
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MEMBER">Member</SelectItem>
        <SelectItem value="OBSERVER">Observer</SelectItem>
      </SelectContent>
    </Select>
  )
}
