const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set.')
}

export { API_BASE_URL }

export async function parseApiError(response) {
  let detail = `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (body.detail) {
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    }
  } catch {
    // ignore JSON parse errors
  }
  return new Error(detail)
}
