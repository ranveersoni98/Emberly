/**
 * Perk system utilities for checking and applying user perks
 */

import { prisma } from '@/packages/lib/database/prisma'
import {
  PERK_ROLES,
  PERK_STORAGE_BONUS_GB,
  PERK_DOMAIN_BONUS,
  PERK_CACHE_KEYS,
  PERK_CHECK_INTERVALS,
  GITHUB_CONTRIBUTION_THRESHOLD,
  CONTRIBUTOR_MILESTONES,
  DISCORD_BOOSTER_MILESTONES,
  type PerkRole,
} from './constants'

/**
 * Calculate total storage bonus in GB for a user based on their perk roles
 */
export function calculateStorageBonusGB(perkRoles: string[]): number {
  return perkRoles.reduce((total, role) => {
    if (role.startsWith('CONTRIBUTOR:')) {
      // Format: CONTRIBUTOR:5000 means 5000 lines of code
      let loc = parseInt(role.split(':')[1] || '0')
      
      // Legacy compatibility: old format was CONTRIBUTOR:{levels} where levels = LOC/1000
      // If the number is small (< 1000), assume it's the old level format
      if (loc > 0 && loc < 100) {
        loc = loc * 1000 // Convert old level format to LOC
      }
      
      const milestone = getContributorMilestone(loc)
      return total + (milestone?.storageGB || 0)
    }
    
    if (role.startsWith('DISCORD_BOOSTER:')) {
      // Format: DISCORD_BOOSTER:12 means 12 months of boosting
      const months = parseInt(role.split(':')[1] || '0')
      const milestone = getDiscordBoosterMilestone(months)
      return total + (milestone?.storageGB || 0)
    }
    
    return total + (PERK_STORAGE_BONUS_GB[role as PerkRole] || 0)
  }, 0)
}

/**
 * Get the highest contributor milestone achieved for a given LOC count
 */
export function getContributorMilestone(loc: number) {
  // Find the highest milestone that the user has reached
  const achieved = CONTRIBUTOR_MILESTONES.filter(m => loc >= m.loc)
  return achieved.length > 0 ? achieved[achieved.length - 1] : null
}

/**
 * Get the next contributor milestone to reach
 */
export function getNextContributorMilestone(loc: number) {
  return CONTRIBUTOR_MILESTONES.find(m => loc < m.loc) || null
}

/**
 * Get the highest Discord booster milestone achieved for a given duration in months
 */
export function getDiscordBoosterMilestone(months: number) {
  const achieved = DISCORD_BOOSTER_MILESTONES.filter(m => months >= m.months)
  return achieved.length > 0 ? achieved[achieved.length - 1] : null
}

/**
 * Get the next Discord booster milestone to reach
 */
export function getNextDiscordBoosterMilestone(months: number) {
  return DISCORD_BOOSTER_MILESTONES.find(m => months < m.months) || null
}

/**
 * Calculate total domain slot bonus for a user based on their perk roles
 */
export function calculateDomainSlotBonus(perkRoles: string[]): number {
  return perkRoles.reduce((total, role) => {
    if (role.startsWith('CONTRIBUTOR:')) {
      // Format: CONTRIBUTOR:5000 means 5000 lines of code
      let loc = parseInt(role.split(':')[1] || '0')
      
      // Legacy compatibility: old format was CONTRIBUTOR:{levels}
      if (loc > 0 && loc < 100) {
        loc = loc * 1000
      }
      
      const milestone = getContributorMilestone(loc)
      return total + (milestone?.domainSlots || 0)
    }
    
    if (role.startsWith('DISCORD_BOOSTER:')) {
      // Format: DISCORD_BOOSTER:12 means 12 months of boosting
      const months = parseInt(role.split(':')[1] || '0')
      const milestone = getDiscordBoosterMilestone(months)
      return total + (milestone?.domainSlots || 0)
    }
    
    return total + (PERK_DOMAIN_BONUS[role as PerkRole] || 0)
  }, 0)
}

/**
 * Check if a user should have their perks rechecked
 */
