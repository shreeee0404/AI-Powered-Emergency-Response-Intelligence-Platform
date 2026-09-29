import { useEffect, useMemo, useState } from "react"
import {
  Siren,
  MapPin,
  Users,
  Phone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  X,
  Send,
  Eye,
  Filter,
  Navigation,
} from "lucide-react"

import {
  createSOS,
  getSOSRequests,
  updateSOSStatus,
  deleteSOSRequest,
} from "../services/api"

// ============================================================
// USER / ROLE HELPERS
// ============================================================

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("current_user") || "null"
    )
  } catch {
    return null
  }
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

function getUserRole(user) {
  return normalizeRole(
    user?.role ||
    user?.user_role ||
    user?.role_name ||
    user?.type ||
    ""
  )
}

function isAdminRole(role) {
  return (
    role === "admin" ||
    role === "administrator"
  )
}

function isCoordinatorRole(role) {
  return (
    role === "emergency coordinator" ||
    role === "emergencycoordinator" ||
    role === "coordinator"
  )
}

function isFieldTeamRole(role) {
  return (
    role === "field team" ||
    role === "fieldteam" ||
    role === "field_team"
  )
}

// ============================================================
// CONSTANTS
// ============================================================

const NEEDS_OPTIONS = [
  "Food",
  "Water",
  "Medical",
  "Shelter",
  "Rescue",
  "Evacuation",
]

const SEVERITY_COLORS = {
  Critical:
    "bg-red-100 text-red-700 border-red-200",

  High:
    "bg-orange-100 text-orange-700 border-orange-200",

  Medium:
    "bg-yellow-100 text-yellow-700 border-yellow-200",

  Low:
    "bg-green-100 text-green-700 border-green-200",
}

const STATUS_COLORS = {
  Pending:
    "bg-red-100 text-red-700",

  Acknowledged:
    "bg-blue-100 text-blue-700",

  Resolved:
    "bg-green-100 text-green-700",
}

// ============================================================
// EMPTY FORM
// ============================================================

function getEmptyForm() {
  return {
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    people_count: "1",
    needs: [],
    description: "",
    contact: "",
    severity: "High",
  }
}

// ============================================================
// FIELD COMPONENT
// ============================================================

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  )
}

// ============================================================
// MAIN SOS PAGE
// ============================================================

