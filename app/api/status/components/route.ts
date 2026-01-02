import { apiResponse, apiError } from '@/packages/lib/api/response'
import { getStatusComponents } from '@/packages/lib/instatus'

/**
 * GET /api/status/components
 * Returns all status page components with their current status
 */
export async function GET() {
    try {
        const components = await getStatusComponents()

        if (!components) {
            return apiError('Failed to fetch components', 503)
        }

        return apiResponse(components)
    } catch (err) {
        console.error('Error fetching components:', err)
        return apiError('Internal server error', 500)
    }
}
