// ============================================================
// Vehicles.jsx
// AI-Based Disaster Response Management System
// Fleet Command + Live GPS + Route & ETA
// ============================================================

import { useEffect, useMemo, useState } from "react"

import {
  Truck,
  RefreshCw,
  Plus,
  AlertTriangle,
  X,
  CheckCircle2,
  MapPin,
  UserRound,
  Trash2,
  Navigation,
  Clock3,
  Route,
  LocateFixed,
  Search,
  Activity,
  ShieldCheck,
  Wrench,
  Eye,
  Radio,
  Target,
  Gauge,
} from "lucide-react"

import StatusBadge from "../components/StatusBadge"

import {
  getVehicles,
  createVehicle,
  deleteVehicle,
  updateVehicleLocation,
  getVehicleLocation,
  getRouteETA,
  getZones,
} from "../services/api"
import { useLanguage } from "../i18n.jsx"

// ============================================================
// HELPERS
// ============================================================

const normalize = (value) =>
  String(value ?? "").trim().toLowerCase()

const getVehicleCoordinates = (vehicle) => {
  const latitude =
    vehicle?.latitude ??
    vehicle?.lat ??
    vehicle?.location?.latitude ??
    null

  const longitude =
    vehicle?.longitude ??
    vehicle?.lng ??
    vehicle?.location?.longitude ??
    null

  return {
    latitude,
    longitude,
  }
}

const getList = (response) => {
  if (Array.isArray(response)) return response

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.vehicles)) {
    return response.vehicles
  }

  if (Array.isArray(response?.zones)) {
    return response.zones
  }

  if (Array.isArray(response?.results)) {
    return response.results
  }

  return []
}

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") {
    return "N/A"
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return String(value)
  }

  return number.toFixed(digits)
}

const isMaintenanceVehicle = (vehicle) =>
  normalize(vehicle?.status) === "maintenance"

const isAvailableVehicle = (vehicle) =>
  normalize(vehicle?.status) === "available"

const isValidCoordinate = (latitude, longitude) =>
  Number.isFinite(Number(latitude)) &&
  Number(latitude) >= -90 &&
  Number(latitude) <= 90 &&
  Number.isFinite(Number(longitude)) &&
  Number(longitude) >= -180 &&
  Number(longitude) <= 180

// ============================================================
// VEHICLES
// ============================================================

