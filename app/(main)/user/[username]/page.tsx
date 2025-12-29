import { notFound } from 'next/navigation'
import { PublicProfile } from '@/packages/components/profile/public-profile'
import { calculateStorageBonusGB, calculateDomainSlotBonus, getContributorMilestone, getDiscordBoosterMilestone } from '@/packages/lib/perks'
import { prisma } from '@/packages/lib/database/prisma'
import { buildPageMetadata } from '@/packages/lib/embeds/metadata'

interface PublicProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  try {
    const { username } = await params
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { urlId: username },
          { vanityId: username },
          { name: { equals: username, mode: 'insensitive' } },
        ],
        isProfilePublic: true,
      },
      select: {
        name: true,
        bio: true,
      },
    })

    if (!user) {
      return buildPageMetadata({
        title: 'Profile Not Found',
        description: 'The profile you are looking for could not be found.',
      })
    }

    return buildPageMetadata({
      title: `${user.name || 'User'} | Emberly`,
      description: user.bio || `View ${user.name || 'this user'}'s Emberly profile`,
    })
  } catch (error) {
    return buildPageMetadata({
      title: 'Profile Not Found',
      description: 'The profile you are looking for could not be found.',
    })
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { urlId: username },
        { vanityId: username },
        { name: { equals: username, mode: 'insensitive' } },
      ],
      isProfilePublic: true,
    },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      website: true,
      createdAt: true,
      perkRoles: true,
      urlId: true,
      vanityId: true,
      alphaUser: true,
      role: true,
      _count: {
        select: {
          files: {
            where: { visibility: 'PUBLIC' },
          },
        },
      },
      linkedAccounts: {
        select: {
          provider: true,
          providerUsername: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // Calculate perk benefits on server side
  const storageBonus = calculateStorageBonusGB(user.perkRoles)
  const domainBonus = calculateDomainSlotBonus(user.perkRoles)

  // Get perk milestone info for contributor
  const contributorPerk = user.perkRoles.find((role) => role.startsWith('CONTRIBUTOR:'))
  let contributorLOC = contributorPerk ? parseInt(contributorPerk.split(':')[1] || '0') : 0
  
  // Legacy compatibility
  if (contributorLOC > 0 && contributorLOC < 100) {
    contributorLOC = contributorLOC * 1000
  }
  
  const contributorMilestone = getContributorMilestone(contributorLOC)

  // Get Discord booster milestone info
  const boosterPerk = user.perkRoles.find((role) => role.startsWith('DISCORD_BOOSTER:'))
  const boostMonths = boosterPerk ? parseInt(boosterPerk.split(':')[1] || '0') : 0
  const boosterMilestone = getDiscordBoosterMilestone(boostMonths)

  // Get linked account usernames
  const linkedAccounts = {
    github: user.linkedAccounts.find((a) => a.provider === 'github')?.providerUsername,
    discord: user.linkedAccounts.find((a) => a.provider === 'discord')?.providerUsername,
  }

  return (
    <PublicProfile 
      user={user} 
      storageBonus={storageBonus} 
      domainBonus={domainBonus}
      linkedAccounts={linkedAccounts}
      contributorInfo={contributorMilestone ? {
        linesOfCode: contributorLOC,
        tier: contributorMilestone.tier,
        icon: contributorMilestone.icon,
        storageGB: contributorMilestone.storageGB,
        domainSlots: contributorMilestone.domainSlots,
      } : undefined}
      boosterInfo={boosterMilestone ? {
        months: boostMonths,
        tier: boosterMilestone.tier,
        icon: boosterMilestone.icon,
        storageGB: boosterMilestone.storageGB,
        domainSlots: boosterMilestone.domainSlots,
      } : undefined}
    />
  )
}
