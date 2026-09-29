import { useEffect, useMemo, useState } from "react"

import {
  Package,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  Search,
  MapPin,
  Boxes,
  Truck,
  Activity,
  Eye,
  Database,
} from "lucide-react"

import {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../services/api"

import StatusBadge from "../components/StatusBadge"
import { useLanguage } from "../i18n.jsx"

// ============================================================
// EMPTY FORM
// ============================================================

const emptyForm = {
  resource_type: "",
  quantity: "",
  location: "",
  status: "Available",
}

// ============================================================
// RESOURCE ICON
// ============================================================

function getResourceIcon(type) {
  const value = String(type || "").toLowerCase()

  if (
    value.includes("food") ||
    value.includes("water") ||
    value.includes("medical")
  ) {
    return Package
  }

  if (
    value.includes("vehicle") ||
    value.includes("transport")
  ) {
    return Truck
  }

  return Boxes
}

// ============================================================
// NORMALIZE API RESPONSE
// ============================================================

function normalizeResources(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.resources)) {
    return data.resources
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

// ============================================================
// STAT CARD
// ============================================================

function ResourceStat({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "slate",
}) {
  const tones = {
    slate: {
      wrapper: "border-slate-200 bg-white",
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-950",
    },

    red: {
      wrapper: "border-red-200 bg-red-50/70",
      icon: "bg-red-100 text-red-700",
      value: "text-red-900",
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

    orange: {
      wrapper: "border-orange-200 bg-orange-50/70",
      icon: "bg-orange-100 text-orange-700",
      value: "text-orange-900",
    },
  }

  const style = tones[tone] || tones.slate

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-black tracking-tight ${style.value}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// RESOURCES PAGE
// ============================================================

function Resources() {
  const { t } = useLanguage()
  const [resources, setResources] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [loadingResourceId, setLoadingResourceId] = useState(null)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [selectedResource, setSelectedResource] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const [form, setForm] = useState(emptyForm)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")

  // ==========================================================
  // LOAD ALL RESOURCES
  // GET /resources
  // ==========================================================

  const loadResources = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true)
      }

      setError("")

      const data = await getResources()

      setResources(normalizeResources(data))
    } catch (err) {
      console.error("Failed to load resources:", err)

      setError(
        err?.message ||
          "Failed to load resources from the backend."
      )
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

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
  // OPEN ADD FORM
  // ==========================================================

  const openAddForm = () => {
    setEditingId(null)
    setForm(emptyForm)

    setError("")
    setSuccess("")

    setShowDetails(false)
    setShowForm(true)
  }

  // ==========================================================
  // GET SINGLE RESOURCE
  // GET /resources/{id}
  //
  // This makes Edit use the latest backend record instead of
  // relying only on the already-loaded table data.
  // ==========================================================

  const openEditForm = async (resource) => {
    try {
      setLoadingResourceId(resource.id)

      setError("")
      setSuccess("")

      const latestResource = await getResource(resource.id)

      const data =
        latestResource?.resource ||
        latestResource?.data ||
        latestResource

      setEditingId(resource.id)

      setForm({
        resource_type: data?.resource_type || "",
        quantity:
          data?.quantity !== null &&
          data?.quantity !== undefined
            ? String(data.quantity)
            : "",
        location: data?.location || "",
        status: data?.status || "Available",
      })

      setShowDetails(false)
      setShowForm(true)
    } catch (err) {
      console.error("Failed to fetch resource:", err)

      setError(
        err?.message ||
          "Failed to fetch the latest resource details."
      )
    } finally {
      setLoadingResourceId(null)
    }
  }

  // ==========================================================
  // VIEW RESOURCE
  // GET /resources/{id}
  // ==========================================================

  const viewResource = async (resource) => {
    try {
      setLoadingResourceId(resource.id)

      setError("")
      setSuccess("")

      const data = await getResource(resource.id)

      const latestResource =
        data?.resource ||
        data?.data ||
        data

      setSelectedResource(latestResource)
      setShowDetails(true)
      setShowForm(false)
    } catch (err) {
      console.error("Failed to fetch resource details:", err)

      setError(
        err?.message ||
          "Failed to fetch resource details."
      )
    } finally {
      setLoadingResourceId(null)
    }
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
  // CLOSE DETAILS
  // ==========================================================

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedResource(null)
  }

  // ==========================================================
  // CREATE / UPDATE
  //
  // POST /resources
  // PUT /resources/{id}
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    try {
      setSaving(true)

      const resourceType = form.resource_type.trim()
      const location = form.location.trim()
      const status = form.status.trim()

      if (!resourceType) {
        throw new Error("Resource type is required.")
      }

      if (
        form.quantity === "" ||
        Number.isNaN(Number(form.quantity))
      ) {
        throw new Error("Enter a valid quantity.")
      }

      const quantity = Number(form.quantity)

      if (!Number.isInteger(quantity)) {
        throw new Error("Quantity must be a whole number.")
      }

      if (quantity < 0) {
        throw new Error("Quantity cannot be negative.")
      }

      if (!location) {
        throw new Error("Location is required.")
      }

      if (!status) {
        throw new Error("Status is required.")
      }

      const payload = {
        resource_type: resourceType,
        quantity,
        location,
        status,
      }

      if (editingId !== null) {
        await updateResource(
          editingId,
          payload
        )

        setSuccess(
          `Resource #${editingId} updated successfully.`
        )
      } else {
        await createResource(payload)

        setSuccess(
          "Resource added successfully."
        )
      }

      await loadResources(false)

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      console.error("Resource save error:", err)

      setError(
        err?.message ||
          "Failed to save resource."
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // DELETE
  // DELETE /resources/{id}
  // ==========================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete resource #${id}?`
    )

    if (!confirmed) return

    try {
      setDeletingId(id)

      setError("")
      setSuccess("")

      await deleteResource(id)

      await loadResources(false)

      if (
        selectedResource &&
        Number(selectedResource.id) === Number(id)
      ) {
        closeDetails()
      }

      setSuccess(
        `Resource #${id} deleted successfully.`
      )
    } catch (err) {
      console.error("Resource delete error:", err)

      setError(
        err?.message ||
          "Failed to delete resource."
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalResources = resources.length

  const totalQuantity = useMemo(() => {
    return resources.reduce(
      (sum, resource) =>
        sum + Number(resource.quantity || 0),
      0
    )
  }, [resources])

  const availableResources = useMemo(() => {
    return resources.filter(
      (resource) =>
        String(resource.status || "")
          .toLowerCase() === "available"
    ).length
  }, [resources])

  const deployedResources = useMemo(() => {
    return resources.filter(
      (resource) =>
        String(resource.status || "")
          .toLowerCase() === "deployed"
    ).length
  }, [resources])

  const maintenanceResources = useMemo(() => {
    return resources.filter(
      (resource) =>
        String(resource.status || "")
          .toLowerCase() === "maintenance"
    ).length
  }, [resources])

  const pendingResources = useMemo(() => {
    return resources.filter(
      (resource) =>
        String(resource.status || "")
          .toLowerCase() === "pending"
    ).length
  }, [resources])

  const lowStockResources = useMemo(() => {
    return resources.filter((resource) => {
      const quantity = Number(resource.quantity || 0)

      return quantity > 0 && quantity <= 10
    }).length
  }, [resources])

  const outOfStockResources = useMemo(() => {
    return resources.filter(
      (resource) =>
        Number(resource.quantity || 0) <= 0
    ).length
  }, [resources])

  // ==========================================================
  // RESOURCE TYPES
  // ==========================================================

  const resourceTypes = useMemo(() => {
    return [
      ...new Set(
        resources
          .map(
            (resource) =>
              resource.resource_type
          )
          .filter(Boolean)
      ),
    ].sort()
  }, [resources])

  // ==========================================================
  // LOCATIONS
  // ==========================================================

  const locationCount = useMemo(() => {
    return new Set(
      resources
        .map(
          (resource) =>
            String(resource.location || "")
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)
    ).size
  }, [resources])

  // ==========================================================
  // FILTERED RESOURCES
  // ==========================================================

  const filteredResources = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase()

    return resources.filter((resource) => {
      const matchesSearch =
        !search ||
        String(
          resource.resource_type || ""
        )
          .toLowerCase()
          .includes(search) ||
        String(
          resource.location || ""
        )
          .toLowerCase()
          .includes(search) ||
        String(
          resource.id || ""
        )
          .toLowerCase()
          .includes(search)

      const matchesStatus =
        statusFilter === "All" ||
        String(resource.status || "")
          .toLowerCase() ===
          statusFilter.toLowerCase()

      const matchesType =
        typeFilter === "All" ||
        String(
          resource.resource_type || ""
        ) === typeFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      )
    })
  }, [
    resources,
    searchTerm,
    statusFilter,
    typeFilter,
  ])

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("All")
    setTypeFilter("All")
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
              <Package size={24} />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {t("resources")}
                </h1>

                <span className="hidden rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700 sm:inline-flex">
                  {t("liveInventory")}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                {t("resourcesDescription")}
              </p>

            </div>

          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {t("backend")} {t("connected")}
          </div>

          <button
            type="button"
            onClick={() => loadResources()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
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
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={18} />
              {t("addResource")}
          </button>

        </div>
      </div>

      {/* ======================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle size={18} />
          </div>

          <div className="min-w-0">
            <p className="font-bold">
              {t("operationFailed")}
            </p>

            <p className="mt-1 break-words">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CheckCircle2 size={18} />
          </div>

          <div className="min-w-0">
            <p className="font-bold">
              {t("operationSuccessful")}
            </p>

            <p className="mt-1">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-1 hover:bg-green-100"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <ResourceStat
          title={t("inventoryRecordsLabel")}
          value={totalResources}
          subtitle={t("registeredResources")}
          icon={Boxes}
          tone="red"
        />

        <ResourceStat
          title={t("totalQuantity")}
          value={totalQuantity.toLocaleString()}
          subtitle={t("unitsAcrossSystem")}
          icon={Package}
          tone="blue"
        />

        <ResourceStat
          title={t("statusAvailable")}
          value={availableResources}
          subtitle={t("readyForDeployment")}
          icon={CheckCircle2}
          tone="green"
        />

        <ResourceStat
          title={t("statusDeployed")}
          value={deployedResources}
          subtitle={t("currentlyDeployed")}
          icon={Truck}
          tone="blue"
        />

        <ResourceStat
          title={t("lowOut")}
          value={
            lowStockResources +
            outOfStockResources
          }
          subtitle={t("lowOutSummary", {
            low: lowStockResources,
            out: outOfStockResources,
          })}
          icon={AlertCircle}
          tone="orange"
        />

      </div>

      {/* ======================================================
          INVENTORY HEALTH
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-400">
              <Activity size={19} />
            </div>

            <div>
              <h2 className="font-bold">
                {t("inventoryHealth")}
              </h2>

              <p className="text-xs text-slate-400">
                {t("inventoryHealthDesc")}
              </p>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("statusAvailable")}
              </p>

              <p className="mt-1 text-lg font-black text-green-400">
                {availableResources}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("statusDeployed")}
              </p>

              <p className="mt-1 text-lg font-black text-blue-400">
                {deployedResources}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("statusMaintenance")}
              </p>

              <p className="mt-1 text-lg font-black text-orange-400">
                {maintenanceResources}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("statusPending")}
              </p>

              <p className="mt-1 text-lg font-black text-yellow-400">
                {pendingResources}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("locations")}
              </p>

              <p className="mt-1 text-lg font-black text-red-400">
                {locationCount}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* ======================================================
          ADD / EDIT FORM
      ====================================================== */}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-6 flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                {editingId !== null ? (
                  <Pencil size={18} />
                ) : (
                  <Plus size={19} />
                )}
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  {editingId !== null
                    ? `${t("editResourceTitle")} #${editingId}`
                    : t("addResourceTitle")}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingId !== null
                    ? t("updateSelectedRecord")
                    : t("createNewResourceRecord")}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              <X size={20} />
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >

            {/* RESOURCE TYPE */}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                {t("resourceType")}
              </label>

              <select
                name="resource_type"
                value={form.resource_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50"
                required
              >
                <option value="">
                  {t("selectResourceType")}
                </option>

                <option value="Food Packets">
                  {t("resourceFoodPackets")}
                </option>

                <option value="Drinking Water">
                  {t("resourceDrinkingWater")}
                </option>

                <option value="Medical Kits">
                  {t("resourceMedicalKits")}
                </option>

                <option value="Shelter">
                  {t("resourceShelter")}
                </option>

                <option value="Rescue Equipment">
                  {t("resourceRescueEquipment")}
                </option>
              </select>
            </div>

            {/* QUANTITY */}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                {t("quantityLabel")}
              </label>

              <input
                type="number"
                name="quantity"
                min="0"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                placeholder={t("enterQuantityLabel")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                required
              />
            </div>

            {/* LOCATION */}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                {t("locationLabel")}
              </label>

              <div className="relative">

                <MapPin
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder={t("enterLocationPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  required
                />

              </div>
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                {t("statusLabel")}
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50"
                required
              >
                <option value="Available">
                  {t("statusAvailable")}
                </option>

                <option value="Deployed">
                  {t("statusDeployed")}
                </option>

                <option value="Maintenance">
                  {t("statusMaintenance")}
                </option>

                <option value="Pending">
                  {t("statusPending")}
                </option>
              </select>
            </div>

            {/* FORM BUTTONS */}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row md:col-span-2 md:justify-end">

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    ? t("saveResource")
                    : t("addResource")}

              </button>

            </div>

          </form>
        </div>
      )}

      {/* ======================================================
          RESOURCE DETAILS
      ====================================================== */}

      {showDetails && selectedResource && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                <Eye size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2">

                  <h2 className="font-black text-slate-950">
                    {t("resourceDetails")}
                  </h2>

                  <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                    #{selectedResource.id}
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {t("latestRecordBackend")}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={closeDetails}
              className="self-end rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 sm:self-auto"
            >
              <X size={19} />
            </button>

          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t("resourceLabel")}
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {selectedResource.resource_type || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t("quantityLabel")}
              </p>

              <p className="mt-2 text-xl font-black text-slate-900">
                {Number(
                  selectedResource.quantity || 0
                ).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t("locationLabel")}
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {selectedResource.location || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t("statusLabel")}
              </p>

              <div className="mt-2">
                <StatusBadge
                  status={
                    selectedResource.status ||
                    "Unknown"
                  }
                />
              </div>
            </div>

          </div>

          <div className="mt-4 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                openEditForm(selectedResource)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Pencil size={15} />
              {t("editResource")}
            </button>

            <button
              type="button"
              onClick={() =>
                handleDelete(selectedResource.id)
              }
              disabled={
                deletingId === selectedResource.id
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={15} />
              {t("deleteResourceLabel")}
            </button>

          </div>

        </div>
      )}

      {/* ======================================================
          FILTER BAR
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

          <div className="relative flex-1">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder={t("searchResourcePlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
            />

          </div>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
          >
            <option value="All">
              {t("allResourceTypes")}
            </option>

            {resourceTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
          >
            <option value="All">
              {t("allStatuses")}
            </option>

            <option value="Available">
              {t("statusAvailable")}
            </option>

            <option value="Deployed">
              {t("statusDeployed")}
            </option>

            <option value="Maintenance">
              {t("statusMaintenance")}
            </option>

            <option value="Pending">
              {t("statusPending")}
            </option>
          </select>

        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs font-medium text-slate-500">
            {t("showingCount", {
              shown: filteredResources.length,
              total: resources.length,
            })}
          </p>

          {(searchTerm ||
            statusFilter !== "All" ||
            typeFilter !== "All") && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-left text-xs font-bold text-red-600 hover:text-red-700 sm:text-right"
            >
              {t("clearFilters")}
            </button>
          )}

        </div>

      </div>

      {/* ======================================================
          INVENTORY TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <Database
                  size={17}
                  className="text-red-600"
                />

                <h2 className="font-bold text-slate-950">
                  {t("resourceInventoryTable")}
                </h2>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                {t("resourceInventoryTableDesc")}
              </p>

            </div>

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              <span className="text-xs font-bold text-slate-500">
                {t("liveDatabase")}
              </span>

            </div>

          </div>

        </div>

        {loading ? (

          <div className="flex min-h-[320px] items-center justify-center">

            <div className="text-center">

              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-red-500"
              />

              <p className="mt-3 text-sm font-medium text-slate-500">
                {t("loadingResourceInventory")}
              </p>

            </div>

          </div>

        ) : filteredResources.length === 0 ? (

          <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Package
                size={30}
                className="text-slate-400"
              />
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              {resources.length === 0
                ? t("noResourcesFound")
                : t("noMatchingResources")}
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {resources.length === 0
                ? t("addResourceToPopulate")
                : t("tryChangingFilters")}
            </p>

            {resources.length === 0 && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                <Plus size={16} />
                {t("addResource")}
              </button>
            )}

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-[1000px] w-full text-left">

              <thead className="bg-slate-50">

                <tr className="border-b border-slate-200">

                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    ID
                  </th>

                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("resourceLabel")}
                  </th>

                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("quantityLabel")}
                  </th>

                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("locationLabel")}
                  </th>

                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("statusLabel")}
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("actions")}
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredResources.map((resource) => {

                  const quantity =
                    Number(
                      resource.quantity || 0
                    )

                  const isLowStock =
                    quantity > 0 &&
                    quantity <= 10

                  const isOutOfStock =
                    quantity <= 0

                  const Icon =
                    getResourceIcon(
                      resource.resource_type
                    )

                  const isFetching =
                    loadingResourceId ===
                    resource.id

                  return (
                    <tr
                      key={resource.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* ID */}

                      <td className="whitespace-nowrap px-5 py-4">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          #{resource.id}
                        </span>

                      </td>

                      {/* RESOURCE */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <Icon size={17} />
                          </div>

                          <div>

                            <p className="text-sm font-bold text-slate-900">
                              {resource.resource_type ||
                                "Unknown Resource"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {t("emergencyInventory")}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* QUANTITY */}

                      <td className="whitespace-nowrap px-5 py-4">

                        <div className="flex items-center gap-2">

                          <span
                            className={`text-sm font-black ${
                              isOutOfStock
                                ? "text-red-600"
                                : isLowStock
                                  ? "text-orange-600"
                                  : "text-slate-900"
                            }`}
                          >
                            {quantity.toLocaleString()}
                          </span>

                          {isOutOfStock && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                              {t("outShort")}
                            </span>
                          )}

                          {isLowStock && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
                              {t("lowShort")}
                            </span>
                          )}

                        </div>

                      </td>

                      {/* LOCATION */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <MapPin
                            size={15}
                            className="shrink-0 text-slate-400"
                          />

                          <span className="text-sm text-slate-600">
                            {resource.location ||
                              t("notSpecified")}
                          </span>

                        </div>

                      </td>

                      {/* STATUS */}

                      <td className="whitespace-nowrap px-5 py-4">

                        <StatusBadge
                          status={
                            resource.status ||
                            "Unknown"
                          }
                        />

                      </td>

                      {/* ACTIONS */}

                      <td className="whitespace-nowrap px-5 py-4">

                        <div className="flex justify-end gap-2">

                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              viewResource(
                                resource
                              )
                            }
                            disabled={
                              isFetching ||
                              deletingId ===
                                resource.id
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isFetching ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Eye size={14} />
                            )}
                            {t("view")}
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                resource
                              )
                            }
                            disabled={
                              isFetching ||
                              deletingId ===
                                resource.id
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil size={14} />
                            {t("edit")}
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                resource.id
                              )
                            }
                            disabled={
                              deletingId ===
                              resource.id
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {deletingId ===
                            resource.id ? (
                              <>
                                <RefreshCw
                                  size={14}
                                  className="animate-spin"
                                />
                                {t("deleting")}
                              </>
                            ) : (
                              <>
                                <Trash2
                                  size={14}
                                />
                                {t("delete")}
                              </>
                            )}

                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-2">

          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

          <span className="text-xs font-bold text-slate-600">
            {t("inventorySynced")}
          </span>

        </div>

        <p className="text-xs text-slate-400">
          {t("displayedTotal", {
            shown: filteredResources.length,
            total: resources.length,
          })}
        </p>

      </div>

    </div>
  )
}

export default Resources