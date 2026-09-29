import { useEffect, useState } from "react"
import {
  Users,
  Plus,
  RefreshCw,
  X,
  MapPin,
  User,
  CheckCircle2,
  Clock3,
  ShieldCheck,
} from "lucide-react"

import {
  getFieldTeams,
  createFieldTeam,
} from "../services/api"
import { useLanguage } from "../i18n.jsx"

function Teams() {
  const { t } = useLanguage()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    name: "",
    members: "",
    zone: "",
    leader: "",
    status: "Active",
  })

  // =========================================================
  // FETCH FIELD TEAMS
  // =========================================================

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getFieldTeams()

      setTeams(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.teams)
            ? data.teams
            : []
      )
    } catch (err) {
      console.error(
        "Failed to fetch field teams:",
        err
      )

      setError(
        err?.message ||
          "Failed to load field teams."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      name: "",
      members: "",
      zone: "",
      leader: "",
      status: "Active",
    })

    setShowForm(false)
  }

  // =========================================================
  // CREATE FIELD TEAM
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    const name = form.name.trim()
    const zone = form.zone.trim()
    const leader = form.leader.trim()
    const members = Number(form.members)

    if (!name) {
      setError("Please enter the team name.")
      return
    }

    if (
      form.members === "" ||
      !Number.isInteger(members) ||
      members <= 0
    ) {
      setError(
        "Number of members must be a positive whole number."
      )
      return
    }

    if (!zone) {
      setError("Please enter the assigned zone.")
      return
    }

    if (!leader) {
      setError("Please enter the team leader.")
      return
    }

    try {
      setSubmitting(true)

      await createFieldTeam({
        name,
        members,
        zone,
        leader,
        status: form.status,
      })

      setSuccess(
        "Field team created successfully."
      )

      resetForm()

      await fetchTeams()
    } catch (err) {
      console.error(
        "Failed to create field team:",
        err
      )

      setError(
        err?.message ||
          "Failed to create field team."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalTeams = teams.length

  const activeTeams = teams.filter(
    (team) =>
      String(team.status || "").toLowerCase() ===
      "active"
  ).length

  const standbyTeams = teams.filter(
    (team) =>
      String(team.status || "").toLowerCase() ===
      "standby"
  ).length

  const totalMembers = teams.reduce(
    (total, team) =>
      total + Number(team.members || 0),
    0
  )

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (status) => {
    const value = String(
      status || ""
    ).toLowerCase()

    if (value === "active") {
      return "bg-green-100 text-green-700"
    }

    if (value === "standby") {
      return "bg-amber-100 text-amber-700"
    }

    return "bg-slate-100 text-slate-600"
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("fieldTeams")}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and register field response teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={fetchTeams}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              {t("refresh")}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("")
                setSuccess("")
                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={17} />
              {t("addFieldTeam")}
            </button>

          </div>
        </div>

        {/* =====================================================
            MESSAGES
        ===================================================== */}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Error
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Success
              </p>

              <p className="mt-1">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Total Teams"
            value={totalTeams}
            icon={Users}
            iconClass="bg-blue-100 text-blue-600"
          />

          <SummaryCard
            title="Active Teams"
            value={activeTeams}
            icon={CheckCircle2}
            valueClass="text-green-600"
            iconClass="bg-green-100 text-green-600"
          />

          <SummaryCard
            title="Standby Teams"
            value={standbyTeams}
            icon={Clock3}
            valueClass="text-amber-600"
            iconClass="bg-amber-100 text-amber-600"
          />

          <SummaryCard
            title="Total Personnel"
            value={totalMembers}
            icon={Users}
            valueClass="text-purple-600"
            iconClass="bg-purple-100 text-purple-600"
          />

        </div>

        {/* =====================================================
            ADD FORM
        ===================================================== */}

        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Users size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Add Field Team
                  </h2>

                  <p className="text-xs text-slate-500">
                    Register a new field response team.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >

              {/* Team Name */}

              <FormInput
                label="Team Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter team name"
              />

              {/* Members */}

              <FormInput
                label="Number of Members"
                type="number"
                min="1"
                name="members"
                value={form.members}
                onChange={handleChange}
                placeholder="Enter member count"
              />

              {/* Zone */}

              <FormInput
                label="Assigned Zone"
                name="zone"
                value={form.zone}
                onChange={handleChange}
                placeholder="Enter assigned zone"
              />

              {/* Leader */}

              <FormInput
                label="Team Leader"
                name="leader"
                value={form.leader}
                onChange={handleChange}
                placeholder="Enter team leader"
              />

              {/* Status */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Standby">
                    Standby
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 md:col-span-2">

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {submitting
                    ? "Creating..."
                    : "Create Field Team"}
                </button>

              </div>

            </form>
          </div>
        )}

        {/* =====================================================
            FIELD TEAMS LIST
        ===================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-4">

            <h2 className="font-semibold text-slate-900">
              Registered Field Teams
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Field teams currently registered in the system.
            </p>

          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">

              <div className="flex items-center gap-3 text-sm text-slate-500">

                <RefreshCw
                  size={20}
                  className="animate-spin"
                />

                Loading field teams...

              </div>
            </div>
          ) : teams.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">

              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Users
                  size={34}
                  className="text-slate-400"
                />
              </div>

              <p className="font-medium text-slate-700">
                No field teams found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Add a field team to see it here.
              </p>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Field Team
              </button>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Team
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Members
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Zone
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Leader
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {teams.map((team) => (

                    <tr
                      key={team.id}
                      className="hover:bg-slate-50"
                    >

                      {/* Team */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ShieldCheck size={17} />
                          </div>

                          <div>

                            <p className="text-sm font-semibold text-slate-900">
                              {team.name ||
                                "Unnamed Team"}
                            </p>

                            <p className="text-xs text-slate-400">
                              ID: {team.id}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* Members */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <Users
                            size={15}
                            className="text-slate-400"
                          />

                          {team.members ?? "-"}

                        </div>

                      </td>

                      {/* Zone */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <MapPin
                            size={15}
                            className="text-slate-400"
                          />

                          {team.zone || "-"}

                        </div>

                      </td>

                      {/* Leader */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <User
                            size={15}
                            className="text-slate-400"
                          />

                          {team.leader || "-"}

                        </div>

                      </td>

                      {/* Status */}

                      <td className="px-6 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            team.status
                          )}`}
                        >
                          {team.status ||
                            "Inactive"}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </div>
  )
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  icon: Icon,
  valueClass = "text-slate-900",
  iconClass = "bg-slate-100 text-slate-600",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${valueClass}`}
          >
            {value}
          </p>

        </div>

        <div
          className={`rounded-lg p-3 ${iconClass}`}
        >
          <Icon size={24} />
        </div>

      </div>

    </div>
  )
}

// ============================================================
// FORM INPUT
// ============================================================

function FormInput({
  label,
  type = "text",
  ...props
}) {
  return (
    <div>

      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        {...props}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </div>
  )
}

export default Teams