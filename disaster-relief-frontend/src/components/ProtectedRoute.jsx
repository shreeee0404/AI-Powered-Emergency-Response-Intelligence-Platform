import { Navigate, Outlet, useLocation } from "react-router-dom"

// ============================================================
// ROLE NORMALIZATION
// ============================================================

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

// ============================================================
// GET USER
// ============================================================

function getCurrentUser() {
  const possibleKeys = [
    "current_user",
    "user",
    "logged_in_user",
  ]

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key)

      if (!value) continue

      const parsed = JSON.parse(value)

      if (parsed) {
        return parsed
      }
    } catch {
      // Ignore invalid localStorage values
    }
  }

  return null
}

// ============================================================
// ROLE ROUTES
// ============================================================

const ROLE_ROUTES = {

  // ==========================================================
  // ADMIN
  // ==========================================================

  admin: [
    "/",
    "/incidents",
    "/impact-map",
    "/sos",
    "/missions",
    "/users",
    "/field-teams",
    "/teams",
    "/vehicles",
    "/logistics",
    "/resources",
    "/prediction",
    "/analytics",
    "/audit-logs",
    "/settings",
  ],

  administrator: [
    "/",
    "/incidents",
    "/impact-map",
    "/sos",
    "/missions",
    "/users",
    "/field-teams",
    "/teams",
    "/vehicles",
    "/logistics",
    "/resources",
    "/prediction",
    "/analytics",
    "/audit-logs",
    "/settings",
  ],

  // ==========================================================
  // EMERGENCY COORDINATOR
  // ==========================================================

  "emergency coordinator": [
    "/",
    "/incidents",
    "/impact-map",

    // IMPORTANT
    // Coordinator can access SOS.
    "/sos",

    "/missions",
    "/teams",
    "/field-teams",
    "/vehicles",
    "/logistics",
    "/resources",
    "/prediction",
    "/analytics",
    "/settings",
  ],

  emergencycoordinator: [
    "/",
    "/incidents",
    "/impact-map",

    // IMPORTANT
    "/sos",

    "/missions",
    "/teams",
    "/field-teams",
    "/vehicles",
    "/logistics",
    "/resources",
    "/prediction",
    "/analytics",
    "/settings",
  ],

  coordinator: [
    "/",
    "/incidents",
    "/impact-map",
    "/sos",
    "/missions",
    "/teams",
    "/field-teams",
    "/vehicles",
    "/logistics",
    "/resources",
    "/prediction",
    "/analytics",
    "/settings",
  ],

  // ==========================================================
  // FIELD TEAM
  // ==========================================================

  "field team": [
    "/missions",

    // IMPORTANT
    // Field Team can access SOS.
    "/sos",

    "/settings",
  ],

  fieldteam: [
    "/missions",
    "/sos",
    "/settings",
  ],

  field: [
    "/missions",
    "/sos",
    "/settings",
  ],
}

// ============================================================
// PROTECTED ROUTE
// ============================================================

export default function ProtectedRoute() {
  const location = useLocation()

  // ----------------------------------------------------------
  // TOKEN
  // ----------------------------------------------------------

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")

  // ----------------------------------------------------------
  // NOT LOGGED IN
  // ----------------------------------------------------------

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    )
  }

  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const user = getCurrentUser()

  if (!user) {
    console.warn(
      "ProtectedRoute: current user not found."
    )

    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  const role = normalizeRole(user.role)

  const allowedRoutes =
    ROLE_ROUTES[role] || []

  // ----------------------------------------------------------
  // UNKNOWN ROLE
  // ----------------------------------------------------------

  if (!allowedRoutes.length) {

    console.warn(
      "ProtectedRoute: unknown role:",
      user.role
    )

    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  // ----------------------------------------------------------
  // CURRENT ROUTE
  // ----------------------------------------------------------

  const currentPath = location.pathname

  // ----------------------------------------------------------
  // ROUTE ALLOWED
  // ----------------------------------------------------------

  if (allowedRoutes.includes(currentPath)) {
    return <Outlet />
  }

  // ----------------------------------------------------------
  // ROUTE NOT ALLOWED
  // ----------------------------------------------------------

  return (
    <Navigate
      to={allowedRoutes[0]}
      replace
    />
  )
}