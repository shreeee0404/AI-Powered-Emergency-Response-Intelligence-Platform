import React, { useEffect, useMemo, useState } from "react"

import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  Users,
  X,
  Package,
  CircleDot,
} from "lucide-react"

import {
  getMissions,
  createMission,
  updateMission,
  deleteMission,

  getMissionResources,
  assignMissionResource,
  updateMissionResource,
  deleteMissionResource,

  getDisasters,
  getFieldTeams,
  getResources,
  getVehicles,
  getLogisticsPlans,
  updateLogisticsStatus,
} from "../services/api"
import { translateStatus, useLanguage } from "../i18n.jsx"


// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}


function getArray(data) {
  if (Array.isArray(data)) return data

  if (Array.isArray(data?.items)) {
    return data.items
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  if (Array.isArray(data?.plans)) {
    return data.plans
  }

  return []
}


function getStatusClass(status) {
  const value = normalize(status)

  if (
    value === "completed" ||
    value === "complete" ||
    value === "delivered" ||
    value === "done"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  if (
    value === "in progress" ||
    value === "in_progress" ||
    value === "active" ||
    value === "ongoing"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  return "bg-amber-50 text-amber-700 border-amber-200"
}


function getStatusDot(status) {
  const value = normalize(status)

  if (
    value === "completed" ||
    value === "complete" ||
    value === "delivered" ||
    value === "done"
  ) {
    return "bg-emerald-500"
  }

  if (
    value === "in progress" ||
    value === "in_progress" ||
    value === "active" ||
    value === "ongoing"
  ) {
    return "bg-blue-500"
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "bg-red-500"
  }

  return "bg-amber-500"
}


function formatStatus(status) {
  if (!status) return "Pending"

  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}


function getDisasterById(disasters, id) {
  return disasters.find(
    (item) => Number(item.id) === Number(id)
  )
}


function getTeamById(teams, id) {
  return teams.find(
    (item) => Number(item.id) === Number(id)
  )
}


function getResourceById(resources, id) {
  return resources.find(
    (item) => Number(item.id) === Number(id)
  )
}


function getVehicleById(vehicles, id) {
  return vehicles.find(
    (item) => Number(item.id) === Number(id)
  )
}


function getCurrentUser() {
  const keys = [
    "current_user",
    "currentUser",
    "loggedInUser",
    "loginUser",
    "userData",
    "user",
  ]

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key)
      if (value) return JSON.parse(value)
    } catch {
      // Ignore malformed legacy storage values.
    }
  }

  return null
}

function getUserIdentityValues(user) {
  return [
    user?.name,
    user?.username,
    user?.email,
  ]
    .filter(Boolean)
    .map(normalize)
}

function isFieldTeamUser(user) {
  const role = normalize(user?.role).replace(/[_-]+/g, " ")

  return role === "field team" || role === "fieldteam"
}

function userOwnsTeam(team, user) {
  if (!team || !user) return false

  const explicitTeamIds = [
    user.field_team_id,
    user.team_id,
    user.assigned_team_id,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map(Number)

  if (
    explicitTeamIds.length > 0 &&
    explicitTeamIds.includes(Number(team.id))
  ) {
    return true
  }

  const identityValues = getUserIdentityValues(user)
  const teamValues = [
    team.name,
    team.leader,
  ]
    .filter(Boolean)
    .map(normalize)

  return identityValues.some((identity) =>
    teamValues.some(
      (teamValue) =>
        teamValue === identity ||
        teamValue.includes(identity) ||
        identity.includes(teamValue)
    )
  )
}


function getOperationalArea(user) {
  const fields = [
    "area",
    "zone",
    "location",
    "city",
    "district",
    "region",
    "operational_area",
    "assigned_area",
    "base_location",
    "address",
  ]

  for (const field of fields) {
    if (user?.[field]) return String(user[field]).trim()
  }

  return ""
}


function getAreaValues(item) {
  return [
    item?.area,
    item?.zone,
    item?.location,
    item?.city,
    item?.district,
    item?.region,
    item?.operational_area,
    item?.assigned_area,
    item?.base_location,
    item?.address,
  ]
    .filter(Boolean)
    .map(normalize)
}


function matchesArea(item, operationalArea) {
  if (!operationalArea) return true

  const area = normalize(operationalArea)

  return getAreaValues(item).some(
    (value) =>
      value.includes(area) || area.includes(value)
  )
}


// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_MISSION = {
  title: "",
  disaster_id: "",
  field_team_id: "",
  location: "",
  status: "Pending",
  description: "",
}


const EMPTY_RESOURCE_ASSIGNMENT = {
  mission_id: "",
  resource_id: "",
  quantity: "",
  status: "Assigned",
}


// ============================================================
// COMPONENT
// ============================================================

