import { useEffect, useState } from "react"
import {
  Users,
  User,
  MapPin,
  ShieldCheck,
  Plus,
  X,
  RefreshCw,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Mail,
  Lock,
  UserRound,
  UsersRound,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react"

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getFieldTeams,
  createFieldTeam,
  updateFieldTeam,
  deleteFieldTeam,
} from "../services/api"
import { useLanguage } from "../i18n.jsx"

export default function FieldTeams() {
  const { t } = useLanguage()
  // =========================================================
  // USERS
  // =========================================================

  const [users, setUsers] = useState([])
  const [expandedUser, setExpandedUser] = useState(null)

  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Field Team",
  })

  // =========================================================
  // FIELD TEAMS
  // =========================================================

  const [teams, setTeams] = useState([])

  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)

  const [teamForm, setTeamForm] = useState({
    name: "",
    members: "",
    zone: "",
    leader: "",
    status: "Active",
  })

  // =========================================================
  // GENERAL STATE
  // =========================================================

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [savingUser, setSavingUser] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)

  const [deletingUser, setDeletingUser] = useState(null)
  const [deletingTeam, setDeletingTeam] = useState(null)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // =========================================================
  // FETCH USERS
  // =========================================================

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)

      const data = await getUsers()

      setUsers(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : []
      )
    } catch (err) {
      console.error("Failed to fetch users:", err)

      setError(
        err?.message || "Failed to load users."
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  // =========================================================
  // FETCH FIELD TEAMS
  // =========================================================

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)

      const data = await getFieldTeams()

      setTeams(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.teams)
            ? data.teams
            : []
      )
    } catch (err) {
      console.error("Failed to fetch field teams:", err)

      setError(
        err?.message || "Failed to load field teams."
      )
    } finally {
      setLoadingTeams(false)
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchUsers()
    fetchTeams()
  }, [])

  // =========================================================
  // CLEAR MESSAGES
  // =========================================================

  const clearMessages = () => {
    setError("")
    setSuccess("")
  }

  // =========================================================
  // USER FORM
  // =========================================================

  const handleUserChange = (event) => {
    const { name, value } = event.target

    setUserForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const resetUserForm = () => {
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "Field Team",
    })

    setEditingUser(null)
    setShowUserForm(false)
  }

  const handleAddUser = () => {
    clearMessages()

    setEditingUser(null)

    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "Field Team",
    })

    setShowUserForm(true)
    setShowTeamForm(false)
  }

  const handleEditUser = (user) => {
    clearMessages()

    setEditingUser(user)

    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "Field Team",
    })

    setShowUserForm(true)
    setShowTeamForm(false)
  }

  // =========================================================
  // CREATE / UPDATE USER
  // =========================================================

  const handleUserSubmit = async (event) => {
    event.preventDefault()

    clearMessages()

    const name = userForm.name.trim()
    const email = userForm.email.trim()
    const password = userForm.password.trim()

    if (!name) {
      setError("Please enter the user name.")
      return
    }

    if (!email) {
      setError("Please enter the email.")
      return
    }

    if (!editingUser && !password) {
      setError("Please enter the password.")
      return
    }

    try {
      setSavingUser(true)

      const payload = {
        name,
        email,
        role: userForm.role,
      }

      if (password) {
        payload.password = password
      }

      if (editingUser) {
        await updateUser(editingUser.id, payload)

        setSuccess("User updated successfully.")
      } else {
        await createUser({
          ...payload,
          password,
        })

        setSuccess("User created successfully.")
      }

      await fetchUsers()
      resetUserForm()
    } catch (err) {
      console.error("Failed to save user:", err)

      setError(
        err?.message || "Failed to save user."
      )
    } finally {
      setSavingUser(false)
    }
  }

  // =========================================================
  // DELETE USER
  // =========================================================

  const handleDeleteUser = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    )

    if (!confirmed) return

    try {
      clearMessages()
      setDeletingUser(id)

      await deleteUser(id)

      setUsers((current) =>
        current.filter((user) => user.id !== id)
      )

      if (expandedUser === id) {
        setExpandedUser(null)
      }

      setSuccess("User deleted successfully.")
    } catch (err) {
      console.error("Failed to delete user:", err)

      setError(
        err?.message || "Failed to delete user."
      )
    } finally {
      setDeletingUser(null)
    }
  }

  const toggleUserDetails = (id) => {
    setExpandedUser((current) =>
      current === id ? null : id
    )
  }

  // =========================================================
  // TEAM FORM
  // =========================================================

  const handleTeamChange = (event) => {
    const { name, value } = event.target

    setTeamForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const resetTeamForm = () => {
    setTeamForm({
      name: "",
      members: "",
      zone: "",
      leader: "",
      status: "Active",
    })

    setEditingTeam(null)
    setShowTeamForm(false)
  }

  const handleAddTeam = () => {
    clearMessages()

    setEditingTeam(null)

    setTeamForm({
      name: "",
      members: "",
      zone: "",
      leader: "",
      status: "Active",
    })

    setShowTeamForm(true)
    setShowUserForm(false)
  }

  const handleEditTeam = (team) => {
    clearMessages()

    setEditingTeam(team)

    setTeamForm({
      name: team.name || "",
      members:
        team.members !== null &&
        team.members !== undefined
          ? String(team.members)
          : "",
      zone: team.zone || "",
      leader: team.leader || "",
      status: team.status || "Active",
    })

    setShowTeamForm(true)
    setShowUserForm(false)
  }

  // =========================================================
  // CREATE / UPDATE TEAM
  // =========================================================

  const handleTeamSubmit = async (event) => {
    event.preventDefault()

    clearMessages()

    const name = teamForm.name.trim()
    const zone = teamForm.zone.trim()
    const leader = teamForm.leader.trim()
    const members = Number(teamForm.members)

    if (!name) {
      setError("Please enter the team name.")
      return
    }

    if (
      teamForm.members === "" ||
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
      setSavingTeam(true)

      const payload = {
        name,
        members,
        zone,
        leader,
        status: teamForm.status,
      }

      if (editingTeam) {
        await updateFieldTeam(
          editingTeam.id,
          payload
        )

        setSuccess(
          "Field team updated successfully."
        )
      } else {
        await createFieldTeam(payload)

        setSuccess(
          "Field team created successfully."
        )
      }

      await fetchTeams()
      resetTeamForm()
    } catch (err) {
      console.error(
        "Failed to save field team:",
        err
      )

      setError(
        err?.message ||
          "Failed to save field team."
      )
    } finally {
      setSavingTeam(false)
    }
  }

  // =========================================================
  // DELETE TEAM
  // =========================================================

  const handleDeleteTeam = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this field team?"
    )

    if (!confirmed) return

    try {
      clearMessages()
      setDeletingTeam(id)

      await deleteFieldTeam(id)

      setTeams((current) =>
        current.filter((team) => team.id !== id)
      )

      setSuccess(
        "Field team deleted successfully."
      )
    } catch (err) {
      console.error(
        "Failed to delete field team:",
        err
      )

      setError(
        err?.message ||
          "Failed to delete field team."
      )
    } finally {
      setDeletingTeam(null)
    }
  }

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {
    clearMessages()

    await Promise.all([
      fetchUsers(),
      fetchTeams(),
    ])

    setSuccess("Data refreshed successfully.")
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalUsers = users.length

  const adminCount = users.filter(
    (user) =>
      String(user.role || "").toLowerCase() ===
      "admin"
  ).length

  const coordinatorCount = users.filter(
    (user) => {
      const role = String(
        user.role || ""
      ).toLowerCase()

      return (
        role === "emergency coordinator" ||
        role === "coordinator"
      )
    }
  ).length

  const fieldTeamUsers = users.filter(
    (user) => {
      const role = String(
        user.role || ""
      ).toLowerCase()

      return (
        role === "field team" ||
        role === "field_team"
      )
    }
  ).length

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

  const totalPersonnel = teams.reduce(
    (total, team) =>
      total + Number(team.members || 0),
    0
  )

  // =========================================================
  // ROLE STYLE
  // =========================================================

  const getRoleStyle = (role) => {
    const value = String(
      role || ""
    ).toLowerCase()

    if (value === "admin") {
      return "bg-red-100 text-red-700"
    }

    if (
      value === "emergency coordinator" ||
      value === "coordinator"
    ) {
      return "bg-purple-100 text-purple-700"
    }

    if (
      value === "field team" ||
      value === "field_team"
    ) {
      return "bg-blue-100 text-blue-700"
    }

    return "bg-slate-100 text-slate-700"
  }

  // =========================================================
  // TEAM STATUS STYLE
  // =========================================================

  const getTeamStatusStyle = (status) => {
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

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {t("usersFieldTeams")}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {t("fieldTeamsDescription")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              loadingUsers ||
              loadingTeams
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loadingUsers ||
                loadingTeams
                  ? "animate-spin"
                  : ""
              }
            />

            {t("refresh")}
          </button>
        </div>

        {/* =====================================================
            MESSAGES
        ===================================================== */}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Operation failed
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
            USER SUMMARY
        ===================================================== */}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Total Users"
            value={totalUsers}
            icon={Users}
            iconClass="bg-blue-100 text-blue-600"
          />

          <SummaryCard
            title="Admin"
            value={adminCount}
            icon={ShieldCheck}
            valueClass="text-red-600"
            iconClass="bg-red-100 text-red-600"
          />

          <SummaryCard
            title="Coordinators"
            value={coordinatorCount}
            icon={UserRound}
            valueClass="text-purple-600"
            iconClass="bg-purple-100 text-purple-600"
          />

          <SummaryCard
            title="Field Team Users"
            value={fieldTeamUsers}
            icon={UsersRound}
            valueClass="text-blue-600"
            iconClass="bg-blue-100 text-blue-600"
          />

        </div>

        {/* =====================================================
            USERS SECTION
        ===================================================== */}

        <div className="mb-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Registered Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create, view, edit and delete system users.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddUser}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create User
            </button>

          </div>

          {/* =================================================
              USER FORM
          ================================================= */}

          {showUserForm && (
            <div className="border-b border-slate-200 bg-slate-50 p-6">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingUser
                      ? "Edit User"
                      : "Create New User"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the account details and assign a role.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetUserForm}
                  disabled={savingUser}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              <form
                onSubmit={handleUserSubmit}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >

                <FormInput
                  label="Full Name"
                  icon={User}
                  name="name"
                  value={userForm.name}
                  onChange={handleUserChange}
                  placeholder="Enter full name"
                />

                <FormInput
                  label="Email"
                  icon={Mail}
                  type="email"
                  name="email"
                  value={userForm.email}
                  onChange={handleUserChange}
                  placeholder="Enter email address"
                />

                <FormInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={handleUserChange}
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Role
                  </label>

                  <select
                    name="role"
                    value={userForm.role}
                    onChange={handleUserChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Admin">
                      Admin
                    </option>

                    <option value="Emergency Coordinator">
                      Emergency Coordinator
                    </option>

                    <option value="Field Team">
                      Field Team
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2">

                  <button
                    type="button"
                    onClick={resetUserForm}
                    disabled={savingUser}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingUser}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingUser && (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    {savingUser
                      ? "Saving..."
                      : editingUser
                        ? "Update User"
                        : "Create User"}
                  </button>

                </div>

              </form>
            </div>
          )}

          {/* =================================================
              USERS LIST
          ================================================= */}

          {loadingUsers ? (
            <LoadingState text="Loading users..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Users Found"
              text="Create a user to display their details here."
              buttonText="Create User"
              onClick={handleAddUser}
            />
          ) : (
            <div className="divide-y divide-slate-200">

              {users.map((user) => {
                const isExpanded =
                  expandedUser === user.id

                const isDeleting =
                  deletingUser === user.id

                return (
                  <div key={user.id}>

                    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <User size={21} />
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate font-bold text-slate-900">
                            {user.name}
                          </h3>

                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500">
                            <Mail size={14} />
                            {user.email}
                          </p>

                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getRoleStyle(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            toggleUserDetails(
                              user.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Details

                          {isExpanded ? (
                            <ChevronUp size={17} />
                          ) : (
                            <ChevronDown size={17} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleEditUser(user)
                          }
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteUser(
                              user.id
                            )
                          }
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <>
                              <RefreshCw
                                size={15}
                                className="animate-spin"
                              />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              Delete
                            </>
                          )}
                        </button>

                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                          <DetailCard
                            label="User ID"
                            value={`#${user.id}`}
                          />

                          <DetailCard
                            label="Full Name"
                            value={user.name}
                          />

                          <DetailCard
                            label="Role"
                            value={user.role}
                          />

                          <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Email Address
                            </p>

                            <p className="mt-2 font-semibold text-slate-900">
                              {user.email}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Account
                            </p>

                            <p className="mt-2 flex items-center gap-2 font-semibold text-green-600">
                              <CheckCircle2 size={17} />
                              Registered
                            </p>

                          </div>

                        </div>
                      </div>
                    )}

                  </div>
                )
              })}

            </div>
          )}
        </div>

        {/* =====================================================
            TEAM SUMMARY
        ===================================================== */}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Total Teams"
            value={totalTeams}
            icon={UsersRound}
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
            value={totalPersonnel}
            icon={UserRound}
            valueClass="text-purple-600"
            iconClass="bg-purple-100 text-purple-600"
          />

        </div>

        {/* =====================================================
            FIELD TEAMS SECTION
        ===================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Field Teams
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage response teams, zones, leaders and personnel.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTeam}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Field Team
            </button>

          </div>

          {/* =================================================
              TEAM FORM
          ================================================= */}

          {showTeamForm && (
            <div className="border-b border-slate-200 bg-slate-50 p-6">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingTeam
                      ? "Edit Field Team"
                      : "Create Field Team"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter complete field team information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetTeamForm}
                  disabled={savingTeam}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              <form
                onSubmit={handleTeamSubmit}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >

                <FormInput
                  label="Team Name"
                  name="name"
                  value={teamForm.name}
                  onChange={handleTeamChange}
                  placeholder="Enter team name"
                />

                <FormInput
                  label="Number of Members"
                  type="number"
                  min="1"
                  name="members"
                  value={teamForm.members}
                  onChange={handleTeamChange}
                  placeholder="Enter number of members"
                />

                <FormInput
                  label="Assigned Zone"
                  name="zone"
                  value={teamForm.zone}
                  onChange={handleTeamChange}
                  placeholder="Enter assigned zone"
                />

                <FormInput
                  label="Team Leader"
                  name="leader"
                  value={teamForm.leader}
                  onChange={handleTeamChange}
                  placeholder="Enter team leader"
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={teamForm.status}
                    onChange={handleTeamChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

                <div className="flex justify-end gap-3 md:col-span-2">

                  <button
                    type="button"
                    onClick={resetTeamForm}
                    disabled={savingTeam}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingTeam}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTeam && (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    {savingTeam
                      ? "Saving..."
                      : editingTeam
                        ? "Update Team"
                        : "Create Team"}
                  </button>

                </div>

              </form>
            </div>
          )}

          {/* =================================================
              TEAM LIST
          ================================================= */}

          {loadingTeams ? (
            <LoadingState text="Loading field teams..." />
          ) : teams.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No Field Teams Found"
              text="Create a field team to display its details here."
              buttonText="Create Field Team"
              onClick={handleAddTeam}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">

              {teams.map((team) => {
                const status = String(
                  team.status || ""
                ).toLowerCase()

                const isDeleting =
                  deletingTeam === team.id

                return (
                  <div
                    key={team.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >

                    {/* Team Header */}

                    <div className="mb-5 flex items-start justify-between gap-4">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="shrink-0 rounded-lg bg-blue-100 p-3 text-blue-600">
                          <ShieldCheck size={24} />
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {team.name}
                          </h3>

                          <p className="text-xs text-slate-500">
                            Team ID: #{team.id}
                          </p>

                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getTeamStatusStyle(
                          team.status
                        )}`}
                      >
                        {team.status || "Unknown"}
                      </span>

                    </div>

                    {/* Team Details */}

                    <div className="space-y-3">

                      <TeamDetail
                        icon={Users}
                        label="Members"
                        value={team.members}
                      />

                      <TeamDetail
                        icon={MapPin}
                        label="Assigned Zone"
                        value={team.zone}
                      />

                      <TeamDetail
                        icon={User}
                        label="Team Leader"
                        value={team.leader}
                      />

                      <TeamDetail
                        icon={CheckCircle2}
                        label="Current Status"
                        value={team.status}
                      />

                    </div>

                    {/* Actions */}

                    <div className="mt-5 flex gap-3 border-t border-slate-200 pt-4">

                      <button
                        type="button"
                        onClick={() =>
                          handleEditTeam(team)
                        }
                        disabled={isDeleting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Edit3 size={17} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTeam(
                            team.id
                          )
                        }
                        disabled={isDeleting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <>
                            <RefreshCw
                              size={16}
                              className="animate-spin"
                            />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 size={17} />
                            Delete
                          </>
                        )}
                      </button>

                    </div>

                  </div>
                )
              })}

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ============================================================
// REUSABLE SUMMARY CARD
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
  icon: Icon,
  type = "text",
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative">

        {Icon && (
          <Icon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}

        <input
          type={type}
          {...props}
          className={`w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
            Icon
              ? "pl-10 pr-4"
              : "px-4"
          }`}
        />

      </div>
    </div>
  )
}

// ============================================================
// DETAIL CARD
// ============================================================

function DetailCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-semibold text-slate-900">
        {value || "Not specified"}
      </p>

    </div>
  )
}

// ============================================================
// TEAM DETAIL
// ============================================================

function TeamDetail({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">

      <div className="flex shrink-0 items-center gap-3">

        <Icon
          size={18}
          className="text-slate-500"
        />

        <span className="text-sm text-slate-600">
          {label}
        </span>

      </div>

      <span className="text-right font-semibold text-slate-900">
        {value ?? "Not specified"}
      </span>

    </div>
  )
}

// ============================================================
// LOADING
// ============================================================

function LoadingState({ text }) {
  return (
    <div className="flex min-h-[250px] items-center justify-center">

      <div className="flex items-center gap-3 text-slate-500">

        <RefreshCw
          size={20}
          className="animate-spin"
        />

        {text}

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
  text,
  buttonText,
  onClick,
}) {
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">

      <div className="mb-4 rounded-full bg-slate-100 p-4">
        <Icon
          size={32}
          className="text-slate-400"
        />
      </div>

      <h3 className="text-lg font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus size={17} />
        {buttonText}
      </button>

    </div>
  )
}