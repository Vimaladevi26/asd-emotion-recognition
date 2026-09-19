import { API_BASE_URL, parseApiError } from './config'

export async function postPredict(base64Image) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64Image }),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}
