import { NextResponse } from 'next/server'

import { apiResponse, apiError } from '@/packages/lib/api/response'
import { getFullStatusData, getStatusSummary } from '@/packages/lib/instatus'

/**
 * GET /api/status
 * Returns aggregated status data including summary, components, and active issues
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const full = searchParams.get('full') === 'true'

    try {
        if (full) {
            // Return full aggregated status data
            const data = await getFullStatusData()
            if (!data) {
                return apiError('Failed to fetch status data', 503)
            }
            return apiResponse(data)
        }

        // Return just the summary for quick status checks
        const summary = await getStatusSummary()
        if (!summary) {
            return apiError('Failed to fetch status summary', 503)
        }

        return apiResponse(summary)
    } catch (err) {
        console.error('Error fetching status:', err)
        return apiError('Internal server error', 500)
    }
}
