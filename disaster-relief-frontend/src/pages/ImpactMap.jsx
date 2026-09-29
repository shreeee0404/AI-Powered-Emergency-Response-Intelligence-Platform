import { useEffect, useMemo, useState } from "react"

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet"

import "leaflet/dist/leaflet.css"

import {
  AlertTriangle,
  MapPin,
  RefreshCw,
  Layers,
  Navigation,
  ShieldAlert,
  Users,
  Activity,
  Crosshair,
  Radio,
  Map as MapIcon,
} from "lucide-react"

import {
  getDisasters,
  getZones,
  getAllZonePriorities,
} from "../services/api"

import { useLanguage } from "../i18n.jsx"


// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_CENTER = [11.0168, 76.9558]

const DEFAULT_ZOOM = 7


// ============================================================
// Severity styling
// ============================================================

function getSeverityStyle(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return {
        color: "#7F1D1D",
        fillColor: "#DC2626",
      }

    case "high":
      return {
        color: "#9A3412",
        fillColor: "#F97316",
      }

    case "moderate":
    case "medium":
      return {
        color: "#92400E",
        fillColor: "#F59E0B",
      }

    case "low":
      return {
        color: "#166534",
        fillColor: "#22C55E",
      }

    default:
      return {
        color: "#334155",
        fillColor: "#64748B",
      }
  }
}


// ============================================================
// Zone priority styling
// ============================================================

function getPriorityStyle(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "critical":
      return {
        color: "#7F1D1D",
        fillColor: "#EF4444",
      }

    case "high":
      return {
        color: "#9A3412",
        fillColor: "#F97316",
      }

    case "medium":
    case "moderate":
      return {
        color: "#92400E",
        fillColor: "#F59E0B",
      }

    case "low":
      return {
        color: "#166534",
        fillColor: "#22C55E",
      }

    default:
      return {
        color: "#475569",
        fillColor: "#94A3B8",
      }
  }
}


// ============================================================
// Coordinate validation
// ============================================================

function hasValidCoordinates(item) {
  const latitude = Number(item?.latitude)
  const longitude = Number(item?.longitude)

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}


// ============================================================
// Priority calculation fallback
// ============================================================

function calculateFallbackPriority(zone) {
  const score = Number(zone?.severity_score || 0)

  if (score >= 8) return "Critical"
  if (score >= 6) return "High"
  if (score >= 4) return "Medium"

  return "Low"
}


// ============================================================
// Map controller
// ============================================================

function MapController({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      return
    }

    const bounds = points.map((point) => [
      Number(point.latitude),
      Number(point.longitude),
    ])

    if (bounds.length === 1) {
      map.setView(bounds[0], 11)
      return
    }

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 12,
    })
  }, [map, points])

  return null
}


