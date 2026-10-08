import { API_BASE_URL, parseApiError } from './config'
import { authHeaders, getSession } from './auth'

const CHILD_ID_KEY = 'child_id'

export function getStoredChildId() {
  const session = getSession()
  if (session?.role === 'child' && session.child_id) {
    return String(session.child_id)
  }
  return localStorage.getItem(CHILD_ID_KEY)
}

export function storeChildId(childId) {
  localStorage.setItem(CHILD_ID_KEY, String(childId))
}

export async function postChild(displayName, username, password, focusEmotions = []) {
  const response = await fetch(`${API_BASE_URL}/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      display_name: displayName,
      username,
      password,
      focus_emotions: focusEmotions,
    }),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function updateChild(childId, payload) {
  const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function deleteChild(childId) {
  const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function getChild(childId) {
  const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function postSession(childId, mode) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_id: childId, mode }),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function postAttempt(sessionId, attempt) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attempt),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function endSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/end`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function ensureChild() {
  const session = getSession()
  if (session?.role === 'child' && session.child_id) {
    storeChildId(session.child_id)
    return session.child_id
  }

  const stored = localStorage.getItem(CHILD_ID_KEY)
  if (stored) {
    return Number(stored)
  }

  throw new Error('Please log in as a child to start a session.')
}

export async function ensureChildAndSession(mode) {
  const childId = await ensureChild()
  const session = await postSession(childId, mode)
  return { childId, sessionId: session.id }
}

export async function getNextExercise(childId) {
  const response = await fetch(`${API_BASE_URL}/next-exercise/${childId}`)

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function getChildren(includeInactive = false) {
  const query = includeInactive ? '?include_inactive=true' : ''
  const response = await fetch(`${API_BASE_URL}/children${query}`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function getDashboard(childId) {
  const response = await fetch(`${API_BASE_URL}/dashboard/${childId}`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function downloadDashboardCsv(childId) {
  const response = await fetch(`${API_BASE_URL}/dashboard/${childId}/export.csv`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `child-${childId}-progress.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function getChildSessions(childId) {
  const response = await fetch(`${API_BASE_URL}/children/${childId}/sessions`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}
