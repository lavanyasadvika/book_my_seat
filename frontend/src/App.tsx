import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { useAuth } from './auth/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { EventsPage } from './pages/customer/EventsPage'
import { EventDetailPage } from './pages/customer/EventDetailPage'
import { ShowPage } from './pages/customer/ShowPage'
import { BookingsPage } from './pages/customer/BookingsPage'
import { BookingDetailPage } from './pages/customer/BookingDetailPage'
import { VenuesPage as OrganizerVenuesPage } from './pages/organizer/VenuesPage'
import { EventsPage as OrganizerEventsPage } from './pages/organizer/EventsPage'
import { EventDetailPage as OrganizerEventDetailPage } from './pages/organizer/EventDetailPage'
import { ShowDetailPage as OrganizerShowDetailPage } from './pages/organizer/ShowDetailPage'
import { landingPathForRole } from './roleRouting'

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? landingPathForRole(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route
          path="/events"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <EventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <EventDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shows/:showId"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <ShowPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <BookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/:bookingId"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <BookingDetailPage />
            </RequireAuth>
          }
        />

        <Route
          path="/organizer/venues"
          element={
            <RequireAuth roles={['ORGANIZER']}>
              <OrganizerVenuesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/organizer/events"
          element={
            <RequireAuth roles={['ORGANIZER']}>
              <OrganizerEventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/organizer/events/:eventId"
          element={
            <RequireAuth roles={['ORGANIZER']}>
              <OrganizerEventDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/organizer/shows/:showId"
          element={
            <RequireAuth roles={['ORGANIZER']}>
              <OrganizerShowDetailPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  )
}
