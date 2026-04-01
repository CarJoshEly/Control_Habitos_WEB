import { getToken } from './authService'

const API = 'http://localhost:3000/api'

const getHeaders = async () => {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export const getHabits = async () => {
  const res = await fetch(`${API}/habits`, { headers: await getHeaders() })
  return res.json()
}

export const createHabit = async (habit) => {
  const res = await fetch(`${API}/habits`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(habit),
  })
  return res.json()
}

export const updateHabit = async (id, habit) => {
  const res = await fetch(`${API}/habits/${id}`, {
    method: 'PUT',
    headers: await getHeaders(),
    body: JSON.stringify(habit),
  })
  return res.json()
}

export const deleteHabit = async (id) => {
  const res = await fetch(`${API}/habits/${id}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  })
  return res.json()
}

export const toggleHabit = async (id, completed, date) => {
  const res = await fetch(`${API}/habits/${id}/toggle`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify({ completed, date }),
  })
  return res.json()
}