// ============================================================
// Statistic Card
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "slate",
}) {
  const toneClasses = {
    slate: {
      wrapper: "border-slate-200 bg-white",
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-900",
    },

    red: {
      wrapper: "border-red-200 bg-red-50/70",
      icon: "bg-red-100 text-red-700",
      value: "text-red-900",
    },

    orange: {
      wrapper: "border-orange-200 bg-orange-50/70",
      icon: "bg-orange-100 text-orange-700",
      value: "text-orange-900",
    },

    blue: {
      wrapper: "border-blue-200 bg-blue-50/70",
      icon: "bg-blue-100 text-blue-700",
      value: "text-blue-900",
    },

    green: {
      wrapper: "border-green-200 bg-green-50/70",
      icon: "bg-green-100 text-green-700",
      value: "text-green-900",
    },
  }

  const styles = toneClasses[tone] || toneClasses.slate

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-black tracking-tight ${styles.value}`}
          >
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}


// ============================================================
// Impact Map
// ============================================================

function ImpactMap() {
  const { t } = useLanguage()
  const [disasters, setDisasters] = useState([])
  const [zones, setZones] = useState([])
  const [priorities, setPriorities] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [showDisasters, setShowDisasters] = useState(true)
  const [showZones, setShowZones] = useState(true)

  // ==========================================================
  // Load real backend data
  // ==========================================================

  useEffect(() => {
    loadImpactData()
  }, [])

  async function loadImpactData() {
    try {
      setError("")

      if (disasters.length || zones.length) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const results = await Promise.allSettled([
        getDisasters(),
        getZones(),
        getAllZonePriorities(),
      ])

      const disasterResult = results[0]
      const zoneResult = results[1]
      const priorityResult = results[2]

      // ------------------------------------------------------
      // Disasters
      // ------------------------------------------------------

      if (disasterResult.status === "fulfilled") {
        const data = disasterResult.value

        const disasterList = Array.isArray(data)
          ? data
          : Array.isArray(data?.disasters)
            ? data.disasters
            : []

        setDisasters(disasterList)
      } else {
        throw disasterResult.reason
      }

      // ------------------------------------------------------
      // Zones
      // ------------------------------------------------------

      if (zoneResult.status === "fulfilled") {
        const data = zoneResult.value

        const zoneList = Array.isArray(data)
          ? data
          : Array.isArray(data?.zones)
            ? data.zones
            : []

        setZones(zoneList)
      } else {
        setZones([])
      }

      // ------------------------------------------------------
      // Priorities
      // ------------------------------------------------------

      if (priorityResult.status === "fulfilled") {
        const data = priorityResult.value

        const priorityList = Array.isArray(data)
          ? data
          : Array.isArray(data?.priorities)
            ? data.priorities
            : []

        setPriorities(priorityList)
      } else {
        setPriorities([])
      }
    } catch (err) {
      console.error("Impact map loading error:", err)

      setError(
        err?.message ||
          "Failed to load disaster impact map data."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }


  // ==========================================================
  // Valid mapped disasters
  // ==========================================================

  const mappedDisasters = useMemo(() => {
    return disasters.filter(hasValidCoordinates)
  }, [disasters])


  // ==========================================================
  // Valid mapped zones
  // ==========================================================

  const mappedZones = useMemo(() => {
    return zones.filter(hasValidCoordinates)
  }, [zones])


  // ==========================================================
  // Unmapped counts
  // ==========================================================

  const unmappedDisasterCount =
    disasters.length - mappedDisasters.length

  const unmappedZoneCount =
    zones.length - mappedZones.length


  // ==========================================================
  // Priority map
  // ==========================================================

  const priorityMap = useMemo(() => {
    const map = {}

    priorities.forEach((item) => {
      if (item?.zone_id !== undefined) {
        map[item.zone_id] = item
      }

      if (item?.id !== undefined) {
        map[item.id] = item
      }
    })

    return map
  }, [priorities])


  // ==========================================================
  // Get zone priority
  // ==========================================================

  function getZonePriority(zone) {
    const priorityData = priorityMap[zone.id]

    return (
      priorityData?.priority ||
      priorityData?.priority_level ||
      calculateFallbackPriority(zone)
    )
  }


  // ==========================================================
  // Combined map points
  // ==========================================================

  const allMapPoints = useMemo(() => {
    return [
      ...(showDisasters ? mappedDisasters : []),
      ...(showZones ? mappedZones : []),
    ]
  }, [
    mappedDisasters,
    mappedZones,
    showDisasters,
    showZones,
  ])


  // ==========================================================
  // Map center
  // ==========================================================

  const mapCenter = useMemo(() => {
    if (!allMapPoints.length) {
      return DEFAULT_CENTER
    }

    const totalLatitude = allMapPoints.reduce(
      (sum, item) => sum + Number(item.latitude),
      0
    )

    const totalLongitude = allMapPoints.reduce(
      (sum, item) => sum + Number(item.longitude),
      0
    )

    return [
      totalLatitude / allMapPoints.length,
      totalLongitude / allMapPoints.length,
    ]
  }, [allMapPoints])


  // ==========================================================
  // Disaster severity counts
  // ==========================================================

  const severityCounts = useMemo(() => {
    return {
      critical: mappedDisasters.filter(
        (item) =>
          String(item.severity || "").toLowerCase() ===
          "critical"
      ).length,

      high: mappedDisasters.filter(
        (item) =>
          String(item.severity || "").toLowerCase() ===
          "high"
      ).length,

      moderate: mappedDisasters.filter(
        (item) =>
          ["moderate", "medium"].includes(
            String(item.severity || "").toLowerCase()
          )
      ).length,

      low: mappedDisasters.filter(
        (item) =>
          String(item.severity || "").toLowerCase() ===
          "low"
      ).length,
    }
  }, [mappedDisasters])


  // ==========================================================
  // Zone priority counts
  // ==========================================================

  const priorityCounts = useMemo(() => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }

    mappedZones.forEach((zone) => {
      const priority = String(
        getZonePriority(zone)
      ).toLowerCase()

      if (priority === "critical") {
        counts.critical++
      } else if (priority === "high") {
        counts.high++
      } else if (
        priority === "medium" ||
        priority === "moderate"
      ) {
        counts.medium++
      } else {
        counts.low++
      }
    })

    return counts
  }, [mappedZones, priorityMap])


  // ==========================================================
  // Critical zones
  // ==========================================================

  const criticalZones = useMemo(() => {
    return mappedZones.filter(
      (zone) =>
        String(getZonePriority(zone)).toLowerCase() ===
        "critical"
    )
  }, [mappedZones, priorityMap])


  // ==========================================================
  // Total affected population
  // ==========================================================

  const totalPopulation = useMemo(() => {
    return zones.reduce(
      (sum, zone) =>
        sum + Number(zone?.population || 0),
      0
    )
  }, [zones])


  // ==========================================================
  // Total vulnerable population
  // ==========================================================

  const totalVulnerablePopulation = useMemo(() => {
    return zones.reduce(
      (sum, zone) =>
        sum + Number(zone?.vulnerable_population || 0),
      0
    )
  }, [zones])


  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[650px] items-center justify-center">
        <div className="text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <RefreshCw
              size={28}
              className="animate-spin text-red-600"
            />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Loading operational map
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Connecting to live disaster and response-zone data...
          </p>

        </div>
      </div>
    )
  }


  // ==========================================================
  // Error
  // ==========================================================

  if (error) {
    return (
      <div className="space-y-6">

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <MapIcon size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                {t("impactMap")}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Live geographic view of disasters and response zones.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle
                size={22}
                className="text-red-600"
              />
            </div>

            <div className="flex-1">

              <h2 className="font-bold text-red-900">
                Unable to load operational map
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={loadImpactData}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <RefreshCw size={16} />
                Retry Connection
              </button>

            </div>
          </div>
        </div>

      </div>
    )
  }


  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <MapIcon size={24} />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Disaster Impact Map
                </h1>

                <span className="hidden rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700 sm:inline-flex">
                  {t("liveOperations")}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Real-time geographic view of incidents, response zones and operational priorities.
              </p>

            </div>

          </div>

        </div>


        <div className="flex items-center gap-3">

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {t("backend")} {t("connected")}
          </div>

          <button
            type="button"
            onClick={loadImpactData}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh Map"}
          </button>

        </div>

      </div>


      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Active Incidents"
          value={disasters.length}
          subtitle={`${mappedDisasters.length} locations mapped`}
          icon={AlertTriangle}
          tone="red"
        />

        <StatCard
          title="Response Zones"
          value={zones.length}
          subtitle={`${criticalZones.length} critical zones`}
          icon={Navigation}
          tone="blue"
        />

        <StatCard
          title="Affected Population"
          value={totalPopulation.toLocaleString()}
          subtitle={`${totalVulnerablePopulation.toLocaleString()} vulnerable`}
          icon={Users}
          tone="orange"
        />

        <StatCard
          title="Critical Incidents"
          value={severityCounts.critical}
          subtitle={`${priorityCounts.critical} critical zones`}
          icon={ShieldAlert}
          tone="red"
        />

      </div>


      {/* ======================================================
          OPERATIONAL STATUS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Activity size={19} />
              </div>

              <div>

                <h2 className="font-bold text-slate-950">
                  Incident Severity
                </h2>

                <p className="text-xs text-slate-500">
                  Current mapped disaster distribution
                </p>

              </div>

            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {mappedDisasters.length} mapped
            </span>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span className="text-xs font-bold text-red-700">
                  Critical
                </span>
              </div>

              <p className="mt-2 text-2xl font-black text-red-900">
                {severityCounts.critical}
              </p>
            </div>


            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-xs font-bold text-orange-700">
                  High
                </span>
              </div>

              <p className="mt-2 text-2xl font-black text-orange-900">
                {severityCounts.high}
              </p>
            </div>


            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-700">
                  Moderate
                </span>
              </div>

              <p className="mt-2 text-2xl font-black text-amber-900">
                {severityCounts.moderate}
              </p>
            </div>


            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-green-700">
                  Low
                </span>
              </div>

              <p className="mt-2 text-2xl font-black text-green-900">
                {severityCounts.low}
              </p>
            </div>

          </div>

        </div>


        <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Radio size={19} />
            </div>

            <div>

              <h2 className="font-bold">
                Map System
              </h2>

              <p className="text-xs text-slate-400">
                Operational status
              </p>

            </div>

          </div>


          <div className="mt-5 space-y-3">

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm text-slate-400">
                Incident layer
              </span>

              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm text-slate-400">
                Zone layer
              </span>

              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Coordinates
              </span>

              <span className="text-xs font-bold text-white">
                {mappedDisasters.length + mappedZones.length}
              </span>
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          LAYER CONTROLS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Layers size={19} />
            </div>

            <div>

              <h2 className="font-bold text-slate-950">
                Map Layers
              </h2>

              <p className="text-xs text-slate-500">
                Control which operational data appears on the map.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                setShowDisasters((value) => !value)
              }
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                showDisasters
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <AlertTriangle size={16} />

              Incidents

              <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                {mappedDisasters.length}
              </span>
            </button>


            <button
              type="button"
              onClick={() =>
                setShowZones((value) => !value)
              }
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                showZones
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <Navigation size={16} />

              Response Zones

              <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                {mappedZones.length}
              </span>
            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          MAP
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Crosshair size={18} />
            </div>

            <div>

              <h2 className="font-bold text-slate-950">
                Operational Geographic View
              </h2>

              <p className="text-xs text-slate-500">
                Live disaster incidents and response zones from the backend.
              </p>

            </div>

          </div>


          <div className="flex items-center gap-2">

            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

            <span className="text-xs font-bold text-slate-600">
              {allMapPoints.length} location
              {allMapPoints.length === 1 ? "" : "s"} displayed
            </span>

          </div>

        </div>


        <div className="h-[620px] w-full">

          {allMapPoints.length === 0 ? (

            <div className="flex h-full items-center justify-center bg-slate-50 px-6">

              <div className="max-w-md text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200">
                  <MapPin
                    className="text-slate-500"
                    size={30}
                  />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  No mapped locations
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Add valid latitude and longitude values to
                  disasters or response zones to display them
                  on the operational map.
                </p>

                <button
                  type="button"
                  onClick={loadImpactData}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  <RefreshCw size={16} />
                  Refresh Data
                </button>

              </div>

            </div>

          ) : (

            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom={true}
              className="h-full w-full"
            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />


              <MapController
                points={allMapPoints}
              />


              {/* ==================================================
                  DISASTER MARKERS
              ================================================== */}

              {showDisasters &&
                mappedDisasters.map((disaster) => {

                  const style = getSeverityStyle(
                    disaster.severity
                  )

                  const latitude =
                    Number(disaster.latitude)

                  const longitude =
                    Number(disaster.longitude)

                  return (
                    <CircleMarker
                      key={`disaster-${disaster.id}`}
                      center={[
                        latitude,
                        longitude,
                      ]}
                      radius={13}
                      pathOptions={{
                        color: style.color,
                        fillColor: style.fillColor,
                        fillOpacity: 0.88,
                        weight: 3,
                      }}
                    >

                      <Popup>

                        <div className="min-w-[255px]">

                          <div className="flex items-start gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                              <AlertTriangle
                                size={18}
                                className="text-red-600"
                              />
                            </div>

                            <div>

                              <h3 className="text-base font-black text-slate-950">
                                {disaster.disaster_type ||
                                  "Disaster Incident"}
                              </h3>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Incident ID #{disaster.id}
                              </p>

                            </div>

                          </div>


                          <div className="mt-4 space-y-3 text-sm">

                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Location
                              </p>

                              <p className="mt-0.5 font-semibold text-slate-700">
                                {disaster.location ||
                                  "Not specified"}
                              </p>
                            </div>


                            <div className="flex items-center justify-between gap-4">

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Severity
                                </p>

                                <p
                                  className="mt-0.5 font-black"
                                  style={{
                                    color: style.color,
                                  }}
                                >
                                  {disaster.severity ||
                                    "Unknown"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Coordinates
                                </p>

                                <p className="mt-0.5 font-mono text-xs text-slate-600">
                                  {latitude.toFixed(5)},{" "}
                                  {longitude.toFixed(5)}
                                </p>
                              </div>

                            </div>


                            {disaster.description && (
                              <div>

                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Description
                                </p>

                                <p className="mt-1 leading-5 text-slate-600">
                                  {disaster.description}
                                </p>

                              </div>
                            )}

                          </div>

                        </div>

                      </Popup>

                    </CircleMarker>
                  )
                })}


              {/* ==================================================
                  ZONE MARKERS
              ================================================== */}

              {showZones &&
                mappedZones.map((zone) => {

                  const priority =
                    getZonePriority(zone)

                  const style =
                    getPriorityStyle(priority)

                  const latitude =
                    Number(zone.latitude)

                  const longitude =
                    Number(zone.longitude)

                  return (
                    <CircleMarker
                      key={`zone-${zone.id}`}
                      center={[
                        latitude,
                        longitude,
                      ]}
                      radius={9}
                      pathOptions={{
                        color: style.color,
                        fillColor: style.fillColor,
                        fillOpacity: 0.58,
                        weight: 2,
                        dashArray: "5, 5",
                      }}
                    >

                      <Popup>

                        <div className="min-w-[270px]">

                          <div className="flex items-start gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              <ShieldAlert
                                size={18}
                                className="text-blue-600"
                              />
                            </div>

                            <div>

                              <h3 className="text-base font-black text-slate-950">
                                Response Zone
                              </h3>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Zone ID #{zone.id}
                              </p>

                            </div>

                          </div>


                          <div className="mt-4 space-y-3 text-sm">

                            <div className="grid grid-cols-2 gap-3">

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Grid Cell
                                </p>

                                <p className="mt-0.5 font-semibold text-slate-700">
                                  {zone.grid_cell_id ||
                                    "Not specified"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Priority
                                </p>

                                <p
                                  className="mt-0.5 font-black"
                                  style={{
                                    color: style.color,
                                  }}
                                >
                                  {priority}
                                </p>
                              </div>

                            </div>


                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Location
                              </p>

                              <p className="mt-0.5 font-semibold text-slate-700">
                                {zone.location ||
                                  "Not specified"}
                              </p>
                            </div>


                            <div className="grid grid-cols-2 gap-3">

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Severity Score
                                </p>

                                <p className="mt-0.5 font-black text-slate-800">
                                  {Number(
                                    zone.severity_score || 0
                                  ).toFixed(1)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Population
                                </p>

                                <p className="mt-0.5 font-black text-slate-800">
                                  {Number(
                                    zone.population || 0
                                  ).toLocaleString()}
                                </p>
                              </div>

                            </div>


                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">

                              <Users
                                size={15}
                                className="text-slate-500"
                              />

                              <span className="text-xs font-semibold text-slate-600">
                                Vulnerable population:
                              </span>

                              <span className="text-xs font-black text-slate-800">
                                {Number(
                                  zone.vulnerable_population || 0
                                ).toLocaleString()}
                              </span>

                            </div>


                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Coordinates
                              </p>

                              <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                                {latitude.toFixed(5)},{" "}
                                {longitude.toFixed(5)}
                              </div>
                            </div>

                          </div>

                        </div>

                      </Popup>

                    </CircleMarker>
                  )
                })}

            </MapContainer>

          )}

        </div>

      </div>


      {/* ======================================================
          ZONE PRIORITY OVERVIEW
      ====================================================== */}

      {zones.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <ShieldAlert size={19} />
              </div>

              <div>

                <h2 className="font-bold text-slate-950">
                  Zone Priority Overview
                </h2>

                <p className="text-xs text-slate-500">
                  Current response priority across operational zones.
                </p>

              </div>

            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {zones.length} zones
            </span>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Critical
              </p>

              <p className="mt-1 text-2xl font-black text-red-900">
                {priorityCounts.critical}
              </p>
            </div>


            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                High
              </p>

              <p className="mt-1 text-2xl font-black text-orange-900">
                {priorityCounts.high}
              </p>
            </div>


            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Medium
              </p>

              <p className="mt-1 text-2xl font-black text-amber-900">
                {priorityCounts.medium}
              </p>
            </div>


            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                Low
              </p>

              <p className="mt-1 text-2xl font-black text-green-900">
                {priorityCounts.low}
              </p>
            </div>

          </div>

        </div>
      )}


      {/* ======================================================
          UNMAPPED DATA WARNING
      ====================================================== */}

      {(unmappedDisasterCount > 0 ||
        unmappedZoneCount > 0) && (

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle
                size={20}
                className="text-amber-700"
              />
            </div>

            <div>

              <h3 className="font-bold text-amber-950">
                Some operational locations are not mapped
              </h3>

              <p className="mt-1 text-sm leading-6 text-amber-800">

                {unmappedDisasterCount > 0 && (
                  <>
                    {unmappedDisasterCount} disaster incident
                    {unmappedDisasterCount === 1 ? "" : "s"}{" "}
                    have missing or invalid coordinates.
                  </>
                )}

                {unmappedDisasterCount > 0 &&
                  unmappedZoneCount > 0 && (
                    <> </>
                  )}

                {unmappedZoneCount > 0 && (
                  <>
                    {unmappedZoneCount} response zone
                    {unmappedZoneCount === 1 ? "" : "s"}{" "}
                    have missing or invalid coordinates.
                  </>
                )}

              </p>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default ImpactMap