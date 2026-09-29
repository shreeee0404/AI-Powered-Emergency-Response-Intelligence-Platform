import { useEffect, useMemo, useState } from "react"

import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
  Pencil,
  X,
  MapPin,
  Search,
  ShieldAlert,
  Waves,
  Flame,
  Mountain,
  CloudLightning,
  Eye,
  BrainCircuit,
  Activity,
  Target,
  Radio,
  Crosshair,
  CheckCircle2,
  Navigation,
  Sparkles,
  Siren,
} from "lucide-react"

import StatusBadge from "../components/StatusBadge"
import { useLanguage } from "../i18n.jsx"

import {
  getDisasters,
  createDisaster,
  updateDisaster,
  deleteDisaster,
} from "../services/api"


// ============================================================
// INITIAL FORM
// ============================================================

const emptyForm = {
  disaster_type: "",
  location: "",
  latitude: "",
  longitude: "",
  severity: "High",
  description: "",
}


// ============================================================
// DISASTER ICON
// ============================================================

function DisasterIcon({ type, size = 20 }) {
  const value = String(type || "").toLowerCase()

  if (value.includes("flood")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Waves size={size} />
      </div>
    )
  }

  if (
    value.includes("fire") ||
    value.includes("wildfire")
  ) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <Flame size={size} />
      </div>
    )
  }

  if (
    value.includes("earthquake") ||
    value.includes("quake")
  ) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
        <Mountain size={size} />
      </div>
    )
  }

  if (value.includes("cyclone")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
        <CloudLightning size={size} />
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
      <AlertTriangle size={size} />
    </div>
  )
}


// ============================================================
// SEVERITY HELPERS
// ============================================================

function severityValue(severity) {
  return String(severity || "").trim().toLowerCase()
}

function isCritical(severity) {
  return severityValue(severity) === "critical"
}

function isHigh(severity) {
  return severityValue(severity) === "high"
}

function isMedium(severity) {
  return (
    severityValue(severity) === "medium" ||
    severityValue(severity) === "moderate"
  )
}

function severityRank(severity) {
  const value = severityValue(severity)

  if (value === "critical") return 4
  if (value === "high") return 3
  if (value === "medium" || value === "moderate") return 2
  if (value === "low") return 1

  return 0
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconWrapper,
  accent = "red",
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">

      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          accent === "red"
            ? "bg-red-600"
            : accent === "orange"
              ? "bg-orange-500"
              : accent === "amber"
                ? "bg-amber-500"
                : "bg-slate-400"
        }`}
      />

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrapper}`}
        >
          <Icon size={21} />
        </div>

      </div>
    </div>
  )
}


// ============================================================
// INTELLIGENCE CARD
// ============================================================

function IntelligenceSignal({
  icon: Icon,
  title,
  value,
  description,
  tone = "red",
}) {
  const tones = {
    red: {
      wrapper: "border-red-100 bg-red-50",
      icon: "bg-red-100 text-red-600",
      value: "text-red-700",
    },
    orange: {
      wrapper: "border-orange-100 bg-orange-50",
      icon: "bg-orange-100 text-orange-600",
      value: "text-orange-700",
    },
    green: {
      wrapper: "border-emerald-100 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-700",
    },
    slate: {
      wrapper: "border-slate-200 bg-slate-50",
      icon: "bg-slate-100 text-slate-600",
      value: "text-slate-700",
    },
  }

  const style = tones[tone] || tones.red

  return (
    <div
      className={`rounded-xl border p-4 ${style.wrapper}`}
    >
      <div className="flex items-start gap-3">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.icon}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p
            className={`mt-1 text-lg font-bold ${style.value}`}
          >
            {value}
          </p>

          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>
    </div>
  )
}


// ============================================================
// INCIDENTS PAGE
// ============================================================

