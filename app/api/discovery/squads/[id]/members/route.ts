import { HTTP_STATUS, apiError, apiResponse } from '@/packages/lib/api/response'
import { requireAuth } from '@/packages/lib/auth/api-auth'
import { getSquad, joinSquad, leaveSquad, kickMember, setMemberRole } from '@/packages/lib/nexium'
import { SetMemberRoleSchema } from '@/packages/types/dto/nexium'
import { z } from 'zod'

/** GET /api/discovery/squads/[id]/members — list members */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth(req)
  if (response) return response

  const { id } = await params
  const squad = await getSquad(id)
  if (!squad) return apiError('Squad not found', HTTP_STATUS.NOT_FOUND)

  const isMember = squad.members.some((m) => m.userId === user.id)
  if (!isMember) return apiError('Forbidden', HTTP_STATUS.FORBIDDEN)

  return apiResponse({ members: squad.members })
}

/** POST /api/discovery/squads/[id]/members
 *  body: { userId }               → add member directly (owner only)
 *  body: { userId, role }         → set role (owner only)
 *  body: { userId, kick: true }   → remove member (owner only)
 *  body: {}                       → join squad (self)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth(req)
  if (response) return response

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // ── kick ──────────────────────────────────────────────────────────────────
  if (body.kick === true) {
    const parsed = z.object({ userId: z.string() }).safeParse(body)
    if (!parsed.success) return apiError('userId required', HTTP_STATUS.BAD_REQUEST)
    try {
      await kickMember(id, user.id, parsed.data.userId)
      return apiResponse({ ok: true })
    } catch (err: any) {
      return apiError(err.message ?? 'Failed to kick member', HTTP_STATUS.BAD_REQUEST)
    }
  }

  // ── set role ──────────────────────────────────────────────────────────────
  if (body.userId && body.role) {
    const parsed = SetMemberRoleSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', HTTP_STATUS.BAD_REQUEST)
    try {
      await setMemberRole(id, user.id, parsed.data.userId, parsed.data.role)
      return apiResponse({ ok: true })
    } catch (err: any) {
      return apiError(err.message ?? 'Failed to set role', HTTP_STATUS.BAD_REQUEST)
    }
  }

  // ── add member directly (owner adding a specific user) ────────────────────
  if (body.userId && !body.role) {
    const { prisma } = await import('@/packages/lib/database/prisma')

    // Verify the caller is the owner
    const squad = await prisma.nexiumSquad.findUnique({
      where: { id },
      select: { ownerUserId: true, maxSize: true, status: true, _count: { select: { members: true } } },
    })
    if (!squad) return apiError('Squad not found', HTTP_STATUS.NOT_FOUND)
    if (squad.ownerUserId !== user.id) return apiError('Only the owner can add members directly', HTTP_STATUS.FORBIDDEN)
    if (squad._count.members >= squad.maxSize) return apiError('Squad is full', HTTP_STATUS.BAD_REQUEST)
    if (squad.status !== 'FORMING' && squad.status !== 'ACTIVE') return apiError('Squad is not accepting members', HTTP_STATUS.BAD_REQUEST)

    // Check target user exists
    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })
    if (!target) return apiError('User not found', HTTP_STATUS.NOT_FOUND)

    // Check not already a member
    const existing = await prisma.nexiumSquadMember.findUnique({
      where: { squadId_userId: { squadId: id, userId: body.userId } },
    })
    if (existing) return apiError('User is already a member', HTTP_STATUS.CONFLICT)

    const member = await prisma.nexiumSquadMember.create({
      data: { squadId: id, userId: body.userId, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, image: true, urlId: true } } },
    })
    return apiResponse({ member })
  }

  // ── join squad (self) ─────────────────────────────────────────────────────
  try {
    const member = await joinSquad(id, user.id)
    return apiResponse({ member })
  } catch (err: any) {
    return apiError(err.message ?? 'Failed to join squad', HTTP_STATUS.BAD_REQUEST)
  }
}

/** DELETE /api/discovery/squads/[id]/members — leave squad (self) */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth(req)
  if (response) return response

  const { id } = await params
  try {
    await leaveSquad(id, user.id)
    return apiResponse({ ok: true })
  } catch (err: any) {
    return apiError(err.message ?? 'Failed to leave squad', HTTP_STATUS.BAD_REQUEST)
  }
}

