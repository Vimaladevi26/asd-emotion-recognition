const API_BASE_URL = 'http://127.0.0.1:8000'

export async function postPredict(base64Image) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64Image }),
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail)
  }

  return response.json()
}
