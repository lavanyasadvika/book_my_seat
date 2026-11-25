import { apiClient } from './client'
import type { AuthResponse, Role } from './types'

export function login(email: string, password: string) {
  return apiClient.post<AuthResponse>('/api/auth/login', { email, password }).then((r) => r.data)
}

export function register(name: string, email: string, password: string, role: Role) {
  return apiClient.post<AuthResponse>('/api/auth/register', { name, email, password, role }).then((r) => r.data)
}
