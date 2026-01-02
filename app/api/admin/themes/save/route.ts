import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/packages/lib/database/prisma'
import { authOptions } from '@/packages/lib/auth'
import { hasPermission, Permission } from '@/packages/lib/permissions'

/**
 * Save a custom system theme that will be available to all users
 * Requires MANAGE_APPEARANCE permission (admin/superadmin only)
 *
 * POST /api/admin/themes/save
 * Body: { themeId: string, colors: Record<string, string> }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!hasPermission(session.user.role as any, Permission.MANAGE_APPEARANCE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { themeId, colors } = body

    if (!themeId || !colors) {
      return NextResponse.json(
        { error: 'Missing required fields: themeId, colors' },
        { status: 400 }
      )
    }

    if (typeof themeId !== 'string' || typeof colors !== 'object') {
      return NextResponse.json(
        { error: 'Invalid field types: themeId must be string, colors must be object' },
        { status: 400 }
      )
    }

    // Store system themes inside the main site config under key 'site_config'
    // so ThemeInitializer/getConfig can pick them up as part of the full config.
    let siteConfig = await prisma.config.findUnique({ where: { key: 'site_config' } })

    const currentValue = (siteConfig?.value as any) || {}
    currentValue.settings = currentValue.settings || {}
    currentValue.settings.appearance = currentValue.settings.appearance || {}
    currentValue.settings.appearance.systemThemes = currentValue.settings.appearance.systemThemes || {}

    // Save/update system theme
    currentValue.settings.appearance.systemThemes[themeId] = {
      name: themeId,
      colors,
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
      updatedAt: new Date().toISOString(),
    }

    if (!siteConfig) {
      siteConfig = await prisma.config.create({
        data: {
          key: 'site_config',
          value: currentValue,
        },
      })
    } else {
      siteConfig = await prisma.config.update({
        where: { key: 'site_config' },
        data: { value: currentValue },
      })
    }

    return NextResponse.json({
      success: true,
      message: `System theme "${themeId}" saved successfully`,
      theme: currentValue.settings.appearance.systemThemes[themeId],
    })
  } catch (error) {
    console.error('[API] Error saving system theme:', error)
    return NextResponse.json(
      { error: 'Failed to save system theme' },
      { status: 500 }
    )
  }
}

/**
 * Get all system themes
 * Publicly accessible
 *
 * GET /api/admin/themes/system
 */
export async function GET() {
  try {
    const siteConfig = await prisma.config.findUnique({ where: { key: 'site_config' } })
    const systemThemes = (siteConfig?.value as any)?.settings?.appearance?.systemThemes || {}

    return NextResponse.json({
      success: true,
      themes: systemThemes,
    })
  } catch (error) {
    console.error('[API] Error fetching system themes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system themes' },
      { status: 500 }
    )
  }
}
