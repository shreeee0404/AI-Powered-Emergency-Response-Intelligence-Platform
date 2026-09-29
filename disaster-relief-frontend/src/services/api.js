// ============================================================
// API SERVICE
// AI-Based Disaster Response Management System
// ============================================================

// In development the frontend is served by Vite, which proxies "/api"
// to the FastAPI backend (see vite.config.js). Using the same-origin
// "/api" prefix avoids CORS problems and "Failed to fetch" errors.
// In production the deployed backend URL can be supplied through
// VITE_API_URL, otherwise the same "/api" proxy path is used.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "/api")
).replace(/\/$/, "")

// ============================================================
// COMMON API REQUEST
// ============================================================

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("access_token")

  const headers = {
    Accept: "application/json",
    ...(options.body !== undefined
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...(options.headers || {}),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    })
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw new Error("Unable to reach the disaster response server.")
  } finally {
    clearTimeout(timeout)
  }

  // ----------------------------------------------------------
  // Handle empty responses
  // ----------------------------------------------------------

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get("content-type") || ""

  let data = {}

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}))
  } else {
    data = await response.text().catch(() => "")
  }

  // ----------------------------------------------------------
  // Handle errors
  // ----------------------------------------------------------

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    if (typeof data === "string" && data.trim()) {
      message = data
    } else if (data?.detail) {
      if (typeof data.detail === "string") {
        message = data.detail
      } else if (Array.isArray(data.detail)) {
        message = data.detail
          .map((item) => {
            if (typeof item === "string") return item

            const field = Array.isArray(item?.loc)
              ? item.loc.join(".")
              : "field"

            return `${field}: ${item?.msg || "Invalid value"}`
          })
          .join(", ")
      } else if (typeof data.detail === "object") {
        message =
          data.detail.message ||
          data.detail.error ||
          JSON.stringify(data.detail)
      }
    } else if (data?.message) {
      message = data.message
    } else if (data?.error) {
      message = data.error
    }

    // Automatically clear invalid token
    if (response.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("current_user")
    }

    throw new Error(message)
  }

  return data
}

// ============================================================
// SYSTEM
// ============================================================

// GET /
export function getSystemStatus() {
  return request("/")
}

// GET /languages
export function getSupportedLanguages() {
  return request("/languages")
}

// GET /translations/{language}
export function getBackendTranslations(language) {
  return request(`/translations/${language}`)
}

// PUT /me/language
export function updateMyLanguage(language) {
  return request("/me/language", {
    method: "PUT",
    body: JSON.stringify({ language }),
  })
}

// ============================================================
// AUTHENTICATION
// ============================================================

// POST /login
export async function login(username, password) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({ username, password }),
    })
  } catch (error) {
    throw new Error(
      "Unable to reach the disaster response server. " +
        "Please make sure the backend is running and try again."
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Login failed"
    )
  }

  return data
}

// ============================================================
// USERS
// ============================================================

// GET /users
export function getUsers() {
  return request("/users")
}

// GET /users/{id}
export function getUser(id) {
  return request(`/users/${id}`)
}

// POST /users
export function createUser(user) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(user),
  })
}

// PUT /users/{id}
export function updateUser(id, user) {
  return request(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(user),
  })
}

