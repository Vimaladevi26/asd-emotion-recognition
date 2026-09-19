import { API_BASE_URL, parseApiError } from './config'

const CHILD_ID_KEY = 'child_id'

export function getStoredChildId() {
  return localStorage.getItem(CHILD_ID_KEY)
}

export function storeChildId(childId) {
  localStorage.setItem(CHILD_ID_KEY, String(childId))
}

export async function postChild(displayName) {
  const response = await fetch(`${API_BASE_URL}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
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

let childBootstrapPromise = null

export async function ensureChild() {
  const stored = getStoredChildId()
  if (stored) {
    return Number(stored)
  }

  if (!childBootstrapPromise) {
    childBootstrapPromise = postChild('Child')
      .then((child) => {
        storeChildId(child.id)
        return child.id
      })
      .finally(() => {
        childBootstrapPromise = null
      })
  }

  return childBootstrapPromise
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

export async function getChildren() {
  const response = await fetch(`${API_BASE_URL}/children`)

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}

export async function getDashboard(childId) {
  const response = await fetch(`${API_BASE_URL}/dashboard/${childId}`)

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return response.json()
}