export default function SOSPage() {
  const user = getCurrentUser()

  const role = getUserRole(user)

  const isAdmin = isAdminRole(role)

  const isCoordinator =
    isCoordinatorRole(role)

  const isFieldTeam =
    isFieldTeamRole(role)

  /*
   * IMPORTANT ROLE LOGIC
   *
   * Admin:
   * - Create SOS
   * - View SOS
   * - Acknowledge
   * - Resolve
   * - Delete
   *
   * Emergency Coordinator:
   * - Create SOS
   * - View SOS
   * - Acknowledge
   * - Resolve
   * - Delete
   *
   * Field Team:
   * - View SOS
   * - Acknowledge
   * - Resolve
   * - NO CREATE
   * - NO DELETE
   */

  const canCreate =
    isAdmin || isCoordinator

  const canManage =
    isAdmin ||
    isCoordinator ||
    isFieldTeam

  const canDelete =
    isAdmin ||
    isCoordinator

  // Admin/Coordinator start with Create tab.
  // Field Team starts directly on View tab.
  const [tab, setTab] = useState(
    canCreate ? "submit" : "manage"
  )

  // ==========================================================
  // CREATE SOS FORM
  // ==========================================================

  const [form, setForm] =
    useState(getEmptyForm())

  const [submitting, setSubmitting] =
    useState(false)

  const [submitSuccess, setSubmitSuccess] =
    useState(false)

  const [submitError, setSubmitError] =
    useState("")

  // ==========================================================
  // SOS REQUESTS
  // ==========================================================

  const [requests, setRequests] =
    useState([])

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  const [statusFilter, setStatusFilter] =
    useState("All")

  const [selectedSOS, setSelectedSOS] =
    useState(null)

  const [updatingId, setUpdatingId] =
    useState(null)

  const [deletingId, setDeletingId] =
    useState(null)

  // ==========================================================
  // LOAD SOS REQUESTS
  // ==========================================================

  const loadRequests = async () => {
    if (!canManage) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const data =
        await getSOSRequests()

      setRequests(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (err) {
      setError(
        err?.message ||
        "Failed to load SOS requests."
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (canManage) {
      loadRequests()
    }
  }, [canManage])

  // ==========================================================
  // CURRENT LOCATION
  // ADMIN / COORDINATOR ONLY
  // ==========================================================

  const getCurrentLocation = () => {
    if (!canCreate) {
      return
    }

    if (!navigator.geolocation) {
      setSubmitError(
        "Geolocation is not supported by this browser."
      )
      return
    }

    setSubmitError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude.toFixed(6)

        const longitude =
          position.coords.longitude.toFixed(6)

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
        }))
      },
      (err) => {
        let message =
          "Unable to get your current location."

        if (err.code === 1) {
          message =
            "Location permission was denied. Please allow location access."
        }

        if (err.code === 2) {
          message =
            "Your location could not be determined."
        }

        if (err.code === 3) {
          message =
            "Location request timed out. Please try again."
        }

        setSubmitError(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  // ==========================================================
  // CREATE / SUBMIT SOS
  // ADMIN + COORDINATOR ONLY
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!canCreate) {
      return
    }

    setSubmitError("")
    setSubmitSuccess(false)

    if (!form.name.trim()) {
      setSubmitError(
        "Name is required."
      )
      return
    }

    if (!form.location.trim()) {
      setSubmitError(
        "Location is required."
      )
      return
    }

    if (
      Number(form.people_count) < 1
    ) {
      setSubmitError(
        "People count must be at least 1."
      )
      return
    }

    if (
      form.latitude &&
      (
        Number.isNaN(
          Number(form.latitude)
        ) ||
        Number(form.latitude) < -90 ||
        Number(form.latitude) > 90
      )
    ) {
      setSubmitError(
        "Please enter a valid latitude."
      )
      return
    }

    if (
      form.longitude &&
      (
        Number.isNaN(
          Number(form.longitude)
        ) ||
        Number(form.longitude) < -180 ||
        Number(form.longitude) > 180
      )
    ) {
      setSubmitError(
        "Please enter a valid longitude."
      )
      return
    }

    setSubmitting(true)

    try {
      await createSOS({
        name:
          form.name.trim(),

        location:
          form.location.trim(),

        latitude:
          form.latitude
            ? Number(form.latitude)
            : null,

        longitude:
          form.longitude
            ? Number(form.longitude)
            : null,

        people_count:
          Number(form.people_count),

        needs:
          form.needs.join(","),

        description:
          form.description.trim(),

        contact:
          form.contact.trim(),

        severity:
          form.severity,
      })

      setSubmitSuccess(true)

      setForm(
        getEmptyForm()
      )

      await loadRequests()

    } catch (err) {
      setSubmitError(
        err?.message ||
        "Failed to submit SOS request."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================================
  // NEED SELECTION
  // ==========================================================

  const toggleNeed = (need) => {
    if (!canCreate) {
      return
    }

    setForm((current) => ({
      ...current,

      needs:
        current.needs.includes(need)
          ? current.needs.filter(
              (item) =>
                item !== need
            )
          : [
              ...current.needs,
              need,
            ],
    }))
  }

  // ==========================================================
  // ACKNOWLEDGE / RESOLVE
  // FIELD TEAM + ADMIN + COORDINATOR
  // ==========================================================

  const handleStatusUpdate = async (
    id,
    status
  ) => {
    if (!canManage) {
      return
    }

    setUpdatingId(id)
    setError("")

    try {
      await updateSOSStatus(
        id,
        status
      )

      await loadRequests()

      if (
        selectedSOS?.id === id
      ) {
        setSelectedSOS(
          (current) => ({
            ...current,
            status,
          })
        )
      }

    } catch (err) {
      setError(
        err?.message ||
        "Failed to update SOS status."
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // ==========================================================
  // DELETE
  // ADMIN + COORDINATOR ONLY
  // ==========================================================

  const handleDelete = async (id) => {
    if (!canDelete) {
      return
    }

    const confirmed =
      window.confirm(
        `Delete SOS request #${id}?`
      )

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setError("")

    try {
      await deleteSOSRequest(id)

      await loadRequests()

      if (
        selectedSOS?.id === id
      ) {
        setSelectedSOS(null)
      }

    } catch (err) {
      setError(
        err?.message ||
        "Failed to delete SOS request."
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredRequests =
    useMemo(() => {
      if (
        statusFilter === "All"
      ) {
        return requests
      }

      return requests.filter(
        (request) =>
          request.status ===
          statusFilter
      )
    }, [
      requests,
      statusFilter,
    ])

  const pendingCount =
    requests.filter(
      (request) =>
        request.status ===
        "Pending"
    ).length

  // ==========================================================
  // CREATE SOS SECTION
  // ==========================================================

  const SubmitSOSSection = (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">

        <div className="p-3 rounded-xl bg-red-50">
          <Siren
            size={22}
            className="text-red-600"
          />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-800">
            Create Emergency SOS
          </h2>

          <p className="text-sm text-slate-500 mt-0.5">
            Create and register a new emergency SOS request.
          </p>
        </div>

      </div>

      <div className="p-6">

        {submitSuccess ? (

          <div className="flex flex-col items-center gap-4 py-12 text-center">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2
                size={40}
                className="text-green-600"
              />
            </div>

            <h3 className="text-2xl font-black text-slate-800">
              SOS Created Successfully
            </h3>

            <p className="text-slate-500 max-w-md">
              The emergency SOS request has been created and is now visible to response teams.
            </p>

            <button
              type="button"
              onClick={() =>
                setSubmitSuccess(false)
              }
              className="mt-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700"
            >
              Create Another SOS
            </button>

          </div>

        ) : (

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >

            {submitError && (
              <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

                <AlertTriangle
                  size={18}
                />

                <span>
                  {submitError}
                </span>

              </div>
            )}

            {/* NAME */}

            <Field label="Affected Person Name *">

              <input
                className="input-field"
                placeholder="Full name"
                value={form.name}
                onChange={(e) =>
                  setForm(
                    (current) => ({
                      ...current,
                      name:
                        e.target.value,
                    })
                  )
                }
                required
              />

            </Field>

            {/* LOCATION */}

            <Field label="Emergency Location *">

              <div className="relative">

                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  className="input-field pl-9"
                  placeholder="Village, district, landmark"
                  value={
                    form.location
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        location:
                          e.target.value,
                      })
                    )
                  }
                  required
                />

              </div>

            </Field>

            {/* PEOPLE */}

            <Field label="Number of People *">

              <div className="relative">

                <Users
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  min="1"
                  className="input-field pl-9"
                  value={
                    form.people_count
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        people_count:
                          e.target.value,
                      })
                    )
                  }
                  required
                />

              </div>

            </Field>

            {/* CONTACT */}

            <Field label="Contact Number">

              <div className="relative">

                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  className="input-field pl-9"
                  placeholder="Phone number"
                  value={
                    form.contact
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        contact:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

            </Field>

            {/* SEVERITY */}

            <Field label="Severity">

              <select
                className="input-field"
                value={
                  form.severity
                }
                onChange={(e) =>
                  setForm(
                    (current) => ({
                      ...current,
                      severity:
                        e.target.value,
                    })
                  )
                }
              >

                <option value="Critical">
                  Critical
                </option>

                <option value="High">
                  High
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Low">
                  Low
                </option>

              </select>

            </Field>

            {/* GPS */}

            <Field label="GPS Coordinates">

              <div className="flex gap-2">

                <input
                  className="input-field"
                  placeholder="Latitude"
                  value={
                    form.latitude
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        latitude:
                          e.target.value,
                      })
                    )
                  }
                />

                <input
                  className="input-field"
                  placeholder="Longitude"
                  value={
                    form.longitude
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        longitude:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

              <button
                type="button"
                onClick={
                  getCurrentLocation
                }
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >

                <Navigation
                  size={14}
                />

                Use Current Location

              </button>

            </Field>

            {/* NEEDS */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Immediate Needs
              </label>

              <div className="flex flex-wrap gap-2">

                {NEEDS_OPTIONS.map(
                  (need) => (

                    <button
                      key={need}
                      type="button"
                      onClick={() =>
                        toggleNeed(
                          need
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                        form.needs.includes(
                          need
                        )
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-red-400"
                      }`}
                    >
                      {need}
                    </button>

                  )
                )}

              </div>

            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Description
              </label>

              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Describe the emergency situation..."
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm(
                    (current) => ({
                      ...current,
                      description:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            {/* SUBMIT */}

            <div className="md:col-span-2 flex justify-end">

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 font-black text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-60"
              >

                {submitting ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={18} />
                )}

                {submitting
                  ? "Creating..."
                  : "Create SOS Request"}

              </button>

            </div>

          </form>

        )}

      </div>

    </div>
  )

  // ==========================================================
  // VIEW SOS SECTION
  // ALL ROLES WITH SOS ACCESS
  // ==========================================================

  const ManageSOSSection = (
    <div className="space-y-4">

      {/* ERROR */}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <AlertTriangle
            size={18}
          />

          {error}

          <button
            onClick={() =>
              setError("")
            }
            className="ml-auto"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* STATS */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase text-slate-400">
            Total SOS
          </p>

          <p className="mt-2 text-3xl font-black text-slate-800">
            {requests.length}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase text-slate-400">
            Pending
          </p>

          <p className="mt-2 text-3xl font-black text-red-600">
            {
              requests.filter(
                (r) =>
                  r.status ===
                  "Pending"
              ).length
            }
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase text-slate-400">
            Acknowledged
          </p>

          <p className="mt-2 text-3xl font-black text-blue-600">
            {
              requests.filter(
                (r) =>
                  r.status ===
                  "Acknowledged"
              ).length
            }
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase text-slate-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-black text-green-600">
            {
              requests.filter(
                (r) =>
                  r.status ===
                  "Resolved"
              ).length
            }
          </p>

        </div>

      </div>

      {/* FILTER + REFRESH */}

      <div className="flex flex-wrap items-center gap-3">

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">

          <Filter
            size={15}
            className="text-slate-400"
          />

          <select
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
            value={
              statusFilter
            }
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >

            <option value="All">
              All
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Acknowledged">
              Acknowledged
            </option>

            <option value="Resolved">
              Resolved
            </option>

          </select>

        </div>

        <button
          onClick={
            loadRequests
          }
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >

          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

      </div>

      {/* SOS TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (

          <div className="flex items-center justify-center py-16">

            <RefreshCw
              size={28}
              className="animate-spin text-red-500"
            />

          </div>

        ) : filteredRequests.length === 0 ? (

          <div className="py-16 text-center">

            <Siren
              size={40}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-bold text-slate-600">
              No SOS requests found
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr>

                  {[
                    "#",
                    "Name",
                    "Location",
                    "People",
                    "Needs",
                    "Severity",
                    "Status",
                    "Time",
                    "Actions",
                  ].map(
                    (heading) => (

                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-[11px] font-black uppercase text-slate-500 whitespace-nowrap"
                      >
                        {heading}
                      </th>

                    )
                  )}

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredRequests.map(
                  (sos) => (

                    <tr
                      key={sos.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="px-4 py-3 font-black text-slate-500">
                        #{sos.id}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-800">
                        {sos.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">

                        <div className="flex items-center gap-1">

                          <MapPin
                            size={13}
                            className="text-slate-400"
                          />

                          {sos.location}

                        </div>

                      </td>

                      <td className="px-4 py-3 font-black text-slate-800">
                        {sos.people_count}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">
                        {sos.needs ||
                          "—"}
                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                            SEVERITY_COLORS[
                              sos.severity
                            ] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {sos.severity}
                        </span>

                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            STATUS_COLORS[
                              sos.status
                            ] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {sos.status}
                        </span>

                      </td>

                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">

                        {sos.timestamp
                          ? new Date(
                              sos.timestamp
                            ).toLocaleString(
                              "en-IN",
                              {
                                dateStyle:
                                  "short",
                                timeStyle:
                                  "short",
                              }
                            )
                          : "—"}

                      </td>

                      {/* ACTIONS */}

                      <td className="px-4 py-3">

                        <div className="flex flex-wrap gap-1.5">

                          {/* VIEW */}

                          <button
                            onClick={() =>
                              setSelectedSOS(
                                sos
                              )
                            }
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                            title="View SOS"
                          >

                            <Eye
                              size={14}
                            />

                          </button>

                          {/* ACKNOWLEDGE */}

                          {sos.status ===
                            "Pending" && (

                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  sos.id,
                                  "Acknowledged"
                                )
                              }
                              disabled={
                                updatingId ===
                                sos.id
                              }
                              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >

                              {updatingId ===
                              sos.id ? (
                                <RefreshCw
                                  size={12}
                                  className="animate-spin"
                                />
                              ) : (
                                "Acknowledge"
                              )}

                            </button>

                          )}

                          {/* RESOLVE */}

                          {sos.status !==
                            "Resolved" && (

                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  sos.id,
                                  "Resolved"
                                )
                              }
                              disabled={
                                updatingId ===
                                sos.id
                              }
                              className="rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-black text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >

                              {updatingId ===
                              sos.id ? (
                                <RefreshCw
                                  size={12}
                                  className="animate-spin"
                                />
                              ) : (
                                "Resolve"
                              )}

                            </button>

                          )}

                          {/* DELETE
                              ADMIN + COORDINATOR ONLY */}

                          {canDelete && (

                            <button
                              onClick={() =>
                                handleDelete(
                                  sos.id
                                )
                              }
                              disabled={
                                deletingId ===
                                sos.id
                              }
                              className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              title="Delete SOS"
                            >

                              {deletingId ===
                              sos.id ? (
                                <RefreshCw
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={14}
                                />
                              )}

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          SELECTED SOS DETAILS
          ====================================================== */}

      {selectedSOS && (

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-red-500">
                Emergency Request
              </p>

              <h3 className="font-black text-red-900">
                SOS #{selectedSOS.id}
              </h3>

            </div>

            <button
              onClick={() =>
                setSelectedSOS(null)
              }
              className="rounded-lg p-1.5 text-red-700 hover:bg-red-100"
            >
              <X size={18} />
            </button>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

            {[
              [
                "Name",
                selectedSOS.name,
              ],

              [
                "Location",
                selectedSOS.location,
              ],

              [
                "People",
                selectedSOS.people_count,
              ],

              [
                "Contact",
                selectedSOS.contact ||
                  "—",
              ],

              [
                "Needs",
                selectedSOS.needs ||
                  "—",
              ],

              [
                "Severity",
                selectedSOS.severity,
              ],

              [
                "Status",
                selectedSOS.status,
              ],

              [
                "Submitted",
                selectedSOS.timestamp
                  ? new Date(
                      selectedSOS.timestamp
                    ).toLocaleString()
                  : "—",
              ],

            ].map(
              ([label, value]) => (

                <div
                  key={label}
                  className="rounded-xl bg-white p-3"
                >

                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {label}
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800 break-words">
                    {value}
                  </p>

                </div>

              )
            )}

          </div>

          {/* GPS */}

          {selectedSOS.latitude != null &&
            selectedSOS.longitude != null && (

              <div className="mt-3 rounded-xl bg-white p-3">

                <p className="text-[10px] font-black uppercase text-slate-400">
                  GPS Coordinates
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {selectedSOS.latitude},{" "}
                  {selectedSOS.longitude}
                </p>

              </div>

            )}

          {/* DESCRIPTION */}

          {selectedSOS.description && (

            <div className="mt-3 rounded-xl bg-white p-3">

              <p className="text-[10px] font-black uppercase text-slate-400">
                Emergency Description
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {selectedSOS.description}
              </p>

            </div>

          )}

          {/* FIELD TEAM / ALL ROLE ACTIONS */}

          {canManage &&
            selectedSOS.status !==
              "Resolved" && (

              <div className="mt-4 flex flex-wrap gap-2">

                {selectedSOS.status ===
                  "Pending" && (

                  <button
                    onClick={() =>
                      handleStatusUpdate(
                        selectedSOS.id,
                        "Acknowledged"
                      )
                    }
                    disabled={
                      updatingId ===
                      selectedSOS.id
                    }
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >

                    {updatingId ===
                    selectedSOS.id ? (
                      <RefreshCw
                        size={15}
                        className="inline animate-spin"
                      />
                    ) : (
                      "Acknowledge"
                    )}

                  </button>

                )}

                <button
                  onClick={() =>
                    handleStatusUpdate(
                      selectedSOS.id,
                      "Resolved"
                    )
                  }
                  disabled={
                    updatingId ===
                    selectedSOS.id
                  }
                  className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                >

                  Resolve

                </button>

              </div>

            )}

        </div>

      )}

    </div>
  )

  // ==========================================================
  // PAGE HEADER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-900 via-red-700 to-orange-500 p-6 text-white shadow-xl">

        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 border border-white/20">

              <Siren size={28} />

            </div>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-white/70">
                Emergency Response
              </p>

              <h1 className="text-3xl font-black">
                SOS Request Center
              </h1>

              <p className="mt-1 text-sm text-white/80">

                {isFieldTeam
                  ? "View and respond to emergency SOS alerts."
                  : "Create and manage emergency SOS alerts."}

              </p>

            </div>

          </div>

          {pendingCount > 0 && (

            <div className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-5 py-3">

              <span className="h-3 w-3 rounded-full bg-red-300 animate-pulse" />

              <span className="font-black">
                {pendingCount} Pending SOS
              </span>

            </div>

          )}

        </div>

        {/* ====================================================
            TABS
            ==================================================== */}

        <div className="relative mt-5 flex gap-2">

          {/* ADMIN + COORDINATOR ONLY */}

          {canCreate && (

            <button
              type="button"
              onClick={() =>
                setTab("submit")
              }
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
                tab === "submit"
                  ? "bg-white text-red-700"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              Create SOS
            </button>

          )}

          {/* EVERY ROLE */}

          <button
            type="button"
            onClick={() => {
              setTab("manage")
              loadRequests()
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
              tab === "manage"
                ? "bg-white text-red-700"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            View SOS

            {pendingCount >
              0 && (

              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                {pendingCount}
              </span>

            )}

          </button>

        </div>

      </div>

      {/* ======================================================
          ADMIN / COORDINATOR CREATE PAGE
          ====================================================== */}

      {tab === "submit" &&
        canCreate &&
        SubmitSOSSection}

      {/* ======================================================
          EVERY ROLE VIEW PAGE
          ====================================================== */}

      {tab === "manage" &&
        canManage &&
        ManageSOSSection}

      {/* ======================================================
          FALLBACK
          ====================================================== */}

      {!canCreate &&
        tab === "submit" && (

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-center">

            <AlertTriangle
              size={32}
              className="mx-auto text-yellow-600"
            />

            <p className="mt-3 font-bold text-yellow-800">
              Field Team members can view and respond to SOS requests.
            </p>

            <button
              type="button"
              onClick={() =>
                setTab("manage")
              }
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white hover:bg-red-700"
            >
              View SOS Requests
            </button>

          </div>

        )}

      {/* ======================================================
          INPUT STYLES
          ====================================================== */}

      <style>{`

        .input-field {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          background: white;
          color: #0f172a;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }

        .input-field:focus {
          border-color: #ef4444;
          box-shadow:
            0 0 0 3px
            rgba(239, 68, 68, 0.1);
        }

        .input-field::placeholder {
          color: #94a3b8;
        }

      `}</style>

    </div>
  )
}