// DELETE /users/{id}
export function deleteUser(id) {
  return request(`/users/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// DISASTERS / INCIDENTS
// ============================================================

// GET /disasters
export function getDisasters() {
  return request("/disasters")
}

// GET /disasters/{id}
export function getDisaster(id) {
  return request(`/disasters/${id}`)
}

// POST /disasters
export function createDisaster(disaster) {
  return request("/disasters", {
    method: "POST",
    body: JSON.stringify(disaster),
  })
}

// PUT /disasters/{id}
export function updateDisaster(id, disaster) {
  return request(`/disasters/${id}`, {
    method: "PUT",
    body: JSON.stringify(disaster),
  })
}

// DELETE /disasters/{id}
export function deleteDisaster(id) {
  return request(`/disasters/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// RESOURCES
// ============================================================

// GET /resources
export function getResources() {
  return request("/resources")
}

// GET /resources/{id}
export function getResource(id) {
  return request(`/resources/${id}`)
}

// POST /resources
export function createResource(resource) {
  return request("/resources", {
    method: "POST",
    body: JSON.stringify(resource),
  })
}

// PUT /resources/{id}
export function updateResource(id, resource) {
  return request(`/resources/${id}`, {
    method: "PUT",
    body: JSON.stringify(resource),
  })
}

// DELETE /resources/{id}
export function deleteResource(id) {
  return request(`/resources/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// VEHICLES
// ============================================================

// GET /vehicles
export function getVehicles() {
  return request("/vehicles")
}

// GET /vehicles/{id}
export function getVehicle(id) {
  return request(`/vehicles/${id}`)
}

// POST /vehicles
export function createVehicle(vehicle) {
  return request("/vehicles", {
    method: "POST",
    body: JSON.stringify(vehicle),
  })
}

// PUT /vehicles/{id}
export function updateVehicle(id, vehicle) {
  return request(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(vehicle),
  })
}

// DELETE /vehicles/{id}
export function deleteVehicle(id) {
  return request(`/vehicles/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// VEHICLE LIVE LOCATION
// ============================================================

// PUT /vehicles/{id}/location
export function updateVehicleLocation(
  vehicleId,
  latitude,
  longitude
) {
  return request(`/vehicles/${vehicleId}/location`, {
    method: "PUT",

    body: JSON.stringify({
      latitude,
      longitude,
    }),
  })
}

// GET /vehicles/{id}/location
export function getVehicleLocation(vehicleId) {
  return request(`/vehicles/${vehicleId}/location`)
}

// ============================================================
// AI RESOURCE DEMAND PREDICTION
// ============================================================

// POST /prediction
export function predictResourceDemand(data) {
  return request("/prediction", {
    method: "POST",

    body: JSON.stringify({
      data,
    }),
  })
}

// ============================================================
// ZONES
// ============================================================

// GET /zones
export function getZones() {
  return request("/zones")
}

// GET /zones/{id}
export function getZone(id) {
  return request(`/zones/${id}`)
}

// POST /zones
export function createZone(zone) {
  return request("/zones", {
    method: "POST",
    body: JSON.stringify(zone),
  })
}

// PUT /zones/{id}
export function updateZone(id, zone) {
  return request(`/zones/${id}`, {
    method: "PUT",
    body: JSON.stringify(zone),
  })
}

// DELETE /zones/{id}
export function deleteZone(id) {
  return request(`/zones/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// ZONE PRIORITY
// ============================================================

// GET /zones/{id}/priority
export function getZonePriority(zoneId) {
  return request(`/zones/${zoneId}/priority`)
}

// GET /zones/priorities
export function getAllZonePriorities() {
  return request("/zones/priorities")
}

// ============================================================
// ZONE-BASED AI PREDICTION
// ============================================================

// POST /prediction/zone/{id}
export function predictZoneDemand(zoneId) {
  return request(`/prediction/zone/${zoneId}`, {
    method: "POST",
  })
}

// POST /prediction/zone/{id}/vulnerability
export function predictZoneDemandWithVulnerability(zoneId) {
  return request(
    `/prediction/zone/${zoneId}/vulnerability`,
    {
      method: "POST",
    }
  )
}

// ============================================================
// SCENARIO SIMULATION
// ============================================================

// POST /prediction/simulate
export function simulateScenario(data) {
  return request("/prediction/simulate", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ============================================================
// IMPACT MAP
// ============================================================

// GET /impact-map
export function getImpactMapData() {
  return request("/impact-map")
}

// ============================================================
// FIELD TEAMS
// ============================================================

// GET /field-teams
export function getFieldTeams() {
  return request("/field-teams")
}

// POST /field-teams
export function createFieldTeam(team) {
  return request("/field-teams", {
    method: "POST",
    body: JSON.stringify(team),
  })
}

// PUT /field-teams/{id}
export function updateFieldTeam(id, team) {
  return request(`/field-teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(team),
  })
}

// DELETE /field-teams/{id}
export function deleteFieldTeam(id) {
  return request(`/field-teams/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// MISSIONS
// ============================================================

// GET /missions
export function getMissions() {
  return request("/missions")
}

// GET /missions/{id}
export function getMission(id) {
  return request(`/missions/${id}`)
}

// POST /missions
export function createMission(mission) {
  return request("/missions", {
    method: "POST",
    body: JSON.stringify(mission),
  })
}

// PUT /missions/{id}
export function updateMission(id, mission) {
  return request(`/missions/${id}`, {
    method: "PUT",
    body: JSON.stringify(mission),
  })
}

// DELETE /missions/{id}
export function deleteMission(id) {
  return request(`/missions/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// MISSION RESOURCES
// ============================================================

// GET /mission-resources
export function getMissionResources() {
  return request("/mission-resources")
}

// POST /mission-resources
export function assignMissionResource(data) {
  return request("/mission-resources", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// PUT /mission-resources/{id}
export function updateMissionResource(id, data) {
  return request(`/mission-resources/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

// DELETE /mission-resources/{id}
export function deleteMissionResource(id) {
  return request(`/mission-resources/${id}`, {
    method: "DELETE",
  })
}

// ============================================================
// LOGISTICS
// ============================================================

// POST /logistics/plan
export function createLogisticsPlan(logisticsData) {
  return request("/logistics/plan", {
    method: "POST",
    body: JSON.stringify(logisticsData),
  })
}

// GET /logistics
export function getLogisticsPlans() {
  return request("/logistics")
}

// GET /logistics/{id}
export function getLogisticsPlan(planId) {
  return request(`/logistics/${planId}`)
}

// PUT /logistics/{id}
export function updateLogisticsPlan(planId, data) {
  return request(`/logistics/${planId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

// PUT /logistics/{id}
// Status only
export function updateLogisticsStatus(planId, status) {
  return request(`/logistics/${planId}`, {
    method: "PUT",

    body: JSON.stringify({
      status,
    }),
  })
}

// ============================================================
// LOGISTICS AI OPTIMIZATION
// ============================================================

// POST /logistics/optimize
export function optimizeLogistics(data) {
  return request("/logistics/optimize", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// POST /logistics/reallocate
export function reallocateLogistics(data) {
  return request("/logistics/reallocate", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// POST /logistics/optimize-multiple
export function optimizeMultipleLogistics(data) {
  return request("/logistics/optimize-multiple", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ============================================================
// ROUTING + ETA
// ============================================================

// POST /logistics/route
export function getRouteETA(data) {
  return request("/logistics/route", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ============================================================
// AUDIT LOG
// ============================================================

// GET /audit-logs
export function getAuditLogs(limit = 50) {
  return request(`/audit-logs?limit=${limit}`)
}

// ============================================================
// SOS REQUESTS
// ============================================================

// POST /sos  (public — no auth token needed)
export function createSOS(data) {
  return fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json())
}

// GET /sos
export function getSOSRequests() {
  return request("/sos")
}

// PUT /sos/{id}
export function updateSOSStatus(id, status) {
  return request(`/sos/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  })
}

// DELETE /sos/{id}
export function deleteSOSRequest(id) {
  return request(`/sos/${id}`, { method: "DELETE" })
}

// ============================================================
// RESOURCE SHORTAGE ALERTS
// ============================================================

// GET /resources/shortage-alerts
export function getShortageAlerts() {
  return request("/resources/shortage-alerts").then((r) => r.alerts ?? r)
}

// ============================================================
// DASHBOARD STATS
// ============================================================

// GET /dashboard/stats
export function getDashboardStats() {
  return request("/dashboard/stats")
}

// ============================================================
// EXTERNAL DISASTER FEED - USGS
// ============================================================

// GET /external-feeds/earthquakes
export function getExternalEarthquakes(minMagnitude = 4) {
  return request(
    `/external-feeds/earthquakes?min_magnitude=${minMagnitude}`
  )
}

// POST /external-feeds/sync
export function syncExternalDisasters(
  minMagnitude = 4,
  days = 7
) {
  return request("/external-feeds/sync", {
    method: "POST",

    body: JSON.stringify({
      min_magnitude: minMagnitude,
      days,
    }),
  })
}

// GET /external-feeds/status
export function getExternalFeedStatus() {
  return request("/external-feeds/status")
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  // Base
  API_BASE_URL,

  // System
  getSystemStatus,

  // Authentication
  login,

  // Users
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,

  // Disasters
  getDisasters,
  getDisaster,
  createDisaster,
  updateDisaster,
  deleteDisaster,

  // Resources
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,

  // Vehicles
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,

  // Vehicle location
  updateVehicleLocation,
  getVehicleLocation,

  // AI prediction
  predictResourceDemand,

  // Zones
  getZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,

  // Zone priority
  getZonePriority,
  getAllZonePriorities,

  // Zone AI prediction
  predictZoneDemand,
  predictZoneDemandWithVulnerability,

  // Scenario simulation
  simulateScenario,

  // Impact map
  getImpactMapData,

  // Field teams
  getFieldTeams,
  createFieldTeam,
  updateFieldTeam,
  deleteFieldTeam,

  // Missions
  getMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,

  // Mission resources
  getMissionResources,
  assignMissionResource,
  updateMissionResource,
  deleteMissionResource,

  // Logistics
  createLogisticsPlan,
  getLogisticsPlans,
  getLogisticsPlan,
  updateLogisticsPlan,
  updateLogisticsStatus,

  // Logistics AI
  optimizeLogistics,
  reallocateLogistics,
  optimizeMultipleLogistics,

  // Routing
  getRouteETA,

  // Audit log
  getAuditLogs,

  // SOS
  createSOS,
  getSOSRequests,
  updateSOSStatus,
  deleteSOSRequest,

  // Shortage alerts
  getShortageAlerts,

  // Dashboard stats
  getDashboardStats,

  // External disaster feeds
  getExternalEarthquakes,
  syncExternalDisasters,
  getExternalFeedStatus,
}