export function shouldRecheckPerks(lastCheckAt: Date | null): boolean {
  if (!lastCheckAt) return true
  const hoursSinceCheck = (Date.now() - lastCheckAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceCheck >= 24 // Recheck daily
}

/**
 * Update user's perk roles
 */
export async function updateUserPerks(userId: string, newPerkRoles: string[]) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      perkRoles: newPerkRoles,
      lastPerkCheckAt: new Date(),
    },
  })
}

/**
 * Get all perk roles for a user
 */
export async function getUserPerks(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { perkRoles: true },
  })
  return user?.perkRoles || []
}

/**
 * Check if user has a specific perk role
 */
export async function hasPermission(userId: string, perkRole: PerkRole): Promise<boolean> {
  const perks = await getUserPerks(userId)
  return perks.some((p) => p.startsWith(perkRole))
}

/**
 * Check if user has already earned a one-time perk
 */
export async function hasEarnedOneTimePerk(userId: string, perkRole: 'DISCORD_BOOSTER' | 'CONTRIBUTOR'): Promise<boolean> {
  const perks = await getUserPerks(userId)
  if (perkRole === 'DISCORD_BOOSTER') {
    return perks.includes(PERK_ROLES.DISCORD_BOOSTER)
  }
  if (perkRole === 'CONTRIBUTOR') {
    return perks.some(p => p.startsWith('CONTRIBUTOR'))
  }
  return false
}


/**
 * Add perk role to user (deduplicates and prevents re-awarding one-time perks)
 * One-time perks: DISCORD_BOOSTER, CONTRIBUTOR (can only be earned once, though can level up)
 */
export async function addPerkRole(userId: string, perkRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { perkRoles: true },
  })

  const currentPerks = user?.perkRoles || []
  
  // For CONTRIBUTOR perks, allow leveling up but track if it's their first time
  if (perkRole.startsWith('CONTRIBUTOR')) {
    const hasContributor = currentPerks.some(p => p.startsWith('CONTRIBUTOR'))
    const newPerks = currentPerks.filter(p => !p.startsWith('CONTRIBUTOR'))
    
    // Add "first-time" marker if this is their first contributor perk
    if (!hasContributor) {
      newPerks.push('CONTRIBUTOR:FIRST_TIME')
    }
    
    newPerks.push(perkRole)
    await updateUserPerks(userId, newPerks)
  }
  // For DISCORD_BOOSTER perks, allow tier updates
  else if (perkRole.startsWith('DISCORD_BOOSTER')) {
    const newPerks = currentPerks.filter(p => !p.startsWith('DISCORD_BOOSTER'))
    newPerks.push(perkRole)
    await updateUserPerks(userId, newPerks)
  }
  else if (!currentPerks.includes(perkRole)) {
    await updateUserPerks(userId, [...currentPerks, perkRole])
  }
}

/**
 * Remove perk role from user
 */
export async function removePerkRole(userId: string, perkRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { perkRoles: true },
  })

  const currentPerks = user?.perkRoles || []
  const filtered = currentPerks.filter((p) => !p.startsWith(perkRole))
  await updateUserPerks(userId, filtered)
}

/**
 * Recalculate contributor levels based on code contributions
 * Called periodically or on manual trigger
 * Stores total LOC count in perk role for milestone calculation
 */
export async function recalculateContributorLevel(
  userId: string,
  totalLinesOfCode: number
): Promise<void> {
  if (totalLinesOfCode >= GITHUB_CONTRIBUTION_THRESHOLD) {
    // Store the LOC count for milestone calculation
    const perkRole = `CONTRIBUTOR:${totalLinesOfCode}`
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { perkRoles: true },
    })

    const currentPerks = user?.perkRoles || []
    const filtered = currentPerks.filter((p) => !p.startsWith('CONTRIBUTOR'))
    await updateUserPerks(userId, [...filtered, perkRole])
  } else {
    // Remove contributor perk if below threshold
    await removePerkRole(userId, 'CONTRIBUTOR')
  }
}