function Incidents() {
  const { t } = useLanguage()
  const [incidents, setIncidents] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState(emptyForm)

  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")

  const [selectedIncident, setSelectedIncident] =
    useState(null)


  // ==========================================================
  // LOAD INCIDENTS
  // ==========================================================

  const loadIncidents = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getDisasters()

      setIncidents(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.disasters)
            ? data.disasters
            : []
      )
    } catch (err) {
      console.error(
        "Failed to load incidents:",
        err
      )

      setError(
        err?.message ||
          "Failed to load disaster incidents"
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadIncidents()
  }, [])


  // ==========================================================
  // FILTER OPTIONS
  // ==========================================================

  const disasterTypes = useMemo(() => {
    const types = incidents
      .map((item) => item.disaster_type)
      .filter(Boolean)

    return [...new Set(types)].sort()
  }, [incidents])


  // ==========================================================
  // FILTERED INCIDENTS
  // ==========================================================

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return incidents.filter((incident) => {
      const matchesSearch =
        !query ||
        String(incident.id)
          .toLowerCase()
          .includes(query) ||
        String(incident.disaster_type || "")
          .toLowerCase()
          .includes(query) ||
        String(incident.location || "")
          .toLowerCase()
          .includes(query) ||
        String(incident.description || "")
          .toLowerCase()
          .includes(query)

      const incidentSeverity =
        severityValue(incident.severity)

      const filterSeverity =
        severityValue(severityFilter)

      const matchesSeverity =
        severityFilter === "All" ||
        incidentSeverity === filterSeverity ||
        (
          filterSeverity === "medium" &&
          incidentSeverity === "moderate"
        ) ||
        (
          filterSeverity === "moderate" &&
          incidentSeverity === "medium"
        )

      const matchesType =
        typeFilter === "All" ||
        incident.disaster_type === typeFilter

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesType
      )
    })
  }, [
    incidents,
    search,
    severityFilter,
    typeFilter,
  ])


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats = useMemo(() => {
    const critical = incidents.filter((item) =>
      isCritical(item.severity)
    ).length

    const high = incidents.filter((item) =>
      isHigh(item.severity)
    ).length

    const medium = incidents.filter((item) =>
      isMedium(item.severity)
    ).length

    const mapped = incidents.filter(
      (item) =>
        item.latitude !== null &&
        item.latitude !== undefined &&
        item.longitude !== null &&
        item.longitude !== undefined
    ).length

    const unmapped = incidents.length - mapped

    const locationCount = new Set(
      incidents
        .map((item) =>
          String(item.location || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ).size

    const types = {}

    incidents.forEach((item) => {
      const type =
        item.disaster_type || "Unknown"

      types[type] = (types[type] || 0) + 1
    })

    const dominantType =
      Object.entries(types)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "No data"

    return {
      total: incidents.length,
      critical,
      high,
      medium,
      mapped,
      unmapped,
      locationCount,
      dominantType,
    }
  }, [incidents])


  // ==========================================================
  // AI / DECISION SUPPORT
  // ==========================================================

  const intelligence = useMemo(() => {
    if (incidents.length === 0) {
      return {
        readiness: 0,
        priority: "No active intelligence",
        priorityClass: "text-slate-600",
        message:
          "Waiting for live disaster records from the response database.",
        topIncident: null,
      }
    }

    const topIncident = [...incidents].sort(
      (a, b) => {
        const severityDifference =
          severityRank(b.severity) -
          severityRank(a.severity)

        if (severityDifference !== 0) {
          return severityDifference
        }

        return Number(b.id || 0) -
          Number(a.id || 0)
      }
    )[0]

    const criticalPenalty =
      Math.min(stats.critical * 12, 48)

    const highPenalty =
      Math.min(stats.high * 5, 25)

    const mappingPenalty =
      stats.total > 0
        ? Math.round(
            (stats.unmapped /
              stats.total) *
              15
          )
        : 0

    const readiness = Math.max(
      0,
      Math.min(
        100,
        100 -
          criticalPenalty -
          highPenalty -
          mappingPenalty
      )
    )

    let priority = "Routine Monitoring"
    let priorityClass = "text-emerald-700"
    let message =
      "Current incident load is within the normal monitoring range."

    if (stats.critical > 0) {
      priority = "Immediate Attention"
      priorityClass = "text-red-700"
      message =
        `${stats.critical} critical incident${
          stats.critical > 1 ? "s" : ""
        } detected. Response teams should review these locations first.`
    } else if (stats.high > 0) {
      priority = "High Response Priority"
      priorityClass = "text-orange-700"
      message =
        `${stats.high} high-severity incident${
          stats.high > 1 ? "s" : ""
        } require active response monitoring.`
    } else if (stats.unmapped > 0) {
      priority = "Mapping Required"
      priorityClass = "text-amber-700"
      message =
        `${stats.unmapped} incident${
          stats.unmapped > 1 ? "s are" : " is"
        } missing coordinates and may need location verification.`
    }

    return {
      readiness,
      priority,
      priorityClass,
      message,
      topIncident,
    }
  }, [incidents, stats])


  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // ==========================================================
  // CREATE
  // ==========================================================

  const openCreateForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError("")
    setShowForm(true)
  }


  // ==========================================================
  // EDIT
  // ==========================================================

  const openEditForm = (incident) => {
    setEditingId(incident.id)

    setForm({
      disaster_type:
        incident.disaster_type || "",

      location:
        incident.location || "",

      latitude:
        incident.latitude !== null &&
        incident.latitude !== undefined
          ? String(incident.latitude)
          : "",

      longitude:
        incident.longitude !== null &&
        incident.longitude !== undefined
          ? String(incident.longitude)
          : "",

      severity:
        incident.severity || "High",

      description:
        incident.description || "",
    })

    setError("")
    setShowForm(true)
  }


  // ==========================================================
  // CLOSE FORM
  // ==========================================================

  const closeForm = () => {
    if (saving) return

    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)
      setError("")

      if (!form.disaster_type.trim()) {
        throw new Error(
          "Disaster type is required"
        )
      }

      if (!form.location.trim()) {
        throw new Error(
          "Location is required"
        )
      }

      if (!form.severity.trim()) {
        throw new Error(
          "Severity is required"
        )
      }

      const payload = {
        disaster_type:
          form.disaster_type.trim(),

        location:
          form.location.trim(),

        severity:
          form.severity.trim(),

        description:
          form.description.trim() || null,
      }


      // Latitude

      if (form.latitude.trim() !== "") {
        const latitude =
          Number(form.latitude)

        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90
        ) {
          throw new Error(
            "Latitude must be between -90 and 90"
          )
        }

        payload.latitude = latitude
      } else {
        payload.latitude = null
      }


      // Longitude

      if (form.longitude.trim() !== "") {
        const longitude =
          Number(form.longitude)

        if (
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw new Error(
            "Longitude must be between -180 and 180"
          )
        }

        payload.longitude = longitude
      } else {
        payload.longitude = null
      }


      // Update

      if (editingId !== null) {
        const updated =
          await updateDisaster(
            editingId,
            payload
          )

        setIncidents((current) =>
          current.map((incident) =>
            incident.id === editingId
              ? updated
              : incident
          )
        )
      }

      // Create

      else {
        const created =
          await createDisaster(payload)

        setIncidents((current) => [
          ...current,
          created,
        ])
      }

      closeForm()

    } catch (err) {
      console.error(
        "Incident save error:",
        err
      )

      setError(
        err?.message ||
          "Failed to save incident"
      )
    } finally {
      setSaving(false)
    }
  }


  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this disaster incident?"
    )

    if (!confirmed) return

    try {
      setDeletingId(id)
      setError("")

      await deleteDisaster(id)

      setIncidents((current) =>
        current.filter(
          (incident) =>
            incident.id !== id
        )
      )

      if (
        selectedIncident?.id === id
      ) {
        setSelectedIncident(null)
      }

    } catch (err) {
      console.error(
        "Delete incident error:",
        err
      )

      setError(
        err?.message ||
          "Failed to delete incident"
      )
    } finally {
      setDeletingId(null)
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen">

      <div className="mx-auto max-w-[1550px]">

        {/* ==================================================
            COMMAND HEADER
        ================================================== */}

        <div className="relative mb-7 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-6 text-white shadow-xl">

          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-3 flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Siren size={19} />
                </div>

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-100">
                  {t("emergencyOperationsCenter")}
                </span>

                <span className="ml-1 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  {t("liveSystem")}
                </span>

              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("incidentsTitle")}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100">
                {t("realTimeMonitoring")}
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={loadIncidents}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                {t("refreshIntelligence")}
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-red-700 shadow-lg transition hover:bg-red-50"
              >
                <Plus size={17} />

                {t("registerIncident")}
              </button>

            </div>

          </div>

        </div>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">

            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p className="font-semibold">
                {t("operationFailed")}
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

          </div>
        )}


        {/* ==================================================
            AI INTELLIGENCE PANEL
        ================================================== */}

        <div className="mb-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 via-white to-white px-5 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                  <BrainCircuit size={21} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900">
                      {t("aiSituationIntelligence")}
                    </h2>

                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700">
                      {t("liveIntelligence")}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("decisionSupportSignals")}
                  </p>
                </div>

              </div>


              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">

                <Activity
                  size={15}
                  className="text-red-600"
                />

                <span className="text-xs font-semibold text-slate-600">
                  {t("operationalReadiness")}
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {intelligence.readiness}%
                </span>

              </div>

            </div>

          </div>


          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">

            <IntelligenceSignal
              icon={Target}
              title={t("responsePriority")}
              value={intelligence.priority}
              description={
                intelligence.message
              }
              tone={
                stats.critical > 0
                  ? "red"
                  : stats.high > 0
                    ? "orange"
                    : "green"
              }
            />

            <IntelligenceSignal
              icon={Crosshair}
              title={t("priorityIncident")}
              value={
                intelligence.topIncident
                  ? `#${intelligence.topIncident.id}`
                  : "—"
              }
              description={
                intelligence.topIncident
                  ? `${intelligence.topIncident.disaster_type || t("unknown")} · ${intelligence.topIncident.location || t("locationUnavailable")}`
                  : t("noIncidentRecordsAvailable")
              }
              tone="red"
            />

            <IntelligenceSignal
              icon={Navigation}
              title={t("locationIntelligence")}
              value={`${stats.mapped}/${stats.total}`}
              description={
                stats.total === 0
                  ? t("noIncidentCoordinates")
                  : t("validMapCoordinates", {
                      count: stats.mapped,
                    })
              }
              tone={
                stats.unmapped > 0
                  ? "orange"
                  : "green"
              }
            />

            <IntelligenceSignal
              icon={Radio}
              title={t("incidentPattern")}
              value={stats.dominantType}
              description={
                stats.total > 0
                  ? t("dominantPattern", {
                      count: stats.locationCount,
                    })
                  : t("waitingForBackendRecords")
              }
              tone="slate"
            />

          </div>

        </div>


        {/* ==================================================
            STATISTICS
        ================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title={t("totalIncidents")}
            value={stats.total}
            description={t("liveBackendRecords")}
            icon={ShieldAlert}
            iconWrapper="bg-slate-100 text-slate-700"
            accent="slate"
          />

          <StatCard
            title={t("severityCritical")}
            value={stats.critical}
            description={t("immediateAttentionRequired")}
            icon={AlertTriangle}
            iconWrapper="bg-red-50 text-red-600"
            accent="red"
          />

          <StatCard
            title={t("highSeverity")}
            value={stats.high}
            description={t("highPriorityResponseAreas")}
            icon={Target}
            iconWrapper="bg-orange-50 text-orange-600"
            accent="orange"
          />

          <StatCard
            title={t("severityModerate")}
            value={stats.medium}
            description={t("activeMonitoringRequired")}
            icon={Activity}
            iconWrapper="bg-amber-50 text-amber-600"
            accent="amber"
          />

        </div>


        {/* ==================================================
            QUICK OPERATIONAL STATUS
        ================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("databaseLabel")}
                </p>

                <p className="mt-0.5 font-bold text-slate-900">
                  {t("liveConnected")}
                </p>
              </div>

            </div>

            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

          </div>


          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <MapPin size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("geoCoverage")}
                </p>

                <p className="mt-0.5 font-bold text-slate-900">
                  {t("mappedLabel", { count: stats.mapped })}
                </p>
              </div>

            </div>

            <span className="text-xs font-semibold text-slate-400">
              {t("unmappedLabel", { count: stats.unmapped })}
            </span>

          </div>


          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Sparkles size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("intelligenceLabel")}
                </p>

                <p className="mt-0.5 font-bold text-slate-900">
                  {t("statusActive")}
                </p>
              </div>

            </div>

            <span className="text-xs font-semibold text-orange-600">
              {t("liveSignals")}
            </span>

          </div>

        </div>


        {/* ==================================================
            FILTER BAR
        ================================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2">

              <Search
                size={16}
                className="text-red-500"
              />

              <span className="text-sm font-bold text-slate-800">
                {t("incidentSearchFiltering")}
              </span>

            </div>

            <span className="text-xs text-slate-400">
              {t(
                filteredIncidents.length === 1
                  ? "matchingRecords"
                  : "matchingRecordsPlural",
                { count: filteredIncidents.length }
              )}
            </span>

          </div>


          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_190px]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={t("searchIncidentPlaceholder")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
              />

            </div>


            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              <option value="All">
                {t("allSeverities")}
              </option>

              <option value="Critical">
                {t("severityCritical")}
              </option>

              <option value="High">
                {t("severityHigh")}
              </option>

              <option value="Moderate">
                {t("severityModerate")}
              </option>

              <option value="Low">
                {t("severityLow")}
              </option>
            </select>


            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              <option value="All">
                {t("allDisasterTypes")}
              </option>

              {disasterTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>

          </div>

        </div>


        {/* ==================================================
            FORM
        ================================================== */}

        {showForm && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
                  {editingId !== null ? (
                    <Pencil size={18} />
                  ) : (
                    <Plus size={19} />
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    {editingId !== null
                      ? t("editDisasterIncident")
                      : t("registerNewDisaster")}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {t("changesSavedBackend")}
                  </p>
                </div>

              </div>


              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                <X size={19} />
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("disasterTypeFormLabel")}
                  </label>

                  <select
                    name="disaster_type"
                    value={form.disaster_type}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="">
                      {t("selectDisasterType")}
                    </option>

                    <option value="Flood">
                      {t("flood")}
                    </option>

                    <option value="Earthquake">
                      {t("earthquake")}
                    </option>

                    <option value="Cyclone">
                      {t("cyclone")}
                    </option>

                    <option value="Fire">
                      {t("fire")}
                    </option>

                    <option value="Landslide">
                      {t("landslide")}
                    </option>

                    <option value="Tsunami">
                      {t("tsunami")}
                    </option>

                    <option value="Drought">
                      {t("drought")}
                    </option>

                    <option value="Other">
                      {t("other")}
                    </option>
                  </select>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("locationLabel")}
                  </label>

                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    placeholder={t("locationFormPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>


                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("latitudeLabel")}
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder={t("latitudePlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    {t("latitudeRange")}
                  </p>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("longitudeLabel")}
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder={t("longitudePlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    {t("longitudeRangeHint")}
                  </p>
                </div>

              </div>


              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("severityLabel")}
                </label>

                <select
                  name="severity"
                  value={form.severity}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 md:w-1/2"
                >
                <option value="Low">
                    {t("severityLow")}
                  </option>

                  <option value="Moderate">
                    {t("severityModerate")}
                  </option>

                  <option value="High">
                    {t("severityHigh")}
                  </option>

                  <option value="Critical">
                    {t("severityCritical")}
                  </option>
                </select>
              </div>


              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("descriptionLabel")}
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder={t("descriptionFormPlaceholder")}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>


              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? t("saving")
                    : editingId !== null
                      ? t("updateIncident")
                      : t("createIncident")}
                </button>

              </div>

            </form>

          </div>
        )}


        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <BrainCircuit
                size={28}
                className="animate-pulse"
              />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-700">
              {t("initializingIncident")}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {t("syncingDisasterRecords")}
            </p>

          </div>
        )}


        {/* ==================================================
            EMPTY
        ================================================== */}

        {!loading &&
          filteredIncidents.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ShieldAlert size={30} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {t("noIncidentsFound")}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {incidents.length === 0
                  ? t("noDisasterRecordsBackend")
                  : t("adjustFilters")}
              </p>

              {incidents.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                >
                  <Plus size={16} />
                  {t("addFirstIncident")}
                </button>
              )}

            </div>
          )}


        {/* ==================================================
            INCIDENT TABLE
        ================================================== */}

        {!loading &&
          filteredIncidents.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <Crosshair size={16} />
                    </div>

                    <h2 className="font-bold text-slate-900">
                      {t("incidentRegistry")}
                    </h2>

                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {t("showingRecords", {
                      shown: filteredIncidents.length,
                      total: incidents.length,
                    })}
                  </p>

                </div>


                <div className="flex items-center gap-2">

                  <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    {t("liveDatabaseBadge")}
                  </div>

                  <div className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                    {t("criticalCount", { count: stats.critical })}
                  </div>

                </div>

              </div>


              <div className="overflow-x-auto">

                <table className="w-full min-w-[1150px]">

                  <thead className="bg-slate-50">

                    <tr className="border-b border-slate-200">

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("incidentHeader")}
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("locationLabel")}
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("coordinatesHeader")}
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("severityLabel")}
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("intelligenceHeader")}
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("actions")}
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {filteredIncidents.map(
                      (incident) => {

                        const severity =
                          severityValue(
                            incident.severity
                          )

                        const mapped =
                          incident.latitude !==
                            null &&
                          incident.latitude !==
                            undefined &&
                          incident.longitude !==
                            null &&
                          incident.longitude !==
                            undefined

                        return (
                          <tr
                            key={incident.id}
                            className="group transition hover:bg-red-50/30"
                          >

                            {/* Incident */}

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <DisasterIcon
                                  type={
                                    incident.disaster_type
                                  }
                                />

                                <div>

                                  <p className="font-semibold text-slate-900">
                                    {incident.disaster_type ||
                                      "Unknown"}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    {t("incidentNumber", {
                                      id: incident.id,
                                    })}
                                  </p>

                                </div>

                              </div>

                            </td>


                            {/* Location */}

                            <td className="px-5 py-4">

                              <div className="flex max-w-[220px] items-center gap-2 text-sm text-slate-700">

                                <MapPin
                                  size={15}
                                  className="shrink-0 text-red-500"
                                />

                                <span className="truncate">
                                  {incident.location ||
                                    t("notSpecified")}
                                </span>

                              </div>

                            </td>


                            {/* Coordinates */}

                            <td className="px-5 py-4">

                              {mapped ? (
                                <div className="flex items-center gap-2">

                                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">

                                    <p className="font-mono text-xs text-slate-600">
                                      {Number(
                                        incident.latitude
                                      ).toFixed(4)}
                                    </p>

                                    <p className="font-mono text-xs text-slate-400">
                                      {Number(
                                        incident.longitude
                                      ).toFixed(4)}
                                    </p>

                                  </div>

                                  <Navigation
                                    size={14}
                                    className="text-emerald-500"
                                  />

                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                                  <MapPin size={13} />
                                  {t("notMapped")}
                                </span>
                              )}

                            </td>


                            {/* Severity */}

                            <td className="px-5 py-4">

                              <StatusBadge
                                status={
                                  incident.severity ||
                                  "Unknown"
                                }
                              />

                            </td>


                            {/* Intelligence */}

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2">

                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    severity === "critical"
                                      ? "bg-red-100 text-red-600"
                                      : severity === "high"
                                        ? "bg-orange-100 text-orange-600"
                                        : severity === "medium" ||
                                            severity ===
                                              "moderate"
                                          ? "bg-amber-100 text-amber-600"
                                          : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <BrainCircuit size={15} />
                                </div>

                                <div>

                                  <p className="text-xs font-bold text-slate-700">
                                    {severity ===
                                    "critical"
                                      ? t("immediateReview")
                                      : severity ===
                                          "high"
                                        ? t("priorityReviewLabel")
                                        : severity ===
                                              "medium" ||
                                            severity ===
                                              "moderate"
                                          ? t("monitorLabel")
                                          : t("routineLabel")}
                                  </p>

                                  <p className="text-[11px] text-slate-400">
                                    {mapped
                                      ? t("locationVerified")
                                      : t("locationMappingNeeded")}
                                  </p>

                                </div>

                              </div>

                            </td>


                            {/* Actions */}

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedIncident(
                                      incident
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                                  title={t("viewDetailsTooltip")}
                                >
                                  <Eye size={16} />
                                </button>


                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditForm(
                                      incident
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    incident.id
                                  }
                                  className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                                  title={t("editIncidentTooltip")}
                                >
                                  <Pencil size={16} />
                                </button>


                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      incident.id
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    incident.id
                                  }
                                  className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                  title={t("deleteIncidentTooltip")}
                                >
                                  {deletingId ===
                                  incident.id ? (
                                    <RefreshCw
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={16}
                                    />
                                  )}
                                </button>

                              </div>

                            </td>

                          </tr>
                        )
                      }
                    )}

                  </tbody>

                </table>

              </div>


              <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">

                <span>
                  {t("liveRecordsLoaded")}
                </span>

                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t("backendSynchronized")}
                </span>

              </div>

            </div>
          )}

      </div>


      {/* ====================================================
          DETAILS MODAL
      ==================================================== */}

      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="relative overflow-hidden border-b border-red-100 bg-gradient-to-br from-red-700 to-red-600 px-6 py-5 text-white">

              <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />

              <div className="relative flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <DisasterIcon
                    type={
                      selectedIncident.disaster_type
                    }
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-100">
                      {t("incidentsTitle")}
                    </p>

                    <h2 className="mt-0.5 font-bold">
                      {t("incidentNumber", {
                        id: selectedIncident.id,
                      })}
                    </h2>
                  </div>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedIncident(null)
                  }
                  className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X size={19} />
                </button>

              </div>

            </div>


            <div className="space-y-5 p-6">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("disasterTypeFormLabel")}
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {selectedIncident.disaster_type ||
                      t("unknown")}
                  </p>

                </div>


                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("severityLabel")}
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        selectedIncident.severity ||
                        "Unknown"
                      }
                    />
                  </div>

                </div>

              </div>


              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("locationLabel")}
                </p>

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-medium text-slate-800">

                  <MapPin
                    size={17}
                    className="shrink-0 text-red-500"
                  />

                  {selectedIncident.location ||
                    t("notSpecified")}

                </div>

              </div>


              <div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("geospatialPosition")}
                </p>

                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">

                  <Navigation
                    size={17}
                    className="text-red-500"
                  />

                  <span className="font-mono text-sm text-slate-700">
                    {selectedIncident.latitude !==
                      null &&
                    selectedIncident.latitude !==
                      undefined
                      ? Number(
                          selectedIncident.latitude
                        ).toFixed(6)
                      : "—"}

                    {" , "}

                    {selectedIncident.longitude !==
                      null &&
                    selectedIncident.longitude !==
                      undefined
                      ? Number(
                          selectedIncident.longitude
                        ).toFixed(6)
                      : "—"}
                  </span>

                </div>

              </div>


              <div>

                <div className="mb-2 flex items-center gap-2">

                  <BrainCircuit
                    size={15}
                    className="text-red-600"
                  />

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("responseIntelligence")}
                  </p>

                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                  <p className="text-sm font-semibold text-red-800">
                    {isCritical(
                      selectedIncident.severity
                    )
                      ? t("immediateResponseAttention")
                      : isHigh(
                            selectedIncident.severity
                          )
                        ? t("highPriorityMonitoring")
                        : isMedium(
                              selectedIncident.severity
                            )
                          ? t("maintainMonitoring")
                          : t("continueRoutineMonitoring")}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700/80">
                    {t("signalDerived")}
                  </p>

                </div>

              </div>


              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("descriptionLabel")}
                </p>

                <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {selectedIncident.description ||
                    t("noDescriptionProvided")}
                </p>

              </div>

            </div>


            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={() => {
                  setSelectedIncident(null)
                  openEditForm(
                    selectedIncident
                  )
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Pencil size={15} />
                {t("editIncidentTitle")}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default Incidents