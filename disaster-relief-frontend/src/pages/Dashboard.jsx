
import { useEffect, useMemo, useState } from "react"

import {
  AlertTriangle,
  Package,
  Truck,
  Activity,
  RefreshCw,
  Database,
  ShieldAlert,
  MapPinned,
  Siren,
  Target,
  Map,
  Navigation,
  Users,
  Clock3,
  Radio,
  ChevronRight,
  Zap,
  BrainCircuit,
  Sparkles,
  Gauge,
  CircleCheck,
  CircleAlert,
  Bot,
  Cpu,
  BarChart3,
  TrendingUp,
  Layers3,
  Route,
  Radar,
  ShieldCheck,
  ExternalLink,
} from "lucide-react"

import {
  getDisasters,
  getResources,
  getVehicles,
  getMissions,
  getZones,
  getAllZonePriorities,
  getSystemStatus,
  getShortageAlerts,
  getSOSRequests,
} from "../services/api"

import StatCard from "../components/StatCard"
import StatusBadge from "../components/StatusBadge"
import { useLanguage } from "../i18n.jsx"
import { useNavigate } from "react-router-dom"


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [disasters, setDisasters] = useState([])
  const [resources, setResources] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [missions, setMissions] = useState([])
  const [zones, setZones] = useState([])
  const [zonePriorities, setZonePriorities] = useState([])
  const [systemStatus, setSystemStatus] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [shortageAlerts, setShortageAlerts] = useState([])
  const [pendingSOS, setPendingSOS] = useState([])

  // ==========================================================
  // LOAD LIVE DATA
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setError("")
      setRefreshing(true)

      const results = await Promise.allSettled([
        getSystemStatus(),
        getDisasters(),
        getResources(),
        getVehicles(),
        getMissions(),
        getZones(),
        getAllZonePriorities(),
        getShortageAlerts(),
        getSOSRequests(),
      ])

      const [
        systemResult,
        disasterResult,
        resourceResult,
        vehicleResult,
        missionResult,
        zoneResult,
        priorityResult,
        shortageResult,
        sosResult,
      ] = results

      if (systemResult.status === "fulfilled") {
        setSystemStatus(systemResult.value)
      }

      if (disasterResult.status === "fulfilled") {
        setDisasters(
          Array.isArray(disasterResult.value)
            ? disasterResult.value
            : []
        )
      }

      if (resourceResult.status === "fulfilled") {
        setResources(
          Array.isArray(resourceResult.value)
            ? resourceResult.value
            : []
        )
      }

      if (vehicleResult.status === "fulfilled") {
        setVehicles(
          Array.isArray(vehicleResult.value)
            ? vehicleResult.value
            : []
        )
      }

      if (missionResult.status === "fulfilled") {
        setMissions(
          Array.isArray(missionResult.value)
            ? missionResult.value
            : []
        )
      }

      if (zoneResult.status === "fulfilled") {
        setZones(
          Array.isArray(zoneResult.value)
            ? zoneResult.value
            : []
        )
      }

      if (priorityResult.status === "fulfilled") {
        setZonePriorities(
          Array.isArray(priorityResult.value)
            ? priorityResult.value
            : []
        )
      }

      if (shortageResult.status === "fulfilled") {
        setShortageAlerts(
          Array.isArray(shortageResult.value)
            ? shortageResult.value
            : []
        )
      }

      if (sosResult.status === "fulfilled") {
        const allSOS = Array.isArray(sosResult.value) ? sosResult.value : []
        setPendingSOS(allSOS.filter((s) => String(s.status || "").toLowerCase() === "pending"))
      }

      const failedRequests = results.filter(
        (result) => result.status === "rejected"
      )

      if (failedRequests.length > 0) {
        setError(
          `${failedRequests.length} live data source${
            failedRequests.length > 1 ? "s" : ""
          } could not be loaded.`
        )
      }
    } catch (err) {
      console.error("Dashboard error:", err)

      setError(
        err?.message ||
          "Failed to load command center data."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])


  // ==========================================================
  // OPERATIONAL STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const normalize = (value) =>
      String(value || "").toLowerCase().trim()

    const criticalDisasters = disasters.filter(
      (item) => normalize(item.severity) === "critical"
    ).length

    const highDisasters = disasters.filter(
      (item) => normalize(item.severity) === "high"
    ).length

    const mediumDisasters = disasters.filter(
      (item) => normalize(item.severity) === "medium"
    ).length

    const lowDisasters = disasters.filter(
      (item) => normalize(item.severity) === "low"
    ).length

    const availableVehicles = vehicles.filter(
      (item) => normalize(item.status) === "available"
    ).length

    const activeVehicles = vehicles.filter((item) => {
      const status = normalize(item.status)

      return (
        status === "active" ||
        status === "on mission" ||
        status === "in transit" ||
        status === "dispatched"
      )
    }).length

    const maintenanceVehicles = vehicles.filter((item) => {
      const status = normalize(item.status)

      return (
        status === "maintenance" ||
        status === "under maintenance"
      )
    }).length

    const activeMissions = missions.filter((mission) => {
      const status = normalize(mission.status)

      return ![
        "completed",
        "cancelled",
        "cancel",
        "done",
      ].includes(status)
    }).length

    const completedMissions = missions.filter((mission) => {
      const status = normalize(mission.status)

      return (
        status === "completed" ||
        status === "done"
      )
    }).length

    const criticalZones = zonePriorities.filter(
      (zone) => normalize(zone.priority) === "critical"
    ).length

    const highZones = zonePriorities.filter(
      (zone) => normalize(zone.priority) === "high"
    ).length

    const totalResourceQuantity = resources.reduce(
      (total, item) =>
        total + (Number(item.quantity) || 0),
      0
    )

    const totalRecords =
      disasters.length +
      resources.length +
      vehicles.length +
      missions.length +
      zones.length

    const readiness =
      vehicles.length > 0
        ? Math.round(
            ((availableVehicles + activeVehicles) /
              vehicles.length) *
              100
          )
        : 0

    const missionCompletion =
      missions.length > 0
        ? Math.round(
            (completedMissions /
              missions.length) *
              100
          )
        : 0

    const severityScore =
      criticalDisasters * 4 +
      highDisasters * 3 +
      mediumDisasters * 2 +
      lowDisasters

    return {
      totalDisasters: disasters.length,
      criticalDisasters,
      highDisasters,
      mediumDisasters,
      lowDisasters,

      totalResourceQuantity,

      availableVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalVehicles: vehicles.length,

      activeMissions,
      completedMissions,
      totalMissions: missions.length,

      totalZones: zones.length,
      criticalZones,
      highZones,

      totalRecords,

      readiness: Math.min(readiness, 100),
      missionCompletion,

      severityScore,
    }
  }, [
    disasters,
    resources,
    vehicles,
    missions,
    zones,
    zonePriorities,
  ])


  // ==========================================================
  // AI OPERATIONAL INTELLIGENCE
  // ==========================================================

  const aiIntelligence = useMemo(() => {
    const {
      criticalDisasters,
      highDisasters,
      criticalZones,
      activeMissions,
      availableVehicles,
      totalVehicles,
      readiness,
      severityScore,
      totalDisasters,
    } = statistics

    let riskLevel = "LOW"
    let riskScore = 18

    if (
      criticalDisasters > 0 ||
      criticalZones > 0
    ) {
      riskLevel = "CRITICAL"
      riskScore = Math.min(
        98,
        70 +
          criticalDisasters * 7 +
          criticalZones * 5
      )
    } else if (
      highDisasters >= 2 ||
      highDisasters > 0
    ) {
      riskLevel = "HIGH"
      riskScore = Math.min(
        85,
        55 +
          highDisasters * 7
      )
    } else if (totalDisasters > 0) {
      riskLevel = "MODERATE"
      riskScore = Math.min(
        65,
        30 + totalDisasters * 5
      )
    }

    let recommendation =
      "Maintain standard monitoring and response readiness."

    let action =
      "Continue monitoring live operational signals."

    if (criticalDisasters > 0) {
      recommendation =
        "Critical incidents detected. Prioritize immediate response coordination."

      action =
        "Review critical incidents and allocate available response assets."
    } else if (criticalZones > 0) {
      recommendation =
        "Critical response zones require elevated operational attention."

      action =
        "Review zone priority and resource allocation."
    } else if (availableVehicles === 0 && totalVehicles > 0) {
      recommendation =
        "Fleet availability is currently constrained."

      action =
        "Review vehicle assignments and active missions."
    } else if (activeMissions > availableVehicles && totalVehicles > 0) {
      recommendation =
        "Mission demand is higher than currently available vehicle capacity."

      action =
        "Review mission scheduling and logistics allocation."
    } else if (readiness >= 80) {
      recommendation =
        "Operational readiness is currently strong based on available fleet capacity."

      action =
        "Continue monitoring incidents, zones and mission activity."
    }

    const riskLevelKey =
      riskLevel === "CRITICAL"
        ? "riskCriticalLabel"
        : riskLevel === "HIGH"
        ? "riskHighLabel"
        : riskLevel === "MODERATE"
        ? "riskModerateLabel"
        : "riskLowLabel"

    return {
      riskLevel,
      riskLevelKey,
      riskScore,
      recommendation,
      action,
      severityScore,
    }
  }, [statistics])


  // ==========================================================
  // RESOURCE SUMMARY
  // ==========================================================

  const resourceSummary = useMemo(() => {
    const summary = {}

    resources.forEach((resource) => {
      const type =
        resource.resource_type ||
        resource.type ||
        "Unknown"

      if (!summary[type]) {
        summary[type] = 0
      }

      summary[type] +=
        Number(resource.quantity) || 0
    })

    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [resources])


  // ==========================================================
  // RECENT DISASTERS
  // ==========================================================

  const recentDisasters = useMemo(() => {
    return [...disasters]
      .sort(
        (a, b) =>
          Number(b.id || 0) -
          Number(a.id || 0)
      )
      .slice(0, 5)
  }, [disasters])


  // ==========================================================
  // MISSION SUMMARY
  // ==========================================================

  const missionSummary = useMemo(() => {
    const summary = {}

    missions.forEach((mission) => {
      const status =
        mission.status ||
        "Unknown"

      if (!summary[status]) {
        summary[status] = 0
      }

      summary[status] += 1
    })

    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
  }, [missions])


  // ==========================================================
  // VEHICLE SUMMARY
  // ==========================================================

  const vehicleSummary = useMemo(() => {
    const summary = {}

    vehicles.forEach((vehicle) => {
      const status =
        vehicle.status ||
        "Unknown"

      if (!summary[status]) {
        summary[status] = 0
      }

      summary[status] += 1
    })

    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
  }, [vehicles])


  // ==========================================================
  // PRIORITY SUMMARY
  // ==========================================================

  const prioritySummary = useMemo(() => {
    const summary = {}

    zonePriorities.forEach((zone) => {
      const priority =
        zone.priority ||
        "Unknown"

      if (!summary[priority]) {
        summary[priority] = 0
      }

      summary[priority] += 1
    })

    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
  }, [zonePriorities])


  // ==========================================================
  // HELPERS
  // ==========================================================

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN")

  const getSeverityStyle = (severity) => {
    const value =
      String(severity || "")
        .toLowerCase()

    if (value === "critical") {
      return "border-red-200 bg-red-50 text-red-700"
    }

    if (value === "high") {
      return "border-orange-200 bg-orange-50 text-orange-700"
    }

    if (value === "medium") {
      return "border-amber-200 bg-amber-50 text-amber-700"
    }

    return "border-green-200 bg-green-50 text-green-700"
  }

  const riskColor =
    aiIntelligence.riskLevel === "CRITICAL"
      ? "text-red-600"
      : aiIntelligence.riskLevel === "HIGH"
      ? "text-orange-600"
      : aiIntelligence.riskLevel === "MODERATE"
      ? "text-amber-600"
      : "text-green-600"


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="dashboard-page min-h-screen pb-10">

      {/* ======================================================
          HERO COMMAND HEADER
      ====================================================== */}

      <div className="relative mb-6 overflow-hidden rounded-3xl border border-red-100 bg-white shadow-[0_20px_60px_rgba(127,29,29,0.08)]">

        <div className="h-1.5 bg-gradient-to-r from-red-950 via-red-600 to-orange-400" />

        <div className="relative overflow-hidden p-5 sm:p-7">

          {/* Decorative AI glow */}

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-orange-100/50 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex items-start gap-4">

              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-700 to-red-500 text-white shadow-lg shadow-red-200">

                <BrainCircuit size={30} />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 shadow">

                  <Sparkles size={11} />

                </span>

              </div>

              <div>

                <div className="mb-1.5 flex flex-wrap items-center gap-2">

                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">

                    {t("dashboardEyebrow")}

                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">

                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                    {t("liveIntelligence")}

                  </span>

                </div>

                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">

                  {t("dashboardTitle")}

                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">

                  {t("dashboardDescription")}

                </p>

              </div>

            </div>


            {/* Controls */}

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />

                </span>

                <div>

                  <p className="text-[9px] font-black uppercase tracking-wider text-green-600">

                    {t("backend")}

                  </p>

                  <p className="text-xs font-black text-green-800">

                    {systemStatus
                      ? t("connected")
                      : t("checking")}

                  </p>

                </div>

              </div>

              <button
                onClick={loadDashboard}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-800 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {t("refreshIntelligence")}

              </button>

            </div>

          </div>


          {/* Live strip */}

          <div className="relative mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

            <QuickStatus
              icon={Radar}
              label={t("incidentMonitoring")}
              value={`${statistics.totalDisasters} ${t("liveRecords")}`}
            />

            <QuickStatus
              icon={Navigation}
              label={t("fleetReadiness")}
              value={`${statistics.availableVehicles} ${t("available")}`}
            />

            <QuickStatus
              icon={Target}
              label={t("missionControl")}
              value={`${statistics.activeMissions} ${t("active")}`}
            />

            <QuickStatus
              icon={MapPinned}
              label={t("priorityZones")}
              value={`${statistics.criticalZones} ${t("critical")}`}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          SHORTAGE ALERTS BANNER
      ====================================================== */}

      {shortageAlerts.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between border-b border-orange-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <Package size={17} className="text-orange-600" />
              <p className="text-sm font-black text-orange-800">
                Resource Shortage Alerts — {shortageAlerts.length} item{shortageAlerts.length > 1 ? "s" : ""} below threshold
              </p>
            </div>
            <button
              onClick={() => navigate("/resources")}
              className="flex items-center gap-1 text-xs font-bold text-orange-700 hover:text-orange-900"
            >
              View Resources <ExternalLink size={12} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {shortageAlerts.slice(0, 8).map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-800"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {item.resource_type || "Resource"} — {item.quantity} units
                {item.location ? ` · ${item.location}` : ""}
              </span>
            ))}
            {shortageAlerts.length > 8 && (
              <span className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-600">
                +{shortageAlerts.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}


      {/* ======================================================
          PENDING SOS BANNER
      ====================================================== */}

      {pendingSOS.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-red-300 bg-red-50">
          <div className="flex items-center justify-between border-b border-red-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <Siren size={17} className="text-red-600" />
              <p className="text-sm font-black text-red-800">
                {pendingSOS.length} Pending SOS Request{pendingSOS.length > 1 ? "s" : ""} — Immediate Attention Required
              </p>
            </div>
            <button
              onClick={() => navigate("/sos")}
              className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900"
            >
              Manage SOS <ExternalLink size={12} />
            </button>
          </div>
          <div className="divide-y divide-red-100">
            {pendingSOS.slice(0, 3).map((sos) => (
              <div key={sos.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <Siren size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">{sos.name || "Unknown"} — {sos.location || "Unknown location"}</p>
                    <p className="text-xs text-red-600">{sos.people_count || 1} people · {sos.needs || "Needs unspecified"}</p>
                  </div>
                </div>
                <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-black text-red-700">
                  {sos.severity || "High"}
                </span>
              </div>
            ))}
            {pendingSOS.length > 3 && (
              <div className="px-5 py-2.5 text-xs font-bold text-red-600">
                +{pendingSOS.length - 3} more pending requests
              </div>
            )}
          </div>
        </div>
      )}


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">

            <CircleAlert size={19} />

          </div>

          <div>

            <p className="text-sm font-black text-red-800">

              {t("liveDataWarning")}

            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">

              {error}

            </p>

          </div>

        </div>

      )}


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading ? (

        <LoadingScreen />

      ) : (

        <>

          {/* ==================================================
              AI INTELLIGENCE PANEL
          ================================================== */}

          <section className="relative mb-5 overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-950 via-red-900 to-red-800 text-white shadow-[0_20px_60px_rgba(127,29,29,0.22)]">

            <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-red-500/20 blur-3xl" />

            <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative p-5 sm:p-6">

              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-start gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">

                    <Bot size={25} />

                  </div>

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">

                        {t("aiOperationsIntel")}

                      </p>

                      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white/70">

                        {t("liveAnalysis")}

                      </span>

                    </div>

                    <h2 className="mt-1 text-xl font-black">

                      {t("responseSituationAnalysis")}

                    </h2>

                    <p className="mt-1.5 max-w-2xl text-xs leading-5 text-red-100/70">

                      {t("responseSituationDescDashboard")}

                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">

                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/10">

                    <Gauge
                      size={22}
                      className={riskColor}
                    />

                    <div className="absolute inset-0 flex items-center justify-center">

                      <span className="mt-8 text-[9px] font-black text-white/60">

                        {aiIntelligence.riskScore}%

                      </span>

                    </div>

                  </div>

                  <div>

                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">

                      {t("situationLevel")}

                    </p>

                    <p
                      className={`mt-0.5 text-xl font-black ${riskColor}`}
                    >

                      {t(aiIntelligence.riskLevelKey)}

                    </p>

                  </div>

                </div>

              </div>


              <div className="mt-6 grid gap-3 md:grid-cols-3">

                <AIInsight
                  icon={ShieldAlert}
                  title={t("situation")}
                  value={`${aiIntelligence.riskScore}%`}
                  description={t("calculatedResponseRisk")}
                />

                <AIInsight
                  icon={Zap}
                  title={t("aiRecommendation")}
                  value={t("priorityReview")}
                  description={aiIntelligence.recommendation}
                />

                <AIInsight
                  icon={Route}
                  title={t("suggestedAction")}
                  value={t("coordinate")}
                  description={aiIntelligence.action}
                />

              </div>

            </div>

          </section>


          {/* ==================================================
              PRIMARY KPIs
          ================================================== */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title={t("totalIncidents")}
              value={statistics.totalDisasters}
              subtitle={`${statistics.criticalDisasters} ${t("criticalIncidents")}`}
              icon={AlertTriangle}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />

            <StatCard
              title={t("resourceInventory")}
              value={formatNumber(
                statistics.totalResourceQuantity
              )}
              subtitle={`${resources.length} ${t("inventoryRecords")}`}
              icon={Package}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
            />

            <StatCard
              title={t("availableVehicles")}
              value={statistics.availableVehicles}
              subtitle={`${statistics.totalVehicles} ${t("totalFleet")}`}
              icon={Truck}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />

            <StatCard
              title={t("activeMissions")}
              value={statistics.activeMissions}
              subtitle={`${statistics.totalMissions} ${t("totalMissions")}`}
              icon={Target}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />

          </div>


          {/* ==================================================
              AI PERFORMANCE METRICS
          ================================================== */}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AIKPI
              icon={Gauge}
              title={t("fleetReadinessMetric")}
              value={`${statistics.readiness}%`}
              description={t("availableActiveFleet")}
              progress={statistics.readiness}
              iconClass="bg-green-50 text-green-600"
              progressClass="bg-green-500"
            />

            <AIKPI
              icon={CircleCheck}
              title={t("missionCompletion")}
              value={`${statistics.missionCompletion}%`}
              description={t("completedMissionRatio")}
              progress={statistics.missionCompletion}
              iconClass="bg-purple-50 text-purple-600"
              progressClass="bg-purple-500"
            />

            <AIKPI
              icon={ShieldAlert}
              title={t("criticalZones")}
              value={statistics.criticalZones}
              description={`${statistics.highZones} ${t("highPriority")}`}
              progress={
                statistics.totalZones
                  ? Math.min(
                      100,
                      (statistics.criticalZones /
                        statistics.totalZones) *
                        100
                    )
                  : 0
              }
              iconClass="bg-red-50 text-red-600"
              progressClass="bg-red-500"
            />

            <AIKPI
              icon={Cpu}
              title={t("backendRecords")}
              value={formatNumber(statistics.totalRecords)}
              description={t("backendRecordsDesc")}
              progress={100}
              iconClass="bg-blue-50 text-blue-600"
              progressClass="bg-blue-500"
            />

          </div>


          {/* ==================================================
              ALERT OVERVIEW
          ================================================== */}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <AlertMetric
              title={t("criticalLabel")}
              value={statistics.criticalDisasters}
              description={t("requiresImmediateAttention")}
              icon={ShieldAlert}
              className="border-red-200 bg-gradient-to-br from-red-50 to-white"
              iconClass="bg-red-100 text-red-600"
              valueClass="text-red-700"
            />

            <AlertMetric
              title={t("highPriority")}
              value={statistics.highDisasters}
              description={t("highSeverityIncidents")}
              icon={AlertTriangle}
              className="border-orange-200 bg-gradient-to-br from-orange-50 to-white"
              iconClass="bg-orange-100 text-orange-600"
              valueClass="text-orange-700"
            />

            <AlertMetric
              title={t("mediumLabel")}
              value={statistics.mediumDisasters}
              description={t("monitorResponseStatus")}
              icon={Activity}
              className="border-amber-200 bg-gradient-to-br from-amber-50 to-white"
              iconClass="bg-amber-100 text-amber-600"
              valueClass="text-amber-700"
            />

          </div>


          {/* ==================================================
              MAIN OPERATIONS
          ================================================== */}

          <div className="mt-5 grid gap-5 xl:grid-cols-2">

            {/* INCIDENTS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <PanelHeader
                icon={AlertTriangle}
                title={t("recentIncidentsDashboard")}
                description={t("recentIncidentsDashboardDesc")}
                iconClass="bg-red-50 text-red-600"
              />

              {recentDisasters.length === 0 ? (

                <EmptyState
                  icon={ShieldAlert}
                  title={t("noDisasterRecords")}
                  description={t("noIncidentsAvailable")}
                />

              ) : (

                <div className="divide-y divide-slate-100">

                  {recentDisasters.map(
                    (disaster) => (

                      <div
                        key={disaster.id}
                        className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-red-50/40"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">

                            <AlertTriangle size={17} />

                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <p className="truncate text-sm font-bold text-slate-900">

                                {disaster.disaster_type ||
                                  t("unknownDisaster")}

                              </p>

                              <span className="text-[10px] font-semibold text-slate-400">

                                #{disaster.id}

                              </span>

                            </div>

                            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">

                              <MapPinned size={12} />

                              {disaster.location ||
                                t("locationUnavailable")}

                            </p>

                          </div>

                        </div>

                        <div className="flex shrink-0 items-center gap-2">

                          <span
                            className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase sm:inline-flex ${getSeverityStyle(
                              disaster.severity
                            )}`}
                          >

                            {disaster.severity ||
                              "Unknown"}

                          </span>

                          <ChevronRight
                            size={15}
                            className="text-slate-300 group-hover:text-red-400"
                          />

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            {/* RESOURCE INVENTORY */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <PanelHeader
                icon={Package}
                title={t("resourceIntelligence")}
                description={t("resourceIntelligenceDesc")}
                iconClass="bg-orange-50 text-orange-600"
              />

              {resourceSummary.length === 0 ? (

                <EmptyState
                  icon={Package}
                  title={t("noResourceRecords")}
                  description={t("noInventoryData")}
                />

              ) : (

                <div className="divide-y divide-slate-100">

                  {resourceSummary.map(
                    ([type, quantity], index) => (

                      <div
                        key={type}
                        className="px-5 py-3.5 transition hover:bg-orange-50/30"
                      >

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">

                              <Package size={16} />

                            </div>

                            <div>

                              <p className="text-sm font-semibold text-slate-800">

                                {type}

                              </p>

                              <p className="text-[11px] text-slate-400">

                                {t("inventoryCategory", {
                                  index: index + 1,
                                })}

                              </p>

                            </div>

                          </div>

                          <div className="text-right">

                            <p className="text-sm font-black text-slate-900">

                              {formatNumber(quantity)}

                            </p>

                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">

                              {t("unitsLabel")}

                            </p>

                          </div>

                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400 transition-all"
                            style={{
                              width: `${Math.max(
                                8,
                                Math.min(
                                  100,
                                  (quantity /
                                    Math.max(
                                      resourceSummary[0]?.[1] || 1,
                                      1
                                    )) *
                                    100
                                )
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

          </div>


          {/* ==================================================
              MISSIONS + ZONES
          ================================================== */}

          <div className="mt-5 grid gap-5 xl:grid-cols-2">

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <PanelHeader
                icon={Target}
                title={t("missionOperations")}
                description={t("missionOperationsDesc")}
                iconClass="bg-purple-50 text-purple-600"
              />

              {missionSummary.length === 0 ? (

                <EmptyState
                  icon={Target}
                  title={t("noMissionsFound")}
                  description={t("missionsAppearHere")}
                />

              ) : (

                <div className="grid gap-3 p-5 sm:grid-cols-2">

                  {missionSummary.map(
                    ([status, count]) => (

                      <div
                        key={status}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-purple-200 hover:bg-purple-50/30"
                      >

                        <div className="flex items-center justify-between">

                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">

                            {status}

                          </p>

                          <Target
                            size={16}
                            className="text-slate-300"
                          />

                        </div>

                        <p className="mt-2 text-2xl font-black text-slate-900">

                          {count}

                        </p>

                        <div className="mt-2">

                          <StatusBadge
                            status={status}
                          />

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <PanelHeader
                icon={Map}
                title={t("zonePriorityIntelligence")}
                description={t("zonePriorityIntelligenceDesc")}
                iconClass="bg-blue-50 text-blue-600"
              />

              {prioritySummary.length === 0 ? (

                <EmptyState
                  icon={Map}
                  title={t("noPriorityData")}
                  description={t("createZonesToCalculate")}
                />

              ) : (

                <div className="grid gap-3 p-5 sm:grid-cols-2">

                  {prioritySummary.map(
                    ([priority, count]) => (

                      <div
                        key={priority}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                      >

                        <div className="flex items-center justify-between">

                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">

                            {priority}

                          </p>

                          <MapPinned
                            size={16}
                            className="text-slate-300"
                          />

                        </div>

                        <p className="mt-2 text-2xl font-black text-slate-900">

                          {count}

                        </p>

                        <div className="mt-2">

                          <StatusBadge
                            status={priority}
                          />

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

          </div>


          {/* ==================================================
              FLEET
          ================================================== */}

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <PanelHeader
              icon={Truck}
              title={t("responseVehicleFleet")}
              description={t("responseVehicleFleetDesc")}
              iconClass="bg-green-50 text-green-600"
            />

            {vehicleSummary.length === 0 ? (

              <EmptyState
                icon={Truck}
                title={t("noVehicleRecords")}
                description={t("vehicleInfoUnavailable")}
              />

            ) : (

              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">

                {vehicleSummary.map(
                  ([status, count]) => (

                    <div
                      key={status}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-green-200 hover:bg-green-50/30"
                    >

                      <div className="flex items-center justify-between">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">

                          <Truck size={17} />

                        </div>

                        <span className="text-2xl font-black text-slate-900">

                          {count}

                        </span>

                      </div>

                      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">

                        {status}

                      </p>

                      <div className="mt-2">

                        <StatusBadge
                          status={status}
                        />

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>


          {/* ==================================================
              SYSTEM INTELLIGENCE FOOTER
          ================================================== */}

          <section className="relative mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl">

            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-900/30">

                  <ShieldCheck size={19} />

                </div>

                <div>

                  <p className="text-sm font-black">

                    {t("aiOperationsSystemActive")}

                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">

                    {t("dashboardIntelDerived")}

                  </p>

                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <FooterBadge
                  icon={Database}
                  text={`${formatNumber(
                    statistics.totalRecords
                  )} ${t("recordsLabel")}`}
                />

                <FooterBadge
                  icon={MapPinned}
                  text={`${statistics.totalZones} ${t("zonesLabel")}`}
                />

                <FooterBadge
                  icon={Users}
                  text={`${statistics.totalMissions} ${t("missionsLabel")}`}
                />

                <FooterBadge
                  icon={Clock3}
                  text={t("liveDataLabel")}
                />

              </div>

            </div>

          </section>

        </>

      )}

    </div>
  )
}


// ============================================================
// LOADING SCREEN
// ============================================================

function LoadingScreen() {
  const { t } = useLanguage()

  return (
    <div className="overflow-hidden rounded-3xl border border-red-100 bg-white p-20 text-center shadow-sm">

      <div className="mx-auto relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">

        <BrainCircuit
          size={28}
          className="animate-pulse"
        />

        <span className="absolute inset-0 animate-ping rounded-2xl border border-red-200 opacity-50" />

      </div>

      <p className="mt-5 text-sm font-black text-slate-800">

        {t("initializingAiCommandCenter")}

      </p>

      <p className="mt-1 text-xs text-slate-400">

        {t("synchronizingLiveIntel")}

      </p>

    </div>
  )
}


// ============================================================
// QUICK STATUS
// ============================================================

function QuickStatus({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm">

        <Icon size={15} />

      </div>

      <div className="min-w-0">

        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">

          {label}

        </p>

        <p className="truncate text-xs font-bold text-slate-700">

          {value}

        </p>

      </div>

    </div>
  )
}


// ============================================================
// AI INSIGHT
// ============================================================

function AIInsight({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">

            {title}

          </p>

          <p className="mt-2 text-base font-black text-white">

            {value}

          </p>

        </div>

        <Icon
          size={17}
          className="text-red-300"
        />

      </div>

      <p className="mt-2 text-[11px] leading-5 text-white/50">

        {description}

      </p>

    </div>
  )
}


// ============================================================
// AI KPI
// ============================================================

function AIKPI({
  icon: Icon,
  title,
  value,
  description,
  progress,
  iconClass,
  progressClass,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-semibold text-slate-500">

            {title}

          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">

            {value}

          </p>

        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >

          <Icon size={19} />

        </div>

      </div>

      <p className="mt-2 text-[11px] text-slate-400">

        {description}

      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-all ${progressClass}`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, progress || 0)
            )}%`,
          }}
        />

      </div>

    </div>
  )
}


// ============================================================
// ALERT METRIC
// ============================================================

function AlertMetric({
  title,
  value,
  description,
  icon: Icon,
  className,
  iconClass,
  valueClass,
}) {
  const { t } = useLanguage()

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 ${className}`}
    >

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >

        <Icon size={20} />

      </div>

      <div className="min-w-0">

        <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-500">

          {title}

        </p>

        <div className="flex items-end gap-2">

          <p
            className={`text-2xl font-black ${valueClass}`}
          >

            {value}

          </p>

          <p className="mb-1 truncate text-[10px] text-slate-400">

            {t("incidentsLabel")}

          </p>

        </div>

        <p className="text-[11px] text-slate-500">

          {description}

        </p>

      </div>

    </div>
  )
}


// ============================================================
// PANEL HEADER
// ============================================================

function PanelHeader({
  icon: Icon,
  title,
  description,
  iconClass,
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

      <div>

        <h2 className="text-sm font-extrabold text-slate-900">

          {title}

        </h2>

        <p className="mt-1 text-[11px] text-slate-400">

          {description}

        </p>

      </div>

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
      >

        <Icon size={17} />

      </div>

    </div>
  )
}


// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="px-5 py-12 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300">

        <Icon size={24} />

      </div>

      <p className="mt-3 text-sm font-bold text-slate-600">

        {title}

      </p>

      <p className="mt-1 text-xs text-slate-400">

        {description}

      </p>

    </div>
  )
}


// ============================================================
// FOOTER BADGE
// ============================================================

function FooterBadge({
  icon: Icon,
  text,
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-slate-300">

      <Icon
        size={12}
        className="text-red-400"
      />

      {text}

    </span>
  )
}


export default Dashboard

