import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/packages/lib/database/prisma'
import { FILE_URL_PATTERN, VIDEO_EXTENSIONS } from './constants'

export function isBotRequest(userAgent: string): boolean {
  userAgent = userAgent.toLowerCase()
  return (
    userAgent.includes('bot') ||
    userAgent.includes('discord') ||
    userAgent.includes('telegram') ||
    userAgent.includes('twitter') ||
    userAgent.includes('facebook') ||
    userAgent.includes('linkedin')
  )
}

export async function handleBotRequest(request: NextRequest): Promise<NextResponse | null> {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''

  if (
    !isBotRequest(userAgent) ||
    !FILE_URL_PATTERN.test(request.nextUrl.pathname)
  ) {
    return null
  }

  const fileExt = request.nextUrl.pathname.split('.').pop()?.toLowerCase()
  const isVideo = fileExt && VIDEO_EXTENSIONS.includes(fileExt)
  const isRawPath = request.nextUrl.pathname.endsWith('/raw')
  const isDirectPath = request.nextUrl.pathname.endsWith('/direct')

  // Extract user ID and filename from pathname: /[userUrlId]/[filename]
  const pathMatch = request.nextUrl.pathname.match(/^\/([^/]+)\/([^/]+)/)
  if (!pathMatch) {
    return NextResponse.next()
  }

  const [, userUrlId, filename] = pathMatch
  const urlPath = `/${userUrlId}/${filename}`

  // Check user's enableRichEmbeds setting
  let enableRichEmbeds = true // default to true
  try {
    const file = await prisma.file.findUnique({
      where: { urlPath },
      select: {
        user: {
          select: { enableRichEmbeds: true },
        },
      },
    })
    if (file?.user) {
      enableRichEmbeds = file.user.enableRichEmbeds !== false
    }
  } catch {
    // If lookup fails, default to allowing rich embeds
    enableRichEmbeds = true
  }

  if (enableRichEmbeds) {
    // Rich embeds enabled: serve the page with branded metadata
    return NextResponse.next()
  } else {
    // Rich embeds disabled: redirect to raw file
    if (!isRawPath && !isDirectPath) {
      const url = new URL(request.url)
      url.pathname = `${url.pathname}/raw`
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }
}