function Vehicles() {
  const { t } = useLanguage()
  // ==========================================================
  // DATA
  // ==========================================================

  const [vehicles, setVehicles] = useState([])
  const [zones, setZones] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingZones, setLoadingZones] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")

  // ==========================================================
  // ADD VEHICLE
  // ==========================================================

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type: "",
    driver_name: "",
    location: "",
    status: "Available",
  })

  // ==========================================================
  // DELETE
  // ==========================================================

  const [deletingId, setDeletingId] = useState(null)

  // ==========================================================
  // DETAILS
  // ==========================================================

  const [selectedVehicle, setSelectedVehicle] = useState(null)

  // ==========================================================
  // LOCATION UPDATE
  // ==========================================================

  const [selectedLocationVehicle, setSelectedLocationVehicle] =
    useState(null)

  const [locationForm, setLocationForm] = useState({
    latitude: "",
    longitude: "",
  })

  const [updatingLocation, setUpdatingLocation] = useState(false)

  // ==========================================================
  // LOCATION RETRIEVAL
  // ==========================================================

  const [locatingId, setLocatingId] = useState(null)

  // ==========================================================
  // ROUTE + ETA
  // ==========================================================

  const [selectedRouteVehicle, setSelectedRouteVehicle] =
    useState("")

  const [selectedZone, setSelectedZone] = useState("")

  const [averageSpeed, setAverageSpeed] = useState("40")

  const [routeResult, setRouteResult] = useState(null)

  const [routeLoading, setRouteLoading] = useState(false)

  // ==========================================================
  // LOAD VEHICLES
  // ==========================================================

  const loadVehicles = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getVehicles()
      const vehicleData = getList(data)

      setVehicles(vehicleData)
    } catch (err) {
      console.error("Failed to load vehicles:", err)

      setError(
        err?.message ||
          "Failed to load vehicle fleet from the backend."
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // LOAD ZONES
  // ==========================================================

  const loadZones = async () => {
    try {
      setLoadingZones(true)

      const data = await getZones()
      const zoneData = getList(data)

      setZones(zoneData)
    } catch (err) {
      console.error("Failed to load zones:", err)

      setError(
        err?.message ||
          "Failed to load disaster zones from the backend."
      )
    } finally {
      setLoadingZones(false)
    }
  }

  // ==========================================================
  // REFRESH ALL
  // ==========================================================

  const refreshAll = async () => {
    setError("")
    setSuccess("")

    await Promise.all([
      loadVehicles(),
      loadZones(),
    ])

    setSuccess("Fleet and disaster-zone data refreshed.")
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadVehicles()
    loadZones()
  }, [])

  // ==========================================================
  // VEHICLE TYPES
  // ==========================================================

  const vehicleTypes = useMemo(() => {
    const types = vehicles
      .map((vehicle) => vehicle?.vehicle_type)
      .filter(Boolean)

    return [...new Set(types)].sort()
  }, [vehicles])

  // ==========================================================
  // FILTERED VEHICLES
  // ==========================================================

  const filteredVehicles = useMemo(() => {
    const query = normalize(search)

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        normalize(vehicle?.vehicle_number).includes(query) ||
        normalize(vehicle?.vehicle_type).includes(query) ||
        normalize(vehicle?.driver_name).includes(query) ||
        normalize(vehicle?.location).includes(query)

      const matchesStatus =
        statusFilter === "All" ||
        normalize(vehicle?.status) ===
          normalize(statusFilter)

      const matchesType =
        typeFilter === "All" ||
        normalize(vehicle?.vehicle_type) ===
          normalize(typeFilter)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      )
    })
  }, [
    vehicles,
    search,
    statusFilter,
    typeFilter,
  ])

  // ==========================================================
  // FLEET STATS
  // ==========================================================

  const fleetStats = useMemo(() => {
    const available = vehicles.filter(
      (vehicle) =>
        normalize(vehicle?.status) ===
        "available"
    ).length

    const deployed = vehicles.filter(
      (vehicle) =>
        normalize(vehicle?.status) ===
        "deployed"
    ).length

    const maintenance = vehicles.filter(
      (vehicle) =>
        normalize(vehicle?.status) ===
        "maintenance"
    ).length

    const pending = vehicles.filter(
      (vehicle) =>
        normalize(vehicle?.status) ===
        "pending"
    ).length

    const gpsEnabled = vehicles.filter(
      (vehicle) => {
        const { latitude, longitude } =
          getVehicleCoordinates(vehicle)

        return isValidCoordinate(
          latitude,
          longitude
        )
      }
    ).length

    return {
      total: vehicles.length,
      available,
      deployed,
      maintenance,
      pending,
      gpsEnabled,
    }
  }, [vehicles])

  // ==========================================================
  // ROUTABLE VEHICLES
  // ==========================================================

  const routableVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        !isMaintenanceVehicle(vehicle)
    )
  }, [vehicles])

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError("")
    setSuccess("")
  }

  // ==========================================================
  // ADD VEHICLE
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    const vehicleNumber =
      form.vehicle_number.trim()

    const vehicleType =
      form.vehicle_type.trim()

    const driverName =
      form.driver_name.trim()

    const location =
      form.location.trim()

    if (
      !vehicleNumber ||
      !vehicleType ||
      !driverName ||
      !location
    ) {
      setError(
        "Please complete all required vehicle fields."
      )
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await createVehicle({
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        driver_name: driverName,
        location,
        status: form.status,
      })

      setForm({
        vehicle_number: "",
        vehicle_type: "",
        driver_name: "",
        location: "",
        status: "Available",
      })

      setShowForm(false)

      await loadVehicles()

      setSuccess(
        `${vehicleNumber} registered successfully.`
      )
    } catch (err) {
      console.error(
        "Failed to add vehicle:",
        err
      )

      setError(
        err?.message ||
          "Failed to register vehicle."
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // DELETE VEHICLE
  // ==========================================================

  const handleDelete = async (id) => {
    const vehicle =
      vehicles.find(
        (item) => item.id === id
      )

    const vehicleName =
      vehicle?.vehicle_number ||
      `Vehicle #${id}`

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${vehicleName}?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      setError("")
      setSuccess("")

      await deleteVehicle(id)

      if (
        String(selectedRouteVehicle) ===
        String(id)
      ) {
        setSelectedRouteVehicle("")
        setRouteResult(null)
      }

      if (
        selectedVehicle?.id === id
      ) {
        setSelectedVehicle(null)
      }

      await loadVehicles()

      setSuccess(
        `${vehicleName} deleted successfully.`
      )
    } catch (err) {
      console.error(
        "Failed to delete vehicle:",
        err
      )

      setError(
        err?.message ||
          "Failed to delete vehicle."
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ==========================================================
  // OPEN LOCATION UPDATE
  // ==========================================================

  const openLocationUpdate = (vehicle) => {
    const {
      latitude,
      longitude,
    } = getVehicleCoordinates(vehicle)

    setSelectedLocationVehicle(vehicle)

    setLocationForm({
      latitude:
        latitude ?? "",
      longitude:
        longitude ?? "",
    })

    setError("")
    setSuccess("")
  }

  // ==========================================================
  // CLOSE LOCATION UPDATE
  // ==========================================================

  const closeLocationUpdate = () => {
    setSelectedLocationVehicle(null)

    setLocationForm({
      latitude: "",
      longitude: "",
    })
  }

  // ==========================================================
  // LOCATION FORM CHANGE
  // ==========================================================

  const handleLocationChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setLocationForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    )

    setError("")
    setSuccess("")
  }

  // ==========================================================
  // UPDATE VEHICLE LOCATION
  // ==========================================================

  const handleUpdateLocation = async (
    event
  ) => {
    event.preventDefault()

    if (!selectedLocationVehicle) {
      setError(
        "Please select a vehicle."
      )
      return
    }

    const latitude = Number(
      locationForm.latitude
    )

    const longitude = Number(
      locationForm.longitude
    )

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError(
        "Please enter a valid latitude between -90 and 90."
      )
      return
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Please enter a valid longitude between -180 and 180."
      )
      return
    }

    try {
      setUpdatingLocation(true)
      setError("")
      setSuccess("")

      await updateVehicleLocation(
        selectedLocationVehicle.id,
        latitude,
        longitude
      )

      const vehicleNumber =
        selectedLocationVehicle.vehicle_number ||
        `Vehicle #${selectedLocationVehicle.id}`

      closeLocationUpdate()

      await loadVehicles()

      setSuccess(
        `Live GPS location updated for ${vehicleNumber}.`
      )
    } catch (err) {
      console.error(
        "Failed to update vehicle location:",
        err
      )

      setError(
        err?.message ||
          "Failed to update vehicle location."
      )
    } finally {
      setUpdatingLocation(false)
    }
  }

  // ==========================================================
  // GET CURRENT LOCATION
  // ==========================================================

  const handleGetVehicleLocation = async (
    vehicle
  ) => {
    try {
      setLocatingId(vehicle.id)
      setError("")
      setSuccess("")

      const result =
        await getVehicleLocation(
          vehicle.id
        )

      const latitude =
        result?.latitude ??
        result?.lat ??
        result?.location?.latitude ??
        result?.data?.latitude

      const longitude =
        result?.longitude ??
        result?.lng ??
        result?.location?.longitude ??
        result?.data?.longitude

      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        throw new Error(
          "The backend did not return valid GPS coordinates for this vehicle."
        )
      }

      await loadVehicles()

      setSuccess(
        `Current GPS location retrieved for ${vehicle.vehicle_number}.`
      )
    } catch (err) {
      console.error(
        "Failed to get vehicle location:",
        err
      )

      setError(
        err?.message ||
          "Failed to retrieve vehicle location."
      )
    } finally {
      setLocatingId(null)
    }
  }

  // ==========================================================
  // CALCULATE ROUTE
  // ==========================================================

  const handleCalculateRoute = async () => {
    if (!selectedRouteVehicle) {
      setError(
        "Please select a response vehicle."
      )
      return
    }

    if (!selectedZone) {
      setError(
        "Please select a disaster zone."
      )
      return
    }

    const selectedVehicle = vehicles.find(
      (vehicle) =>
        String(vehicle.id) ===
        String(selectedRouteVehicle)
    )

    if (!selectedVehicle) {
      setError(
        "Selected vehicle could not be found."
      )
      return
    }

    if (isMaintenanceVehicle(selectedVehicle)) {
      setError(
        "Maintenance vehicles cannot be used for active route planning."
      )
      return
    }

    const speed =
      Number(averageSpeed)

    if (
      !Number.isFinite(speed) ||
      speed <= 0
    ) {
      setError(
        "Please enter a valid average speed greater than 0."
      )
      return
    }

    try {
      setRouteLoading(true)
      setError("")
      setSuccess("")
      setRouteResult(null)

      const result =
        await getRouteETA({
          vehicle_id:
            Number(selectedRouteVehicle),

          zone_id:
            Number(selectedZone),

          average_speed_kmph:
            speed,
        })

      setRouteResult(result)

      setSuccess(
        "Route and ETA calculated successfully by the backend."
      )
    } catch (err) {
      console.error(
        "Route calculation failed:",
        err
      )

      setError(
        err?.message ||
          "Failed to calculate route and ETA."
      )
    } finally {
      setRouteLoading(false)
    }
  }

  // ==========================================================
  // SELECTED ROUTE VEHICLE
  // ==========================================================

  const routeVehicle = useMemo(() => {
    if (!selectedRouteVehicle) {
      return null
    }

    return (
      vehicles.find(
        (vehicle) =>
          String(vehicle.id) ===
          String(selectedRouteVehicle)
      ) || null
    )
  }, [
    vehicles,
    selectedRouteVehicle,
  ])

  // ==========================================================
  // SELECTED ROUTE ZONE
  // ==========================================================

  const routeZone = useMemo(() => {
    if (!selectedZone) {
      return null
    }

    return (
      zones.find(
        (zone) =>
          String(zone.id) ===
          String(selectedZone)
      ) || null
    )
  }, [
    zones,
    selectedZone,
  ])

  // ==========================================================
  // ROUTE RESULT
  // ==========================================================

  const routeDistance =
    routeResult?.distance_km ??
    routeResult?.distance ??
    routeResult?.route?.distance_km ??
    routeResult?.route?.distance ??
    null

  const routeETA =
    routeResult?.eta_minutes ??
    routeResult?.estimated_time_minutes ??
    routeResult?.eta ??
    routeResult?.route?.eta_minutes ??
    routeResult?.route?.estimated_time_minutes ??
    null

  const routeSource =
    routeResult?.routing_source ??
    routeResult?.source ??
    routeResult?.route_source ??
    routeResult?.route?.source ??
    null

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="mb-7">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Truck size={17} />
              </span>

              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">
                Response Fleet Control
              </span>

            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {t("vehicles")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage response vehicles, monitor live GPS
              coordinates, check operational readiness and
              calculate backend-powered disaster response routes.
            </p>

          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            <button
              type="button"
              onClick={refreshAll}
              disabled={
                loading ||
                loadingZones
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  loading ||
                  loadingZones
                    ? "animate-spin"
                    : ""
                }
              />

              {t("refreshFleet")}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm(true)
                setError("")
                setSuccess("")
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md"
            >
              <Plus size={17} />
              {t("addVehicle")}
            </button>

          </div>

        </div>

      </div>

      {/* ====================================================
          ALERTS
      ==================================================== */}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle size={18} />
          </div>

          <div className="min-w-0">

            <p className="text-sm font-bold text-red-900">
              Fleet operation failed
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">
              {error}
            </p>

          </div>

        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>

          <p className="text-sm font-bold text-emerald-800">
            {success}
          </p>

        </div>
      )}

      {/* ====================================================
          COMMAND SUMMARY
      ==================================================== */}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

        {/* TOTAL */}

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-slate-50" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Truck size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Fleet
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-slate-950">
            {fleetStats.total}
          </p>

          <p className="relative mt-1 text-xs font-medium text-slate-500">
            Registered vehicles
          </p>

        </div>

        {/* AVAILABLE */}

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-emerald-100/60" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <ShieldCheck size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Ready
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-emerald-800">
            {fleetStats.available}
          </p>

          <p className="relative mt-1 text-xs font-medium text-emerald-700">
            Available for deployment
          </p>

        </div>

        {/* DEPLOYED */}

        <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-5">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-red-100/60" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
              <Activity size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
              Active
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-red-800">
            {fleetStats.deployed}
          </p>

          <p className="relative mt-1 text-xs font-medium text-red-700">
            Currently deployed
          </p>

        </div>

        {/* MAINTENANCE */}

        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-amber-100/60" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
              <Wrench size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Service
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-amber-800">
            {fleetStats.maintenance}
          </p>

          <p className="relative mt-1 text-xs font-medium text-amber-700">
            Under maintenance
          </p>

        </div>

        {/* PENDING */}

        <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-5">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-sky-100/60" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
              <Clock3 size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">
              Queue
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-sky-800">
            {fleetStats.pending}
          </p>

          <p className="relative mt-1 text-xs font-medium text-sky-700">
            Pending operations
          </p>

        </div>

        {/* GPS */}

        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 p-5">

          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-violet-100/60" />

          <div className="relative flex items-center justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
              <LocateFixed size={19} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">
              GPS
            </span>

          </div>

          <p className="relative mt-4 text-3xl font-black text-violet-800">
            {fleetStats.gpsEnabled}
          </p>

          <p className="relative mt-1 text-xs font-medium text-violet-700">
            Vehicles with coordinates
          </p>

        </div>

      </div>

      {/* ====================================================
          ADD VEHICLE
      ==================================================== */}

      {showForm && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Plus size={19} />
              </div>

              <div>

                <h2 className="text-sm font-black text-slate-900">
                  Register Response Vehicle
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create a vehicle record in the FastAPI fleet database.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowForm(false)
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-900"
            >
              <X size={18} />
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
          >

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Vehicle Number
              </label>

              <input
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                required
                placeholder="e.g. TN-38-AB-1234"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Vehicle Type
              </label>

              <input
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
                required
                placeholder="e.g. Rescue Truck"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Driver Name
              </label>

              <input
                name="driver_name"
                value={form.driver_name}
                onChange={handleChange}
                required
                placeholder="Assigned driver"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Current Location
              </label>

              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="e.g. Coimbatore"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Operational Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
              >
                <option value="Available">
                  Available
                </option>

                <option value="Deployed">
                  Deployed
                </option>

                <option value="Maintenance">
                  Maintenance
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>
            </div>

            <div className="flex items-end">

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Register Vehicle
                  </>
                )}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* ====================================================
          LIVE LOCATION UPDATE
      ==================================================== */}

      {selectedLocationVehicle && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50 px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <LocateFixed size={19} />
              </div>

              <div>

                <h2 className="text-sm font-black text-slate-900">
                  Update Live GPS Location
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {selectedLocationVehicle.vehicle_number}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={closeLocationUpdate}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900"
            >
              <X size={18} />
            </button>

          </div>

          <form
            onSubmit={handleUpdateLocation}
            className="grid gap-4 p-5 md:grid-cols-3"
          >

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Latitude
              </label>

              <input
                type="number"
                step="any"
                name="latitude"
                value={locationForm.latitude}
                onChange={handleLocationChange}
                required
                placeholder="11.0168"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Longitude
              </label>

              <input
                type="number"
                step="any"
                name="longitude"
                value={locationForm.longitude}
                onChange={handleLocationChange}
                required
                placeholder="76.9558"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50"
              />
            </div>

            <div className="flex items-end">

              <button
                type="submit"
                disabled={updatingLocation}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
              >

                {updatingLocation ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Update Location
                  </>
                )}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* ====================================================
          ROUTE & ETA
      ==================================================== */}

      <div className="mb-5 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">

        <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Route size={19} />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-sm font-black text-slate-900">
                  AI Logistics Route & ETA
                </h2>

                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-700">
                  Backend Powered
                </span>

              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Select a response vehicle and disaster zone to calculate
                backend distance and estimated travel time.
              </p>

            </div>

          </div>

        </div>

        <div className="p-5">

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* VEHICLE */}

            <div>

              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Response Vehicle
              </label>

              <select
                value={selectedRouteVehicle}
                onChange={(event) => {
                  setSelectedRouteVehicle(
                    event.target.value
                  )

                  setRouteResult(null)
                  setError("")
                  setSuccess("")
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
              >

                <option value="">
                  Select Vehicle
                </option>

                {routableVehicles.map(
                  (vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                    >
                      {vehicle.vehicle_number}
                      {vehicle.status
                        ? ` — ${vehicle.status}`
                        : ""}
                    </option>
                  )
                )}

              </select>

              {routableVehicles.length === 0 && (
                <p className="mt-1.5 text-[10px] font-semibold text-red-500">
                  No operational vehicles available.
                </p>
              )}

            </div>

            {/* ZONE */}

            <div>

              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Disaster Zone
              </label>

              <select
                value={selectedZone}
                onChange={(event) => {
                  setSelectedZone(
                    event.target.value
                  )

                  setRouteResult(null)
                  setError("")
                  setSuccess("")
                }}
                disabled={loadingZones}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 disabled:bg-slate-100"
              >

                <option value="">
                  {loadingZones
                    ? "Loading zones..."
                    : "Select Zone"}
                </option>

                {zones.map(
                  (zone) => (
                    <option
                      key={zone.id}
                      value={zone.id}
                    >
                      {zone.grid_cell_id ||
                        `Zone ${zone.id}`}
                      {zone.location
                        ? ` — ${zone.location}`
                        : ""}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* SPEED */}

            <div>

              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Average Speed
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={averageSpeed}
                  onChange={(event) =>
                    setAverageSpeed(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-16 text-sm font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                  km/h
                </span>

              </div>

            </div>

            {/* BUTTON */}

            <div className="flex items-end">

              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={
                  routeLoading ||
                  !selectedRouteVehicle ||
                  !selectedZone
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {routeLoading ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    Calculate Route
                  </>
                )}

              </button>

            </div>

          </div>

          {/* SELECTED CONTEXT */}

          {(routeVehicle || routeZone) && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {routeVehicle && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <div className="flex items-center justify-between">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Selected Vehicle
                    </p>

                    <Truck
                      size={16}
                      className="text-red-600"
                    />

                  </div>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {routeVehicle.vehicle_number}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {routeVehicle.vehicle_type ||
                      "Vehicle type unavailable"}
                    {" · "}
                    {routeVehicle.location ||
                      "Location unavailable"}
                  </p>

                  <div className="mt-3 flex items-center gap-2">

                    <StatusBadge
                      status={routeVehicle.status}
                    />

                    {isAvailableVehicle(
                      routeVehicle
                    ) && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        Ready for dispatch
                      </span>
                    )}

                  </div>

                </div>
              )}

              {routeZone && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <div className="flex items-center justify-between">

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Destination Zone
                    </p>

                    <Target
                      size={16}
                      className="text-red-600"
                    />

                  </div>

                  <p className="mt-2 text-sm font-black text-slate-900">
                    {routeZone.grid_cell_id ||
                      `Zone ${routeZone.id}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {routeZone.location ||
                      "Location unavailable"}
                  </p>

                  {routeZone.priority && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-600">
                      Priority: {routeZone.priority}
                    </p>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ROUTE RESULT */}

          {routeResult && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">

              <div className="flex items-center gap-3 border-b border-emerald-200 px-5 py-4">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>

                <div>

                  <h3 className="text-sm font-black text-emerald-900">
                    Route Calculation Complete
                  </h3>

                  <p className="mt-0.5 text-xs text-emerald-700">
                    Response received from the logistics route API.
                  </p>

                </div>

              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">

                {/* DISTANCE */}

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <div className="flex items-center gap-2">

                    <Route
                      size={16}
                      className="text-red-600"
                    />

                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Distance
                    </span>

                  </div>

                  <p className="mt-3 text-2xl font-black text-slate-950">

                    {routeDistance !== null
                      ? `${formatNumber(
                          routeDistance,
                          2
                        )} km`
                      : "N/A"}

                  </p>

                </div>

                {/* ETA */}

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <div className="flex items-center gap-2">

                    <Clock3
                      size={16}
                      className="text-violet-600"
                    />

                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      ETA
                    </span>

                  </div>

                  <p className="mt-3 text-2xl font-black text-slate-950">

                    {routeETA !== null
                      ? `${formatNumber(
                          routeETA,
                          0
                        )} min`
                      : "N/A"}

                  </p>

                </div>

                {/* VEHICLE */}

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <div className="flex items-center gap-2">

                    <Truck
                      size={16}
                      className="text-red-600"
                    />

                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Vehicle
                    </span>

                  </div>

                  <p className="mt-3 text-lg font-black text-slate-950">

                    {routeVehicle?.vehicle_number ||
                      routeResult?.vehicle_number ||
                      `#${selectedRouteVehicle}`}

                  </p>

                </div>

                {/* SOURCE */}

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <div className="flex items-center gap-2">

                    <Radio
                      size={16}
                      className="text-emerald-600"
                    />

                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Routing Source
                    </span>

                  </div>

                  <p className="mt-3 text-sm font-black text-slate-950">
                    {routeSource ||
                      "Backend Route"}
                  </p>

                </div>

              </div>

              <div className="grid gap-3 border-t border-emerald-200 p-5 md:grid-cols-2">

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Route Status
                  </p>

                  <div className="mt-2 flex items-center gap-2">

                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                    <p className="text-sm font-bold text-emerald-700">
                      Successfully calculated
                    </p>

                  </div>

                </div>

                <div className="rounded-xl border border-emerald-100 bg-white p-4">

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Destination
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {routeZone?.location ||
                      routeResult?.destination ||
                      "Selected disaster zone"}
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* ====================================================
          SEARCH + FILTER
      ==================================================== */}

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

          <div className="relative flex-1">

            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search vehicle number, type, driver or location..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
            />

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            >

              <option value="All">
                All Statuses
              </option>

              <option value="Available">
                Available
              </option>

              <option value="Deployed">
                Deployed
              </option>

              <option value="Maintenance">
                Maintenance
              </option>

              <option value="Pending">
                Pending
              </option>

            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            >

              <option value="All">
                All Vehicle Types
              </option>

              {vehicleTypes.map(
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

        <div className="mt-3 flex items-center justify-between">

          <p className="text-xs font-medium text-slate-400">

            Showing{" "}

            <span className="font-black text-slate-600">
              {filteredVehicles.length}
            </span>

            {" "}of{" "}

            <span className="font-black text-slate-600">
              {vehicles.length}
            </span>

            {" "}vehicle records

          </p>

          {(search ||
            statusFilter !== "All" ||
            typeFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("All")
                setTypeFilter("All")
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700"
            >
              Clear filters
            </button>
          )}

        </div>

      </div>

      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">

            <RefreshCw
              size={24}
              className="animate-spin text-red-600"
            />

          </div>

          <p className="mt-4 text-sm font-black text-slate-800">
            Loading response fleet
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Retrieving vehicle records from FastAPI...
          </p>

        </div>
      )}

      {/* ====================================================
          EMPTY DATABASE
      ==================================================== */}

      {!loading &&
        vehicles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Truck size={29} />
            </div>

            <h3 className="mt-5 text-sm font-black text-slate-900">
              No vehicles registered
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
              The live backend currently contains no vehicle
              records. Register a response vehicle to begin
              fleet operations.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowForm(true)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              <Plus size={16} />
              Register Vehicle
            </button>

          </div>
        )}

      {/* ====================================================
          FILTER EMPTY
      ==================================================== */}

      {!loading &&
        vehicles.length > 0 &&
        filteredVehicles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search size={25} />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              No matching vehicles
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Try changing the search text or active filters.
            </p>

          </div>
        )}

      {/* ====================================================
          VEHICLE TABLE
      ==================================================== */}

      {!loading &&
        filteredVehicles.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="text-sm font-black text-slate-900">
                    Registered Response Vehicles
                  </h2>

                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                    LIVE DATA
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Vehicle records synchronized with the FastAPI backend.
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">

                <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                {filteredVehicles.length} visible

              </div>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1300px] text-left">

                <thead className="border-b border-slate-200 bg-slate-50">

                  <tr>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      ID
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Vehicle
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Driver
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Current Location
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      GPS Coordinates
                    </th>

                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Operations
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredVehicles.map(
                    (vehicle) => {

                      const {
                        latitude,
                        longitude,
                      } =
                        getVehicleCoordinates(
                          vehicle
                        )

                      const gpsAvailable =
                        isValidCoordinate(
                          latitude,
                          longitude
                        )

                      return (
                        <tr
                          key={vehicle.id}
                          className="transition hover:bg-red-50/20"
                        >

                          {/* ID */}

                          <td className="px-5 py-4">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                              #{vehicle.id}
                            </span>

                          </td>

                          {/* VEHICLE */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <Truck size={18} />
                              </div>

                              <div>

                                <p className="text-sm font-black text-slate-900">
                                  {vehicle.vehicle_number ||
                                    "Unnamed Vehicle"}
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-slate-400">
                                  {vehicle.vehicle_type ||
                                    "Type unavailable"}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* DRIVER */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <UserRound size={15} />
                              </div>

                              <span className="text-sm font-semibold text-slate-700">
                                {vehicle.driver_name ||
                                  "Not assigned"}
                              </span>

                            </div>

                          </td>

                          {/* LOCATION */}

                          <td className="px-5 py-4">

                            <div className="flex max-w-[220px] items-start gap-2">

                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-red-500"
                              />

                              <span className="text-sm font-medium leading-5 text-slate-600">
                                {vehicle.location ||
                                  "Location unavailable"}
                              </span>

                            </div>

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <StatusBadge
                              status={
                                vehicle.status
                              }
                            />

                          </td>

                          {/* GPS */}

                          <td className="px-5 py-4">

                            {gpsAvailable ? (
                              <div>

                                <div className="flex items-center gap-2">

                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                    <LocateFixed
                                      size={14}
                                    />
                                  </span>

                                  <span className="text-xs font-bold text-emerald-700">
                                    GPS Available
                                  </span>

                                </div>

                                <p className="mt-1 text-[10px] font-medium text-slate-400">
                                  {formatNumber(
                                    latitude,
                                    5
                                  )}
                                  {" , "}
                                  {formatNumber(
                                    longitude,
                                    5
                                  )}
                                </p>

                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
                                GPS unavailable
                              </span>
                            )}

                          </td>

                          {/* OPERATIONS */}

                          <td className="px-5 py-4">

                            <div className="flex flex-wrap gap-2">

                              {/* VIEW */}

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedVehicle(
                                    vehicle
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                              >
                                <Eye size={14} />
                                View
                              </button>

                              {/* UPDATE */}

                              <button
                                type="button"
                                onClick={() =>
                                  openLocationUpdate(
                                    vehicle
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                              >
                                <MapPin size={14} />
                                Update
                              </button>

                              {/* LOCATE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleGetVehicleLocation(
                                    vehicle
                                  )
                                }
                                disabled={
                                  locatingId ===
                                  vehicle.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <LocateFixed
                                  size={14}
                                  className={
                                    locatingId ===
                                    vehicle.id
                                      ? "animate-spin"
                                      : ""
                                  }
                                />

                                {locatingId ===
                                vehicle.id
                                  ? "Locating..."
                                  : "Locate"}

                              </button>

                              {/* DELETE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    vehicle.id
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  vehicle.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <Trash2
                                  size={14}
                                />

                                {deletingId ===
                                vehicle.id
                                  ? "Deleting..."
                                  : "Delete"}

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

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-[11px] font-medium text-slate-500">

                Showing{" "}

                <span className="font-black text-slate-700">
                  {filteredVehicles.length}
                </span>

                {" "}vehicle records from the live backend.

              </p>

              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                Backend Connected

              </div>

            </div>

          </div>
        )}

      {/* ====================================================
          VEHICLE DETAILS MODAL
      ==================================================== */}

      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Truck size={20} />
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
                    Vehicle Record
                  </p>

                  <h2 className="mt-0.5 text-lg font-black text-slate-900">
                    {selectedVehicle.vehicle_number ||
                      `Vehicle #${selectedVehicle.id}`}
                  </h2>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedVehicle(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>

            </div>

            {/* DETAILS */}

            <div className="grid gap-4 p-5 sm:grid-cols-2">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Vehicle ID
                </p>

                <p className="mt-2 text-sm font-black text-slate-900">
                  #{selectedVehicle.id}
                </p>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={
                      selectedVehicle.status
                    }
                  />
                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Vehicle Type
                </p>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {selectedVehicle.vehicle_type ||
                    "Not available"}
                </p>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Driver
                </p>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {selectedVehicle.driver_name ||
                    "Not assigned"}
                </p>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Current Location
                </p>

                <div className="mt-2 flex items-center gap-2">

                  <MapPin
                    size={16}
                    className="text-red-500"
                  />

                  <p className="text-sm font-bold text-slate-800">
                    {selectedVehicle.location ||
                      "Location unavailable"}
                  </p>

                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  GPS Coordinates
                </p>

                <div className="mt-2 flex items-center gap-2">

                  <LocateFixed
                    size={16}
                    className="text-emerald-600"
                  />

                  <p className="text-sm font-bold text-slate-800">

                    {(() => {

                      const {
                        latitude,
                        longitude,
                      } =
                        getVehicleCoordinates(
                          selectedVehicle
                        )

                      if (
                        !isValidCoordinate(
                          latitude,
                          longitude
                        )
                      ) {
                        return "GPS coordinates unavailable"
                      }

                      return `${latitude}, ${longitude}`

                    })()}

                  </p>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => {
                  openLocationUpdate(
                    selectedVehicle
                  )

                  setSelectedVehicle(null)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
              >
                <MapPin size={16} />
                Update Location
              </button>

              <button
                type="button"
                onClick={() =>
                  handleGetVehicleLocation(
                    selectedVehicle
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <LocateFixed size={16} />
                Refresh GPS
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedVehicle(null)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ====================================================
          FOOTER STATUS
      ==================================================== */}

      {!loading &&
        vehicles.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>

              <div>

                <p className="text-xs font-black text-slate-800">
                  Fleet data synchronized
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Vehicle, GPS and route operations are connected
                  to the FastAPI backend.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Operational
              </span>

            </div>

          </div>
        )}

    </div>
  )
}

export default Vehicles