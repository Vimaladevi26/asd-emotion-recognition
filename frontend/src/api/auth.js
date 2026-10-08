import { API_BASE_URL, parseApiError } from './config'

const SESSION_KEY = 'asd_session'

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function storeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  if (session.child_id) {
    localStorage.setItem('child_id', String(session.child_id))
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function authHeaders() {
  const session = getSession()
  if (!session?.token) {
    return {}
  }
  return { Authorization: `Bearer ${session.token}` }
}

export function isAdmin() {
  return getSession()?.role === 'admin'
}

export function isChild() {
  return getSession()?.role === 'child'
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  const data = await response.json()
  storeSession(data)
  return data
}

export async function logout() {
  const headers = authHeaders()
  try {
    if (headers.Authorization) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers,
      })
    }
  } finally {
    clearSession()
  }
}

export async function getMe() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json()
}
