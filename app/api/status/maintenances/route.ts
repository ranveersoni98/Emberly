import { apiResponse, apiError } from '@/packages/lib/api/response'
import { getMaintenances } from '@/packages/lib/instatus'

/**
 * GET /api/status/maintenances
 * Returns scheduled and past maintenances
 */
export async function GET() {
    try {
        const maintenances = await getMaintenances()
        return apiResponse(maintenances)
    } catch (err) {
        console.error('Error fetching maintenances:', err)
        return apiError('Internal server error', 500)
    }
}
