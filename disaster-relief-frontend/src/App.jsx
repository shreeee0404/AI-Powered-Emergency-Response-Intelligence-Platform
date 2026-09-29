import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom"

// ============================================================
// LAYOUT COMPONENTS
// ============================================================

import Sidebar from "./components/Sidebar"
import Topbar from "./components/Topbar"
import ProtectedRoute from "./components/ProtectedRoute"

// ============================================================
// AUTH
// ============================================================

import Login from "./pages/Login"

// ============================================================
// PAGES
// ============================================================

import Dashboard from "./pages/Dashboard"
import Incidents from "./pages/Incidents"
import ImpactMap from "./pages/ImpactMap"
import Resources from "./pages/Resources"
import Vehicles from "./pages/Vehicles"
import Prediction from "./pages/Prediction"
import Logistics from "./pages/Logistics"
import FieldTeams from "./pages/FieldTeams"
import Teams from "./pages/Teams"
import Missions from "./pages/Missions"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import SOSPage from "./pages/SOSPage"
import AuditLogPage from "./pages/AuditLogPage"

// ============================================================
// MAIN APPLICATION LAYOUT
// ============================================================

function Layout() {
  return (
    <div className="app-shell min-h-screen bg-slate-50">

      {/* Sidebar */}
      <Sidebar />

      {/* Top Navigation */}
      <Topbar />

      {/* Main Content */}
      <main className="min-h-screen pt-20 md:ml-64">

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

      </main>
    </div>
  )
}

// ============================================================
// APPLICATION
// ============================================================

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ==================================================
            PUBLIC ROUTES
            ================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ==================================================
            PROTECTED ROUTES
            ================================================== */}

        <Route element={<ProtectedRoute />}>

          <Route element={<Layout />}>

            {/* ----------------------------------------------
                DASHBOARD
                ---------------------------------------------- */}

            <Route
              path="/"
              element={<Dashboard />}
            />


            {/* ----------------------------------------------
                DISASTER MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/incidents"
              element={<Incidents />}
            />

            <Route
              path="/impact-map"
              element={<ImpactMap />}
            />


            {/* ----------------------------------------------
                RESOURCE MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/resources"
              element={<Resources />}
            />


            {/* ----------------------------------------------
                VEHICLE MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/vehicles"
              element={<Vehicles />}
            />


            {/* ----------------------------------------------
                AI / ML RESOURCE PREDICTION
                ---------------------------------------------- */}

            <Route
              path="/prediction"
              element={<Prediction />}
            />


            {/* ----------------------------------------------
                LOGISTICS MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/logistics"
              element={<Logistics />}
            />


            {/* ----------------------------------------------
                TEAM MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/teams"
              element={<Teams />}
            />

            <Route
              path="/field-teams"
              element={<FieldTeams />}
            />


            {/* ----------------------------------------------
                MISSION MANAGEMENT
                ---------------------------------------------- */}

            <Route
              path="/missions"
              element={<Missions />}
            />


            {/* ----------------------------------------------
                USERS & ROLES (admin only — same as field teams)
                ---------------------------------------------- */}

            <Route
              path="/users"
              element={<FieldTeams />}
            />


            {/* ----------------------------------------------
                ANALYTICS
                ---------------------------------------------- */}

            <Route
              path="/analytics"
              element={<Analytics />}
            />


            {/* ----------------------------------------------
                SETTINGS
                ---------------------------------------------- */}

            <Route
              path="/settings"
              element={<Settings />}
            />


            {/* ----------------------------------------------
                SOS EMERGENCY
                ---------------------------------------------- */}

            <Route
              path="/sos"
              element={<SOSPage />}
            />


            {/* ----------------------------------------------
                AUDIT LOG
                ---------------------------------------------- */}

            <Route
              path="/audit-logs"
              element={<AuditLogPage />}
            />

          </Route>

        </Route>


        {/* ==================================================
            UNKNOWN / INVALID ROUTES
            ================================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App