import { apiResponse, apiError } from '@/packages/lib/api/response'
import { getIncidents } from '@/packages/lib/instatus'

/**
 * GET /api/status/incidents
 * Returns incident history
 */
export async function GET() {
    try {
        const incidents = await getIncidents()
        return apiResponse(incidents)
    } catch (err) {
        console.error('Error fetching incidents:', err)
        return apiError('Internal server error', 500)
    }
}