function Missions() {
  const { t } = useLanguage()
  // ==========================================================
  // DATA
  // ==========================================================

  const [missions, setMissions] = useState([])
  const [missionResources, setMissionResources] = useState([])

  const [disasters, setDisasters] = useState([])
  const [fieldTeams, setFieldTeams] = useState([])
  const [resources, setResources] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [logisticsPlans, setLogisticsPlans] = useState([])

  const [currentUser, setCurrentUser] = useState(() =>
    getCurrentUser()
  )

  const operationalArea = useMemo(
    () => getOperationalArea(currentUser),
    [currentUser]
  )

  const isFieldTeamAccount = isFieldTeamUser(currentUser)
  const canManageMissions = !isFieldTeamAccount

  // ==========================================================
  // UI
  // ==========================================================

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selectedMission, setSelectedMission] =
    useState(null)

  // ==========================================================
  // MODALS
  // ==========================================================

  const [showMissionModal, setShowMissionModal] =
    useState(false)

  const [showResourceModal, setShowResourceModal] =
    useState(false)

  const [editingMission, setEditingMission] =
    useState(null)

  const [editingAssignment, setEditingAssignment] =
    useState(null)

  // ==========================================================
  // FORMS
  // ==========================================================

  const [missionForm, setMissionForm] =
    useState(EMPTY_MISSION)

  const [resourceForm, setResourceForm] =
    useState(EMPTY_RESOURCE_ASSIGNMENT)

  const [saving, setSaving] = useState(false)

  // ==========================================================
  // LOAD ALL DATA
  // ==========================================================

  const loadData = async (
    showRefreshLoader = false
  ) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const [
        missionData,
        missionResourceData,
        disasterData,
        teamData,
        resourceData,
        vehicleData,
        logisticsData,
      ] = await Promise.all([
        getMissions(),
        getMissionResources(),
        getDisasters(),
        getFieldTeams(),
        getResources(),
        getVehicles(),
        getLogisticsPlans(),
      ])

      setMissions(getArray(missionData))
      setMissionResources(getArray(missionResourceData))
      setDisasters(getArray(disasterData))
      setFieldTeams(getArray(teamData))
      setResources(getArray(resourceData))
      setVehicles(getArray(vehicleData))
      setLogisticsPlans(getArray(logisticsData))
    } catch (err) {
      console.error("Mission data loading error:", err)

      setError(
        err?.message ||
          "Failed to load mission data."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    setCurrentUser(getCurrentUser())
    loadData()
  }, [])


  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadData(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [])


  // ==========================================================
  // CLEAR NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => {
      setSuccess("")
    }, 3500)

    return () => clearTimeout(timer)
  }, [success])


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const areaMissions = useMemo(
    () =>
      missions.filter((mission) => {
        const disaster = getDisasterById(
          disasters,
          mission.disaster_id
        )
        const team = getTeamById(
          fieldTeams,
          mission.field_team_id
        )

        return (
          !operationalArea ||
          matchesArea(disaster, operationalArea) ||
          matchesArea(team, operationalArea) ||
          matchesArea(mission, operationalArea)
        )
      }),
    [missions, disasters, fieldTeams, operationalArea]
  )

  const accountMissions = useMemo(
    () =>
      areaMissions.filter((mission) => {
        if (!isFieldTeamUser(currentUser)) {
          return true
        }

        const team = getTeamById(
          fieldTeams,
          mission.field_team_id
        )

        return userOwnsTeam(team, currentUser)
      }),
    [areaMissions, fieldTeams, currentUser]
  )

  const statistics = useMemo(() => {
    const total = accountMissions.length

    const pending = accountMissions.filter(
      (mission) =>
        normalize(mission.status) === "pending"
    ).length

    const active = accountMissions.filter((mission) => {
      const status = normalize(mission.status)

      return (
        status === "active" ||
        status === "in progress" ||
        status === "in_progress" ||
        status === "ongoing"
      )
    }).length

    const completed = accountMissions.filter((mission) => {
      const status = normalize(mission.status)

      return (
        status === "completed" ||
        status === "complete" ||
        status === "done" ||
        status === "delivered"
      )
    }).length

    return {
      total,
      pending,
      active,
      completed,
    }
  }, [accountMissions])


  const areaDisasters = useMemo(
    () => disasters.filter((item) => matchesArea(item, operationalArea)),
    [disasters, operationalArea]
  )

  const areaFieldTeams = useMemo(
    () => fieldTeams.filter((item) => matchesArea(item, operationalArea)),
    [fieldTeams, operationalArea]
  )

  const accountFieldTeams = useMemo(() => {
    if (!isFieldTeamUser(currentUser)) {
      return areaFieldTeams
    }

    return areaFieldTeams.filter((team) =>
      userOwnsTeam(team, currentUser)
    )
  }, [areaFieldTeams, currentUser])

  const areaResources = useMemo(
    () => resources.filter((item) => matchesArea(item, operationalArea)),
    [resources, operationalArea]
  )

  const areaVehicles = useMemo(
    () => vehicles.filter((item) => matchesArea(item, operationalArea)),
    [vehicles, operationalArea]
  )


  // ==========================================================
  // FILTERED MISSIONS
  // ==========================================================

  const filteredMissions = useMemo(() => {
    const query = normalize(search)

    return accountMissions.filter((mission) => {
      const disaster =
        getDisasterById(
          disasters,
          mission.disaster_id
        )

      const team =
        getTeamById(
          fieldTeams,
          mission.field_team_id
        )

      const matchesAreaScope =
        !operationalArea ||
        matchesArea(disaster, operationalArea) ||
        matchesArea(team, operationalArea) ||
        matchesArea(mission, operationalArea)

      const matchesSearch =
        !query ||
        normalize(mission.title).includes(query) ||
        normalize(mission.location).includes(query) ||
        normalize(mission.description).includes(query) ||
        normalize(disaster?.location).includes(query) ||
        normalize(disaster?.disaster_type).includes(query) ||
        normalize(team?.name).includes(query)

      const matchesStatus =
        statusFilter === "All" ||
        normalize(mission.status) ===
          normalize(statusFilter)

      return matchesAreaScope && matchesSearch && matchesStatus
    })
  }, [
    accountMissions,
    disasters,
    fieldTeams,
    search,
    statusFilter,
    operationalArea,
  ])


  // ==========================================================
  // MISSION RESOURCES FOR SELECTED MISSION
  // ==========================================================

  const selectedMissionResources = useMemo(() => {
    if (!selectedMission) return []

    return missionResources.filter(
      (item) => {
        const resource = getResourceById(
          resources,
          item.resource_id
        )

        return (
          Number(item.mission_id) ===
            Number(selectedMission.id) &&
          matchesArea(resource, operationalArea)
        )
      }
    )
  }, [
    missionResources,
    selectedMission,
    resources,
    operationalArea,
  ])


  const selectedLogisticsPlans = useMemo(() => {
    if (!selectedMission) return []

    return logisticsPlans.filter((plan) => {
      const disaster = getDisasterById(
        disasters,
        selectedMission.disaster_id
      )

      const belongsToMission =
        Number(plan.mission_id) ===
          Number(selectedMission.id) ||
        Number(plan.disaster_id) ===
          Number(selectedMission.disaster_id)

      return (
        belongsToMission &&
        (matchesArea(plan, operationalArea) ||
          matchesArea(disaster, operationalArea))
      )
    })
  }, [
    logisticsPlans,
    selectedMission,
    disasters,
    operationalArea,
  ])


  // ==========================================================
  // OPEN CREATE MISSION
  // ==========================================================

  const openCreateMission = () => {
    if (!canManageMissions) return

    setEditingMission(null)

    setMissionForm({
      ...EMPTY_MISSION,
    })

    setError("")
    setShowMissionModal(true)
  }


  // ==========================================================
  // OPEN EDIT MISSION
  // ==========================================================

  const openEditMission = (mission) => {
    if (!canManageMissions) return

    setEditingMission(mission)

    setMissionForm({
      title: mission.title || "",
      disaster_id:
        mission.disaster_id ?? "",
      field_team_id:
        mission.field_team_id ?? "",
      location:
        mission.location || "",
      status:
        mission.status || "Pending",
      description:
        mission.description || "",
    })

    setError("")
    setShowMissionModal(true)
  }


  // ==========================================================
  // CLOSE MISSION MODAL
  // ==========================================================

  const closeMissionModal = () => {
    if (saving) return

    setShowMissionModal(false)
    setEditingMission(null)
    setMissionForm({
      ...EMPTY_MISSION,
    })
  }


  // ==========================================================
  // MISSION INPUT
  // ==========================================================

  const handleMissionChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setMissionForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // ==========================================================
  // CREATE / UPDATE MISSION
  // ==========================================================

  const handleMissionSubmit = async (event) => {
    event.preventDefault()

    if (!canManageMissions) {
      setError("Field Team accounts can only mark missions as completed.")
      return
    }

    setError("")
    setSuccess("")

    if (!missionForm.title.trim()) {
      setError("Please enter a mission title.")
      return
    }

    if (
      missionForm.disaster_id === "" ||
      missionForm.disaster_id === null
    ) {
      setError("Please select a disaster.")
      return
    }

    if (
      missionForm.field_team_id === "" ||
      missionForm.field_team_id === null
    ) {
      setError("Please select a field team.")
      return
    }

    const selectedDisaster = getDisasterById(
      disasters,
      missionForm.disaster_id
    )
    const selectedTeam = getTeamById(
      accountFieldTeams,
      missionForm.field_team_id
    )

    if (
      !matchesArea(selectedDisaster, operationalArea) ||
      !matchesArea(selectedTeam, operationalArea)
    ) {
      setError(
        "Select a disaster and field team within your operational area."
      )
      return
    }

    try {
      setSaving(true)

      const payload = {
        title: missionForm.title.trim(),
        disaster_id:
          Number(missionForm.disaster_id),
        field_team_id:
          Number(missionForm.field_team_id),
        location:
          missionForm.location.trim() || null,
        status:
          missionForm.status || "Pending",
        description:
          missionForm.description.trim() || null,
      }

      if (editingMission) {
        await updateMission(
          editingMission.id,
          payload
        )

        setSuccess(
          "Mission updated successfully."
        )
      } else {
        await createMission(payload)

        setSuccess(
          "Mission created successfully."
        )
      }

      closeMissionModal()

      await loadData(true)
    } catch (err) {
      console.error(
        "Mission save error:",
        err
      )

      setError(
        err?.message ||
          "Failed to save mission."
      )
    } finally {
      setSaving(false)
    }
  }


  // ==========================================================
  // DELETE MISSION
  // ==========================================================

  const handleDeleteMission = async (
    mission
  ) => {
    if (!canManageMissions) {
      setError("Field Team accounts cannot delete missions.")
      return
    }

    const confirmed = window.confirm(
      `Delete mission "${mission.title}"?`
    )

    if (!confirmed) return

    try {
      setError("")
      setSuccess("")

      await deleteMission(mission.id)

      if (
        selectedMission &&
        Number(selectedMission.id) ===
          Number(mission.id)
      ) {
        setSelectedMission(null)
      }

      setSuccess(
        "Mission deleted successfully."
      )

      await loadData(true)
    } catch (err) {
      console.error(
        "Mission delete error:",
        err
      )

      setError(
        err?.message ||
          "Failed to delete mission."
      )
    }
  }


  // ==========================================================
  // QUICK STATUS UPDATE
  // ==========================================================

  const handleMissionStatusChange = async (
    mission,
    status
  ) => {
    if (
      isFieldTeamAccount &&
      normalize(status) !== "completed"
    ) {
      setError("Field Team accounts can only mark missions as completed.")
      return
    }

    try {
      setError("")
      setSuccess("")

      await updateMission(
        mission.id,
        {
          status,
        }
      )

      setSuccess(
        `Mission marked as ${translateStatus(t,
          status
        )}.`
      )

      await loadData(true)

      setSelectedMission((current) => {
        if (
          current &&
          Number(current.id) ===
            Number(mission.id)
        ) {
          return {
            ...current,
            status,
          }
        }

        return current
      })
    } catch (err) {
      console.error(
        "Mission status update error:",
        err
      )

      setError(
        err?.message ||
          "Failed to update mission status."
      )
    }
  }


  // ==========================================================
  // OPEN RESOURCE ASSIGNMENT
  // ==========================================================

  const openAssignResource = (
    mission = selectedMission
  ) => {
    if (!canManageMissions) {
      setError("Field Team accounts cannot assign resources.")
      return
    }

    if (!mission) {
      setError(
        "Please select a mission first."
      )
      return
    }

    setEditingAssignment(null)

    setResourceForm({
      mission_id: mission.id,
      resource_id: "",
      quantity: "",
      status: "Assigned",
    })

    setError("")
    setShowResourceModal(true)
  }


  // ==========================================================
  // EDIT RESOURCE ASSIGNMENT
  // ==========================================================

  const openEditAssignment = (
    assignment
  ) => {
    if (!canManageMissions) return

    setEditingAssignment(assignment)

    setResourceForm({
      mission_id:
        assignment.mission_id,
      resource_id:
        assignment.resource_id,
      quantity:
        assignment.quantity,
      status:
        assignment.status || "Assigned",
    })

    setError("")
    setShowResourceModal(true)
  }


  // ==========================================================
  // CLOSE RESOURCE MODAL
  // ==========================================================

  const closeResourceModal = () => {
    if (saving) return

    setShowResourceModal(false)
    setEditingAssignment(null)

    setResourceForm({
      ...EMPTY_RESOURCE_ASSIGNMENT,
    })
  }


  // ==========================================================
  // RESOURCE INPUT
  // ==========================================================

  const handleResourceChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target

    setResourceForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // ==========================================================
  // ASSIGN / UPDATE RESOURCE
  // ==========================================================

  const handleResourceSubmit = async (
    event
  ) => {
    event.preventDefault()

    if (!canManageMissions) {
      setError("Field Team accounts cannot change resource assignments.")
      return
    }

    setError("")
    setSuccess("")

    if (!resourceForm.mission_id) {
      setError("Please select a mission.")
      return
    }

    if (!resourceForm.resource_id) {
      setError("Please select a resource.")
      return
    }

    const mission = accountMissions.find(
      (item) =>
        Number(item.id) ===
        Number(resourceForm.mission_id)
    )
    const resource = getResourceById(
      resources,
      resourceForm.resource_id
    )

    const missionDisaster = mission
      ? getDisasterById(
          disasters,
          mission.disaster_id
        )
      : null
    const missionTeam = mission
      ? getTeamById(
          fieldTeams,
          mission.field_team_id
        )
      : null

    if (
      !mission ||
      (!matchesArea(mission, operationalArea) &&
        !matchesArea(missionDisaster, operationalArea) &&
        !matchesArea(missionTeam, operationalArea))
    ) {
      setError(
        "The selected mission is outside your operational area."
      )
      return
    }

    if (!resource || !matchesArea(resource, operationalArea)) {
      setError(
        "The selected resource is outside your operational area."
      )
      return
    }

    const quantity = Number(
      resourceForm.quantity
    )

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero."
      )
      return
    }

    const availableQuantity =
      Number(resource.quantity) +
      (editingAssignment &&
      Number(editingAssignment.resource_id) ===
        Number(resource.id)
        ? Number(editingAssignment.quantity)
        : 0)

    if (quantity > availableQuantity) {
      setError(
        `Only ${availableQuantity} units are available for this resource.`
      )
      return
    }

    try {
      setSaving(true)

      if (editingAssignment) {
        await updateMissionResource(
          editingAssignment.id,
          {
            quantity,
            status:
              resourceForm.status ||
              "Assigned",
          }
        )

        setSuccess(
          "Mission resource assignment updated."
        )
      } else {
        await assignMissionResource({
          mission_id:
            Number(resourceForm.mission_id),
          resource_id:
            Number(resourceForm.resource_id),
          quantity,
          status:
            resourceForm.status ||
            "Assigned",
        })

        setSuccess(
          "Resource assigned to mission."
        )
      }

      closeResourceModal()

      await loadData(true)
    } catch (err) {
      console.error(
        "Mission resource error:",
        err
      )

      setError(
        err?.message ||
          "Failed to save resource assignment."
      )
    } finally {
      setSaving(false)
    }
  }


  // ==========================================================
  // DELETE RESOURCE ASSIGNMENT
  // ==========================================================

  const handleDeleteAssignment = async (
    assignment
  ) => {
    if (!canManageMissions) {
      setError("Field Team accounts cannot delete resource assignments.")
      return
    }

    const resource =
      getResourceById(
        resources,
        assignment.resource_id
      )

    const confirmed = window.confirm(
      `Remove ${
        resource?.resource_type ||
        "this resource"
      } from the mission?`
    )

    if (!confirmed) return

    try {
      setError("")
      setSuccess("")

      await deleteMissionResource(
        assignment.id
      )

      setSuccess(
        "Mission resource assignment removed."
      )

      await loadData(true)
    } catch (err) {
      console.error(
        "Delete mission resource error:",
        err
      )

      setError(
        err?.message ||
          "Failed to remove resource assignment."
      )
    }
  }


  // ==========================================================
  // RESOURCE STATUS UPDATE
  // ==========================================================

  const handleResourceStatusChange = async (
    assignment,
    status
  ) => {
    if (!canManageMissions) {
      setError("Field Team accounts cannot change resource assignments.")
      return
    }

    try {
      setError("")
      setSuccess("")

      await updateMissionResource(
        assignment.id,
        {
          status,
        }
      )

      setSuccess(
        "Resource assignment status updated."
      )

      await loadData(true)
    } catch (err) {
      console.error(
        "Resource status error:",
        err
      )

      setError(
        err?.message ||
          "Failed to update resource status."
      )
    }
  }


  const handleLogisticsStatusChange = async (
    plan,
    status
  ) => {
    if (!canManageMissions) {
      setError("Field Team accounts cannot change logistics plans.")
      return
    }

    try {
      setError("")
      setSuccess("")

      await updateLogisticsStatus(plan.id, status)

      setLogisticsPlans((current) =>
        current.map((item) =>
          Number(item.id) === Number(plan.id)
            ? { ...item, status }
            : item
        )
      )

      setSuccess("Logistics status updated.")
    } catch (err) {
      console.error("Logistics status error:", err)

      setError(
        err?.message ||
          "Failed to update logistics status."
      )
    }
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">

          <div className="flex min-h-[500px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">

                <RefreshCw
                  size={26}
                  className="animate-spin text-red-600"
                />

              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Loading Mission Control
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Connecting to the disaster response system...
              </p>

            </div>

          </div>

        </div>
      </div>
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-sm">

                <ShieldAlert
                  size={21}
                  className="text-white"
                />

              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                  Emergency Operations
                </p>

                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Mission Control
                </h1>

              </div>

            </div>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {isFieldTeamAccount
                ? "View your assigned field missions and report completed operations."
                : "Create, assign and monitor field missions, response teams and mission resources in real time."}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-400">
              Operational area: {operationalArea || "All areas"}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Account: {currentUser?.name || currentUser?.email || "Operations user"}
            </p>

          </div>


          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >

              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>


            {canManageMissions && (
              <button
                type="button"
                onClick={openCreateMission}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <Plus size={18} />
                New Mission
              </button>
            )}

          </div>

        </div>


        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div className="flex-1">

              <p className="text-sm font-bold text-red-800">
                Mission Control Error
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-700"
            >
              <X size={18} />
            </button>

          </div>
        )}


        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div className="flex-1">

              <p className="text-sm font-bold text-emerald-800">
                Operation Successful
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                {success}
              </p>

            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-400 hover:text-emerald-700"
            >
              <X size={18} />
            </button>

          </div>
        )}


        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            icon={Activity}
            label="Total Missions"
            value={statistics.total}
            description="All registered missions"
          />

          <StatCard
            icon={Clock3}
            label="Pending"
            value={statistics.pending}
            description="Awaiting deployment"
          />

          <StatCard
            icon={Truck}
            label="Active"
            value={statistics.active}
            description="Currently in operation"
          />

          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={statistics.completed}
            description="Successfully completed"
          />

        </div>


        {/* ====================================================
            OPERATIONAL OVERVIEW
        ==================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <OverviewCard
            icon={AlertTriangle}
            label="Disasters"
            value={areaDisasters.length}
            description="Disasters in operational area"
          />

          <OverviewCard
            icon={Users}
            label="Field Teams"
            value={accountFieldTeams.length}
            description="Teams in operational area"
          />

          <OverviewCard
            icon={Package}
            label="Resources"
            value={areaResources.length}
            description="Resources in operational area"
          />

          <OverviewCard
            icon={Truck}
            label="Vehicles"
            value={areaVehicles.length}
            description="Vehicles in operational area"
          />

        </div>


        {/* ====================================================
            SEARCH + FILTER
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">

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
                placeholder="Search missions, locations, teams..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
              />

            </div>


            <div className="flex flex-wrap items-center gap-2">

              {[
                "All",
                "Pending",
                "Active",
                "In Progress",
                "Completed",
                "Cancelled",
              ].map((status) => (

                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter(status)
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    statusFilter === status
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>

              ))}

            </div>

          </div>

        </div>


        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* ==================================================
              MISSION LIST
          ================================================== */}

          <div className="xl:col-span-2">

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="font-bold text-slate-900">
                      Active Operations
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {filteredMissions.length} mission
                      {filteredMissions.length !== 1
                        ? "s"
                        : ""}{" "}
                      displayed
                    </p>

                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">

                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                    Live data

                  </div>

                </div>

              </div>


              {filteredMissions.length === 0 ? (

                <div className="flex min-h-[350px] items-center justify-center px-6">

                  <div className="text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

                      <ShieldAlert
                        size={28}
                        className="text-slate-400"
                      />

                    </div>

                    <h3 className="mt-4 font-bold text-slate-800">
                      No missions found
                    </h3>

                    <p className="mt-1 max-w-sm text-sm text-slate-500">
                      Create a mission or change the
                      current search and status filters.
                    </p>

                    {canManageMissions && (
                      <button
                        type="button"
                        onClick={openCreateMission}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                      >
                        Create Mission
                      </button>
                    )}

                  </div>

                </div>

              ) : (

                <div className="divide-y divide-slate-100">

                  {filteredMissions.map(
                    (mission) => {

                      const disaster =
                        getDisasterById(
                          disasters,
                          mission.disaster_id
                        )

                      const team =
                        getTeamById(
                          fieldTeams,
                          mission.field_team_id
                        )

                      const isSelected =
                        selectedMission &&
                        Number(
                          selectedMission.id
                        ) ===
                          Number(mission.id)

                      const assignmentCount =
                        missionResources.filter(
                          (item) =>
                            Number(
                              item.mission_id
                            ) ===
                            Number(mission.id)
                        ).length

                      return (
                        <div
                          key={mission.id}
                          className={`p-5 transition ${
                            isSelected
                              ? "bg-red-50/50"
                              : "hover:bg-slate-50"
                          }`}
                        >

                          <div className="flex flex-col gap-4">

                            {/* TOP */}

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                              <div className="flex gap-3">

                                <div
                                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    isSelected
                                      ? "bg-red-600 text-white"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >

                                  <ShieldAlert
                                    size={19}
                                  />

                                </div>

                                <div>

                                  <h3 className="font-bold text-slate-900">
                                    {mission.title}
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Mission ID #
                                    {mission.id}
                                  </p>

                                </div>

                              </div>


                              <span
                                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(
                                  mission.status
                                )}`}
                              >

                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                    mission.status
                                  )}`}
                                />

                                {translateStatus(t,
                                  mission.status
                                )}

                              </span>

                            </div>


                            {/* DETAILS */}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                              <InfoRow
                                icon={AlertTriangle}
                                label="Disaster"
                                value={
                                  disaster
                                    ? `${disaster.disaster_type} — ${disaster.location}`
                                    : mission.disaster_id
                                      ? `Disaster #${mission.disaster_id}`
                                      : "Not assigned"
                                }
                              />

                              <InfoRow
                                icon={Users}
                                label="Field Team"
                                value={
                                  team
                                    ? `${team.name} • ${team.members} members`
                                    : mission.field_team_id
                                      ? `Team #${mission.field_team_id}`
                                      : "Not assigned"
                                }
                              />

                              <InfoRow
                                icon={MapPin}
                                label="Mission Location"
                                value={
                                  mission.location ||
                                  disaster?.location ||
                                  "Not specified"
                                }
                              />

                              <InfoRow
                                icon={Boxes}
                                label="Resources"
                                value={`${assignmentCount} assignment${
                                  assignmentCount !== 1
                                    ? "s"
                                    : ""
                                }`}
                              />

                            </div>


                            {/* DESCRIPTION */}

                            {mission.description && (
                              <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                                {mission.description}
                              </p>
                            )}


                            {/* ACTIONS */}

                            <div className="flex flex-wrap items-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedMission(
                                    isSelected
                                      ? null
                                      : mission
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                  isSelected
                                    ? "bg-red-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {isSelected
                                  ? "Close Details"
                                  : "View Details"}
                              </button>


                              {canManageMissions && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openAssignResource(mission)}
                                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                                  >
                                    <Package size={14} />
                                    Assign Resource
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditMission(mission)}
                                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                                  >
                                    <Edit3 size={14} />
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMission(mission)}
                                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </>
                              )}


                              <div className="ml-auto">
                                {isFieldTeamAccount ? (
                                  normalize(mission.status) === "completed" ? (
                                    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                                      Completed
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMissionStatusChange(
                                          mission,
                                          "Completed"
                                        )
                                      }
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                    >
                                      Mark Completed
                                    </button>
                                  )
                                ) : (
                                  <select
                                    value={mission.status || "Pending"}
                                    onChange={(event) =>
                                      handleMissionStatusChange(
                                        mission,
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Active">Active</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                )}

                              </div>

                            </div>

                          </div>

                        </div>
                      )
                    }
                  )}

                </div>

              )}

            </div>

          </div>


          {/* ==================================================
              DETAILS PANEL
          ================================================== */}

          <div className="xl:col-span-1">

            <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {!selectedMission ? (

                <div className="flex min-h-[500px] flex-col items-center justify-center p-6 text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

                    <CircleDot
                      size={29}
                      className="text-slate-400"
                    />

                  </div>

                  <h3 className="mt-4 font-bold text-slate-900">
                    Mission Details
                  </h3>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Select a mission to view its
                    assigned resources and operational
                    information.
                  </p>

                </div>

              ) : (

                <>

                  {/* DETAILS HEADER */}

                  <div className="border-b border-slate-100 bg-slate-950 p-5 text-white">

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                          Mission #{selectedMission.id}
                        </p>

                        <h2 className="mt-1 text-lg font-bold">
                          {selectedMission.title}
                        </h2>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMission(
                            null
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        <X size={18} />
                      </button>

                    </div>

                    <div className="mt-4 flex items-center justify-between">

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          normalize(
                            selectedMission.status
                          ) === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-white"
                        }`}
                      >

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                            selectedMission.status
                          )}`}
                        />

                        {translateStatus(t,
                          selectedMission.status
                        )}

                      </span>

                      {canManageMissions && (
                        <button
                          type="button"
                          onClick={() => openAssignResource(selectedMission)}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                          <Plus size={14} />
                          Resource
                        </button>
                      )}

                    </div>

                  </div>


                  {/* MISSION INFO */}

                  <div className="space-y-4 p-5">

                    <DetailItem
                      icon={AlertTriangle}
                      label="Disaster"
                      value={
                        (() => {
                          const disaster =
                            getDisasterById(
                              disasters,
                              selectedMission.disaster_id
                            )

                          return disaster
                            ? `${disaster.disaster_type} — ${disaster.location}`
                            : `Disaster #${selectedMission.disaster_id}`
                        })()
                      }
                    />

                    <DetailItem
                      icon={Users}
                      label="Field Team"
                      value={
                        (() => {
                          const team =
                            getTeamById(
                              fieldTeams,
                              selectedMission.field_team_id
                            )

                          return team
                            ? `${team.name} • ${team.leader}`
                            : `Team #${selectedMission.field_team_id}`
                        })()
                      }
                    />

                    <DetailItem
                      icon={MapPin}
                      label="Location"
                      value={
                        selectedMission.location ||
                        "Not specified"
                      }
                    />

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                      <SnapshotItem
                        label="Disasters"
                        value={areaDisasters.length}
                      />
                      <SnapshotItem
                        label="Field Teams"
                        value={accountFieldTeams.length}
                      />
                      <SnapshotItem
                        label="Resources"
                        value={areaResources.length}
                      />
                      <SnapshotItem
                        label="Vehicles"
                        value={areaVehicles.length}
                      />
                    </div>


                    {/* DESCRIPTION */}

                    {selectedMission.description && (

                      <div>

                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Mission Brief
                        </p>

                        <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                          {
                            selectedMission.description
                          }
                        </p>

                      </div>

                    )}

                    <div className="pt-2">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Logistics Plans
                      </p>

                      {selectedLogisticsPlans.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                          No logistics plans linked to this disaster.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedLogisticsPlans.map((plan) => {
                            const vehicle = getVehicleById(
                              vehicles,
                              plan.vehicle_id
                            )

                            return (
                              <div
                                key={plan.id}
                                className="rounded-xl border border-slate-200 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">
                                      Logistics #{plan.id}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {plan.resource_type || "Resource"} · {translateStatus(t, plan.status)}
                                    </p>
                                  </div>
                                  <select
                                    disabled={!canManageMissions}
                                    value={plan.status || "planned"}
                                    onChange={(event) =>
                                      handleLogisticsStatusChange(
                                        plan,
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-red-500"
                                  >
                                    <option value="planned">Planned</option>
                                    <option value="dispatched">Dispatched</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                                <div className="mt-3 space-y-1 text-xs text-slate-600">
                                  <p>From: {plan.source_location || plan.from_location || "Not specified"}</p>
                                  <p>To: {plan.destination_location || plan.to_location || "Not specified"}</p>
                                  <p>Vehicle: {vehicle?.vehicle_number || plan.vehicle_number || plan.registration_number || plan.vehicle_id || "Not assigned"}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>


                    {/* RESOURCES */}

                    <div className="pt-2">

                      <div className="mb-3 flex items-center justify-between">

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Assigned Resources
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              selectedMissionResources.length
                            }{" "}
                            assignment
                            {selectedMissionResources.length !==
                            1
                              ? "s"
                              : ""}
                          </p>

                        </div>

                      </div>


                      {selectedMissionResources.length ===
                      0 ? (

                        <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">

                          <Package
                            size={23}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            No resources assigned
                          </p>

                          {canManageMissions && (
                            <button
                              type="button"
                              onClick={() => openAssignResource(selectedMission)}
                              className="mt-3 text-xs font-bold text-red-600 hover:text-red-700"
                            >
                              Assign first resource
                            </button>
                          )}

                        </div>

                      ) : (

                        <div className="space-y-2">

                          {selectedMissionResources.map(
                            (assignment) => {

                              const resource =
                                getResourceById(
                                  resources,
                                  assignment.resource_id
                                )

                              return (
                                <div
                                  key={
                                    assignment.id
                                  }
                                  className="rounded-xl border border-slate-200 p-3"
                                >

                                  <div className="flex items-start justify-between gap-3">

                                    <div className="flex gap-3">

                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">

                                        <Package
                                          size={17}
                                        />

                                      </div>

                                      <div>

                                        <p className="text-sm font-bold text-slate-800">
                                          {resource?.resource_type ||
                                            `Resource #${assignment.resource_id}`}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                          Quantity:{" "}
                                          <span className="font-bold text-slate-700">
                                            {
                                              assignment.quantity
                                            }
                                          </span>
                                        </p>

                                      </div>

                                    </div>


                                    {canManageMissions && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAssignment(assignment)}
                                        className="text-slate-300 hover:text-red-600"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}

                                  </div>


                                  <div className="mt-3 flex items-center justify-between gap-2">

                                    <select
                                      disabled={!canManageMissions}
                                      value={
                                        assignment.status ||
                                        "Assigned"
                                      }
                                      onChange={(event) =>
                                        handleResourceStatusChange(
                                          assignment,
                                          event.target
                                            .value
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 outline-none"
                                    >

                                      <option value="Assigned">
                                        Assigned
                                      </option>

                                      <option value="Dispatched">
                                        Dispatched
                                      </option>

                                      <option value="Delivered">
                                        Delivered
                                      </option>

                                      <option value="Returned">
                                        Returned
                                      </option>

                                    </select>


                                    {canManageMissions && (
                                      <button
                                        type="button"
                                        onClick={() => openEditAssignment(assignment)}
                                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600"
                                      >
                                        <Edit3 size={13} />
                                        Edit
                                      </button>
                                    )}

                                  </div>

                                </div>
                              )
                            }
                          )}

                        </div>

                      )}

                    </div>

                  </div>

                </>

              )}

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          CREATE / EDIT MISSION MODAL
      ====================================================== */}

      {showMissionModal && (

        <Modal
          title={
            editingMission
              ? "Edit Mission"
              : "Create New Mission"
          }
          subtitle={
            editingMission
              ? "Update the mission operational details."
              : "Create a field operation and assign it to a response team."
          }
          onClose={closeMissionModal}
        >

          <form
            onSubmit={handleMissionSubmit}
            className="space-y-5"
          >

            {/* TITLE */}

            <FormField
              label="Mission Title"
              required
            >

              <input
                name="title"
                type="text"
                value={missionForm.title}
                onChange={handleMissionChange}
                placeholder="e.g. Chennai Flood Rescue Operation"
                className={inputClass}
              />

            </FormField>


            {/* DISASTER + TEAM */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField
                label="Disaster"
                required
              >

                <select
                  name="disaster_id"
                  value={
                    missionForm.disaster_id
                  }
                  onChange={handleMissionChange}
                  className={inputClass}
                >

                  <option value="">
                    Select disaster
                  </option>

                  {areaDisasters.map(
                    (disaster) => (
                      <option
                        key={disaster.id}
                        value={disaster.id}
                      >
                        #{disaster.id} —{" "}
                        {
                          disaster.disaster_type
                        }{" "}
                        —{" "}
                        {disaster.location}
                      </option>
                    )
                  )}

                </select>

              </FormField>


              <FormField
                label="Field Team"
                required
              >

                <select
                  name="field_team_id"
                  value={
                    missionForm.field_team_id
                  }
                  onChange={handleMissionChange}
                  className={inputClass}
                >

                  <option value="">
                    Select field team
                  </option>

                  {accountFieldTeams.map(
                    (team) => (
                      <option
                        key={team.id}
                        value={team.id}
                      >
                        #{team.id} —{" "}
                        {team.name}
                      </option>
                    )
                  )}

                </select>

              </FormField>

            </div>


            {/* LOCATION + STATUS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField label="Mission Location">

                <input
                  name="location"
                  type="text"
                  value={
                    missionForm.location
                  }
                  onChange={handleMissionChange}
                  placeholder="e.g. Chennai Central"
                  className={inputClass}
                />

              </FormField>


              <FormField label="Status">

                <select
                  name="status"
                  value={
                    missionForm.status
                  }
                  onChange={handleMissionChange}
                  className={inputClass}
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>

                </select>

              </FormField>

            </div>


            {/* DESCRIPTION */}

            <FormField label="Mission Description">

              <textarea
                name="description"
                value={
                  missionForm.description
                }
                onChange={handleMissionChange}
                rows={4}
                placeholder="Describe the mission objective, response requirements and field instructions..."
                className={`${inputClass} resize-none`}
              />

            </FormField>


            {/* ACTIONS */}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

              <button
                type="button"
                onClick={closeMissionModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Saving..."
                  : editingMission
                    ? "Update Mission"
                    : "Create Mission"}

              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* ======================================================
          RESOURCE ASSIGNMENT MODAL
      ====================================================== */}

      {showResourceModal && (

        <Modal
          title={
            editingAssignment
              ? "Edit Resource Assignment"
              : "Assign Resource"
          }
          subtitle="Allocate available inventory to the selected field mission."
          onClose={closeResourceModal}
        >

          <form
            onSubmit={
              handleResourceSubmit
            }
            className="space-y-5"
          >

            {/* MISSION */}

            <FormField
              label="Mission"
              required
            >

              <select
                name="mission_id"
                value={
                  resourceForm.mission_id
                }
                onChange={handleResourceChange}
                disabled={
                  Boolean(
                    selectedMission &&
                      !editingAssignment
                  )
                }
                className={inputClass}
              >

                <option value="">
                  Select mission
                </option>

                {accountMissions.map(
                  (mission) => (
                    <option
                      key={mission.id}
                      value={mission.id}
                    >
                      #{mission.id} —{" "}
                      {mission.title}
                    </option>
                  )
                )}

              </select>

            </FormField>


            {/* RESOURCE */}

            <FormField
              label="Resource"
              required
            >

              <select
                name="resource_id"
                value={
                  resourceForm.resource_id
                }
                onChange={handleResourceChange}
                disabled={
                  Boolean(editingAssignment)
                }
                className={inputClass}
              >

                <option value="">
                  Select resource
                </option>

                {areaResources.map(
                  (resource) => (
                    <option
                      key={resource.id}
                      value={resource.id}
                    >
                      #{resource.id} —{" "}
                      {
                        resource.resource_type
                      }{" "}
                      — Available:{" "}
                      {resource.quantity}
                    </option>
                  )
                )}

              </select>

            </FormField>


            {/* QUANTITY + STATUS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField
                label="Quantity"
                required
              >

                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={
                    resourceForm.quantity
                  }
                  onChange={handleResourceChange}
                  placeholder="Enter quantity"
                  className={inputClass}
                />

              </FormField>


              <FormField label="Assignment Status">

                <select
                  name="status"
                  value={
                    resourceForm.status
                  }
                  onChange={handleResourceChange}
                  className={inputClass}
                >

                  <option value="Assigned">
                    Assigned
                  </option>

                  <option value="Dispatched">
                    Dispatched
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Returned">
                    Returned
                  </option>

                </select>

              </FormField>

            </div>


            {/* NOTE */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">

              <div className="flex gap-2">

                <Package
                  size={17}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <p className="text-xs leading-5 text-blue-700">
                  Assigning a resource uses the
                  backend inventory allocation logic.
                  The available quantity is validated
                  before the assignment is created.
                </p>

              </div>

            </div>


            {/* ACTIONS */}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

              <button
                type="button"
                onClick={closeResourceModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Saving..."
                  : editingAssignment
                    ? "Update Assignment"
                    : "Assign Resource"}

              </button>

            </div>

          </form>

        </Modal>

      )}

    </div>
  )
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">

          <Icon size={20} />

        </div>

      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>

    </div>
  )
}


// ============================================================
// OVERVIEW CARD
// ============================================================

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">

        <Icon size={20} />

      </div>

      <div>

        <p className="text-xs font-semibold text-slate-400">
          {label}
        </p>

        <p className="text-xl font-bold text-slate-900">
          {value}
        </p>

        <p className="text-xs text-slate-500">
          {description}
        </p>

      </div>

    </div>
  )
}


function SnapshotItem({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}


// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-2.5">

      <Icon
        size={16}
        className="mt-0.5 shrink-0 text-slate-400"
      />

      <div className="min-w-0">

        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
          {value}
        </p>

      </div>

    </div>
  )
}


// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">

        <Icon size={17} />

      </div>

      <div className="min-w-0">

        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
          {value}
        </p>

      </div>

    </div>
  )
}


// ============================================================
// FORM FIELD
// ============================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"


function FormField({
  label,
  required = false,
  children,
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>
  )
}


// ============================================================
// MODAL
// ============================================================

function Modal({
  title,
  subtitle,
  onClose,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>

        </div>


        {/* BODY */}

        <div className="p-5">
          {children}
        </div>

      </div>

    </div>
  )
}


export default Missions