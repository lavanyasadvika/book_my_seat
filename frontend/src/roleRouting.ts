import type { Role } from './api/types'

export function landingPathForRole(role: Role): string {
  switch (role) {
    case 'ORGANIZER':
      return '/organizer/venues'
    case 'CUSTOMER':
    default:
      return '/events'
  }
}
