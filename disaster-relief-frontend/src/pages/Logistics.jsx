// ============================================================
// Logistics.jsx
// AI-Based Disaster Response Management System
//
// AI LOGISTICS COMMAND CENTER
//
// LOGISTICS ENDPOINTS
// POST /logistics/optimize
// POST /logistics/plan
// GET  /logistics
// GET  /logistics/{id}
// PUT  /logistics/{id}
// POST /logistics/reallocate
// POST /logistics/optimize-multiple
// POST /logistics/route
//
// SUPPORTING DATA
// GET /vehicles
// GET /resources
// GET /disasters
// GET /zones
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Brain,
  CheckCircle,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Send,
  Truck,
  Users,
  Zap,
  Route,
  Activity,
  CircleDot,
  XCircle,
  Boxes,
  RotateCcw,
  Layers,
  Navigation,
  Database,
  ShieldAlert,
  ArrowRight,
  Eye,
  X,
} from "lucide-react";

import {
  getDisasters,
  getZones,
  getVehicles,
  getResources,

  optimizeLogistics,
  optimizeMultipleLogistics,

  createLogisticsPlan,
  getLogisticsPlans,
  getLogisticsPlan,

  updateLogisticsPlan,
  updateLogisticsStatus,

  reallocateLogistics,
  getRouteETA,
} from "../services/api";

import { useLanguage } from "../i18n.jsx";

// ============================================================
// HELPERS
// ============================================================

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const formatStatus = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const normalizeArray = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.plans)) {
    return response.plans;
  }

  if (Array.isArray(response?.vehicles)) {
    return response.vehicles;
  }

  if (Array.isArray(response?.resources)) {
    return response.resources;
  }

  if (Array.isArray(response?.disasters)) {
    return response.disasters;
  }

  if (Array.isArray(response?.zones)) {
    return response.zones;
  }

  return [];
};

const unwrapResponse = (response) => {
  if (
    response?.data !== undefined &&
    !Array.isArray(response.data)
  ) {
    return response.data;
  }

  if (
    response?.result !== undefined &&
    !Array.isArray(response.result)
  ) {
    return response.result;
  }

  return response;
};

const getObjectValue = (
  object,
  keys,
  fallback = "-"
) => {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null &&
      object?.[key] !== ""
    ) {
      return object[key];
    }
  }

  return fallback;
};

const getErrorMessage = (
  error,
  fallback
) => {
  if (typeof error === "string") {
    return error;
  }

  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;

    if (Array.isArray(detail)) {
      return detail
        .map(
          (item) =>
            item?.msg ||
            item?.message ||
            String(item)
        )
        .join(", ");
    }

    return String(detail);
  }

  if (error?.data?.detail) {
    return String(error.data.detail);
  }

  if (error?.detail) {
    return String(error.detail);
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const Logistics = () => {
  const { t } = useLanguage();
  // ==========================================================
  // BACKEND DATA
  // ==========================================================

  const [disasters, setDisasters] = useState([]);
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [resources, setResources] = useState([]);
  const [plans, setPlans] = useState([]);

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] =
    useState(false);

  const [optimizing, setOptimizing] =
    useState(false);

  const [multiOptimizing, setMultiOptimizing] =
    useState(false);

  const [savingPlan, setSavingPlan] =
    useState(false);

  const [reallocating, setReallocating] =
    useState(false);

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  // ==========================================================
  // RESULTS
  // ==========================================================

  const [optimizationResult, setOptimizationResult] =
    useState(null);

  const [
    multiOptimizationResult,
    setMultiOptimizationResult,
  ] = useState(null);

  const [routeData, setRouteData] =
    useState(null);

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  // ==========================================================
  // MAIN FORM
  // ==========================================================

  const [form, setForm] = useState({
    disaster_id: "",
    zone_id: "",
    vehicle_id: "",
    priority: "High",
  });

  // ==========================================================
  // REALLOCATION FORM
  // ==========================================================

  const [reallocationForm, setReallocationForm] =
    useState({
      plan_id: "",
      vehicle_id: "",
      quantity: "",
      reason: "",
    });

  // ==========================================================
  // LOAD CORE DATA
  // ==========================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        disastersResponse,
        zonesResponse,
        vehiclesResponse,
        resourcesResponse,
      ] = await Promise.all([
        getDisasters(),
        getZones(),
        getVehicles(),
        getResources(),
      ]);

      setDisasters(
        normalizeArray(disastersResponse)
      );

      setZones(
        normalizeArray(zonesResponse)
      );

      setVehicles(
        normalizeArray(vehiclesResponse)
      );

      setResources(
        normalizeArray(resourcesResponse)
      );
    } catch (err) {
      console.error(
        "Failed to load logistics data:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to load live logistics data."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOAD LOGISTICS PLANS
  // ==========================================================

  const loadPlans = async () => {
    try {
      setPlansLoading(true);

      const response =
        await getLogisticsPlans();

      setPlans(
        normalizeArray(response)
      );
    } catch (err) {
      console.error(
        "Failed to load logistics plans:",
        err
      );

      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadData();
    loadPlans();
  }, []);

  // ==========================================================
  // AUTO REFRESH PLANS
  // ==========================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadPlans();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ==========================================================
  // SELECTED DISASTER
  // ==========================================================

  const selectedDisaster = useMemo(() => {
    if (!form.disaster_id) {
      return null;
    }

    return (
      disasters.find(
        (item) =>
          String(item.id) ===
          String(form.disaster_id)
      ) || null
    );
  }, [
    disasters,
    form.disaster_id,
  ]);

  // ==========================================================
  // DISASTER ZONES
  // ==========================================================

  const disasterZones = useMemo(() => {
    if (!form.disaster_id) {
      return [];
    }

    return zones.filter(
      (zone) =>
        String(zone.disaster_id) ===
        String(form.disaster_id)
    );
  }, [
    zones,
    form.disaster_id,
  ]);

  // ==========================================================
  // SELECTED ZONE
  // ==========================================================

  const selectedZone = useMemo(() => {
    if (!form.zone_id) {
      return null;
    }

    return (
      zones.find(
        (zone) =>
          String(zone.id) ===
          String(form.zone_id)
      ) || null
    );
  }, [
    zones,
    form.zone_id,
  ]);

  // ==========================================================
  // AVAILABLE VEHICLES
  // ==========================================================

  const availableVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const status = String(
        vehicle?.status || ""
      )
        .trim()
        .toLowerCase();

      return (
        status === "available" ||
        status === "active" ||
        status === "ready" ||
        status === "idle" ||
        status === ""
      );
    });
  }, [vehicles]);

  // ==========================================================
  // SELECTED VEHICLE
  // ==========================================================

  const selectedVehicle = useMemo(() => {
    if (!form.vehicle_id) {
      return null;
    }

    return (
      vehicles.find(
        (vehicle) =>
          String(vehicle.id) ===
          String(form.vehicle_id)
      ) || null
    );
  }, [
    vehicles,
    form.vehicle_id,
  ]);

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setError("");
    setSuccessMessage("");

    if (name === "disaster_id") {
      setForm((previous) => ({
        ...previous,
        disaster_id: value,
        zone_id: "",
        vehicle_id: "",
      }));

      setOptimizationResult(null);
      setMultiOptimizationResult(null);
      setRouteData(null);

      return;
    }

    if (name === "zone_id") {
      setForm((previous) => ({
        ...previous,
        zone_id: value,
        vehicle_id: "",
      }));

      setOptimizationResult(null);
      setRouteData(null);

      return;
    }

    if (name === "vehicle_id") {
      setForm((previous) => ({
        ...previous,
        vehicle_id: value,
      }));

      setRouteData(null);

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================================
  // VALIDATE FORM
  // ==========================================================

  const validateForm = () => {
    if (!form.disaster_id) {
      return "Please select a disaster.";
    }

    if (!selectedDisaster) {
      return "Selected disaster could not be found.";
    }

    if (!form.zone_id) {
      return "Please select a response zone.";
    }

    if (!selectedZone) {
      return "Selected zone could not be found.";
    }

    if (!form.priority) {
      return "Please select priority.";
    }

    return null;
  };

  // ==========================================================
  // AI OPTIMIZATION
  // POST /logistics/optimize
  // ==========================================================

  const handleOptimize = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");
    setOptimizationResult(null);
    setRouteData(null);

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setOptimizing(true);

      const payload = {
        disaster_id: Number(
          form.disaster_id
        ),
        zone_id: Number(
          form.zone_id
        ),
        priority: form.priority,
      };

      if (form.vehicle_id) {
        payload.vehicle_id = Number(
          form.vehicle_id
        );
      }

      console.log(
        "POST /logistics/optimize",
        payload
      );

      const response =
        await optimizeLogistics(
          payload
        );

      const result =
        unwrapResponse(response);

      setOptimizationResult(result);

      setSuccessMessage(
        "AI logistics optimization completed successfully."
      );
    } catch (err) {
      console.error(
        "Optimization error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to optimize logistics."
        )
      );
    } finally {
      setOptimizing(false);
    }
  };

  // ==========================================================
  // MULTI-ZONE OPTIMIZATION
  // POST /logistics/optimize-multiple
  // ==========================================================

  const handleOptimizeMultiple =
    async () => {
      setError("");
      setSuccessMessage("");

      if (!form.disaster_id) {
        setError(
          "Select a disaster before running multi-zone optimization."
        );
        return;
      }

      if (!disasterZones.length) {
        setError(
          "No response zones are available for this disaster."
        );
        return;
      }

      try {
        setMultiOptimizing(true);
        setMultiOptimizationResult(null);

        const payload = {
          disaster_id: Number(
            form.disaster_id
          ),
          zone_ids:
            disasterZones.map(
              (zone) => Number(zone.id)
            ),
          priority: form.priority,
        };

        console.log(
          "POST /logistics/optimize-multiple",
          payload
        );

        const response =
          await optimizeMultipleLogistics(
            payload
          );

        setMultiOptimizationResult(
          unwrapResponse(response)
        );

        setSuccessMessage(
          `Multi-zone optimization completed for ${disasterZones.length} response zone(s).`
        );
      } catch (err) {
        console.error(
          "Multi-zone optimization error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to optimize multiple zones."
          )
        );
      } finally {
        setMultiOptimizing(false);
      }
    };

  // ==========================================================
  // CREATE LOGISTICS PLAN
  // POST /logistics/plan
  // ==========================================================

  const handleCreatePlan =
    async () => {
      if (!optimizationResult) {
        setError(
          "Run AI optimization before creating a logistics plan."
        );
        return;
      }

      if (
        !selectedDisaster ||
        !selectedZone
      ) {
        setError(
          "Disaster and zone information is missing."
        );
        return;
      }

      try {
        setSavingPlan(true);
        setError("");
        setSuccessMessage("");

        const vehicle =
          optimizationResult?.vehicle ||
          selectedVehicle ||
          null;

        const resourceType =
          getPrimaryResourceType(
            optimizationResult
          );

        const quantity =
          getPrimaryAllocatedQuantity(
            optimizationResult
          );

        const payload = {
          disaster_id: Number(
            selectedDisaster.id
          ),

          source_location:
            vehicle?.location ||
            selectedDisaster.location ||
            "Relief Center",

          destination_location:
            selectedZone.location ||
            selectedDisaster.location ||
            "Disaster Zone",

          resource_type:
            resourceType,

          quantity:
            Number(quantity) || 0,

          vehicle_id:
            vehicle?.id
              ? Number(vehicle.id)
              : null,

          priority:
            form.priority,

          status: "planned",
        };

        console.log(
          "POST /logistics/plan",
          payload
        );

        await createLogisticsPlan(
          payload
        );

        await loadPlans();

        setSuccessMessage(
          "Logistics plan created and saved successfully."
        );
      } catch (err) {
        console.error(
          "Create plan error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to create logistics plan."
          )
        );
      } finally {
        setSavingPlan(false);
      }
    };

  // ==========================================================
  // GET SINGLE PLAN
  // GET /logistics/{id}
  // ==========================================================

  const handleViewPlan =
    async (plan) => {
      if (!plan?.id) {
        return;
      }

      try {
        setError("");

        const response =
          await getLogisticsPlan(
            plan.id
          );

        setSelectedPlan(
          unwrapResponse(response)
        );
      } catch (err) {
        console.error(
          "Get logistics plan error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to load logistics plan."
          )
        );
      }
    };

  // ==========================================================
  // UPDATE LOGISTICS PLAN
  // PUT /logistics/{id}
  // ==========================================================

  const handlePlanStatus =
    async (
      plan,
      status
    ) => {
      if (!plan?.id) {
        return;
      }

      try {
        setError("");
        setSuccessMessage("");

        await updateLogisticsPlan(
          plan.id,
          {
            status,
          }
        );

        await loadPlans();

        setSuccessMessage(
          `Logistics plan #${plan.id} updated to ${formatStatus(
            status
          )}.`
        );
      } catch (err) {
        console.error(
          "Update logistics plan error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to update logistics plan."
          )
        );
      }
    };

  // ==========================================================
  // REALLOCATION
  // POST /logistics/reallocate
  // ==========================================================

  const handleReallocate =
    async () => {
      setError("");
      setSuccessMessage("");

      if (!reallocationForm.plan_id) {
        setError(
          "Select a logistics plan for reallocation."
        );
        return;
      }

      try {
        setReallocating(true);

        const payload = {
          plan_id: Number(
            reallocationForm.plan_id
          ),
        };

        if (
          reallocationForm.vehicle_id
        ) {
          payload.vehicle_id =
            Number(
              reallocationForm.vehicle_id
            );
        }

        if (
          reallocationForm.quantity !== ""
        ) {
          payload.quantity =
            Number(
              reallocationForm.quantity
            );
        }

        if (
          reallocationForm.reason.trim()
        ) {
          payload.reason =
            reallocationForm.reason.trim();
        }

        console.log(
          "POST /logistics/reallocate",
          payload
        );

        await reallocateLogistics(
          payload
        );

        await loadPlans();
        await loadData();

        setSuccessMessage(
          "Logistics resources reallocated successfully."
        );

        setReallocationForm({
          plan_id: "",
          vehicle_id: "",
          quantity: "",
          reason: "",
        });
      } catch (err) {
        console.error(
          "Reallocation error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to reallocate logistics resources."
          )
        );
      } finally {
        setReallocating(false);
      }
    };

  // ==========================================================
  // ROUTE / ETA
  // POST /logistics/route
  // ==========================================================

  const handleGetRoute =
    async () => {
      setError("");
      setSuccessMessage("");

      if (!selectedVehicle) {
        setError(
          "Select a vehicle to calculate route."
        );
        return;
      }

      if (!selectedZone) {
        setError(
          "Select a response zone to calculate route."
        );
        return;
      }

      try {
        setRouteLoading(true);

        const payload = {
          vehicle_id:
            Number(
              selectedVehicle.id
            ),

          zone_id:
            Number(
              selectedZone.id
            ),

          disaster_id:
            selectedDisaster?.id
              ? Number(
                  selectedDisaster.id
                )
              : undefined,

          source_location:
            selectedVehicle.location ||
            selectedDisaster?.location ||
            "",

          destination_location:
            selectedZone.location ||
            selectedDisaster?.location ||
            "",
        };

        console.log(
          "POST /logistics/route",
          payload
        );

        const response =
          await getRouteETA(
            payload
          );

        setRouteData(
          unwrapResponse(response)
        );

        setSuccessMessage(
          "Route and ETA calculated successfully."
        );
      } catch (err) {
        console.error(
          "Route error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to calculate route and ETA."
          )
        );
      } finally {
        setRouteLoading(false);
      }
    };

  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset = () => {
    setForm({
      disaster_id: "",
      zone_id: "",
      vehicle_id: "",
      priority: "High",
    });

    setOptimizationResult(null);
    setMultiOptimizationResult(null);
    setRouteData(null);
    setSelectedPlan(null);

    setError("");
    setSuccessMessage("");
  };

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {
      setError("");
      setSuccessMessage("");

      try {
        await Promise.all([
          loadData(),
          loadPlans(),
        ]);

        setSuccessMessage(
          "Live logistics data refreshed."
        );
      } catch {
        setError(
          "Failed to refresh logistics data."
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-5 rounded-2xl bg-red-50">
            <Truck
              size={38}
              className="text-red-600"
            />
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <Loader2
              size={21}
              className="animate-spin"
            />

            <span className="font-bold">
              Loading live logistics data...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-[1550px] mx-auto space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-800 via-red-700 to-orange-500 p-6 md:p-8 text-white shadow-xl">

          <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10" />

          <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-white/10" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

            <div>
              <div className="flex items-center gap-3">

                <div className="p-3 bg-white/15 rounded-2xl border border-white/20">
                  <Truck size={30} />
                </div>

                <div>

                  <div className="flex items-center gap-2">
                    <Activity size={15} />

                    <span className="text-xs font-black uppercase tracking-widest text-white/80">
                      AI Response Operations
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black mt-1">
                    {t("logisticsCommand")}
                  </h1>

                </div>
              </div>

              <p className="mt-4 max-w-3xl text-sm md:text-base text-white/85">
                AI demand intelligence, resource
                allocation, vehicle routing,
                multi-zone optimization and live
                logistics planning.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-pulse" />

                <span className="text-sm font-bold">
                  {t("backend")} {t("connected")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-red-700 rounded-xl font-black hover:bg-red-50 transition shadow"
              >
                <RefreshCw size={17} />
                {t("refreshLiveData")}
              </button>

            </div>
          </div>
        </div>

        {/* ==================================================
            LIVE METRICS
        ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <LiveMetric
            icon={
              <AlertTriangle size={20} />
            }
            label="Disasters"
            value={disasters.length}
            description="Backend records"
          />

          <LiveMetric
            icon={<MapPin size={20} />}
            label="Zones"
            value={zones.length}
            description="Response areas"
          />

          <LiveMetric
            icon={<Truck size={20} />}
            label="Vehicles"
            value={
              availableVehicles.length
            }
            description={`of ${vehicles.length} fleet records ready`}
          />

          <LiveMetric
            icon={<Boxes size={20} />}
            label="Resources"
            value={resources.length}
            description="Inventory records"
          />

          <LiveMetric
            icon={
              <ClipboardList size={20} />
            }
            label="Plans"
            value={plans.length}
            description="Live logistics plans"
          />

        </div>

        {/* ==================================================
            ALERTS
        ================================================== */}

        {error && (
          <AlertBox
            type="error"
            message={error}
          />
        )}

        {successMessage && (
          <AlertBox
            type="success"
            message={successMessage}
          />
        )}

        {/* ==================================================
            MAIN WORKSPACE
        ================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-200">

              <div className="flex items-center gap-3">

                <div className="p-3 rounded-xl bg-red-50">
                  <Brain
                    size={22}
                    className="text-red-600"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    AI Logistics Optimization
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Select live backend disaster,
                    zone, priority and vehicle data.
                  </p>
                </div>

              </div>
            </div>

            <form
              onSubmit={handleOptimize}
              className="p-6"
            >

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* DISASTER */}

                <FormField label="Disaster">

                  <select
                    name="disaster_id"
                    value={form.disaster_id}
                    onChange={handleChange}
                    className="input"
                  >

                    <option value="">
                      Select Disaster
                    </option>

                    {disasters.map(
                      (disaster) => (
                        <option
                          key={disaster.id}
                          value={disaster.id}
                        >
                          #{disaster.id} ·{" "}
                          {disaster.disaster_type ||
                            disaster.type ||
                            "Disaster"}
                          {disaster.location
                            ? ` · ${disaster.location}`
                            : ""}
                        </option>
                      )
                    )}

                  </select>

                </FormField>

                {/* ZONE */}

                <FormField label="Response Zone">

                  <select
                    name="zone_id"
                    value={form.zone_id}
                    onChange={handleChange}
                    disabled={
                      !form.disaster_id
                    }
                    className="input disabled:bg-slate-100 disabled:text-slate-400"
                  >

                    <option value="">
                      {!form.disaster_id
                        ? "Select disaster first"
                        : disasterZones.length === 0
                        ? "No zones available"
                        : "Select Response Zone"}
                    </option>

                    {disasterZones.map(
                      (zone) => (
                        <option
                          key={zone.id}
                          value={zone.id}
                        >
                          #{zone.id} ·{" "}
                          {zone.grid_cell_id ||
                            zone.location ||
                            "Zone"}
                        </option>
                      )
                    )}

                  </select>

                </FormField>

                {/* PRIORITY */}

                <FormField label="Response Priority">

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="input"
                  >

                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>

                    <option value="Critical">
                      Critical
                    </option>

                  </select>

                </FormField>

                {/* VEHICLE */}

                <FormField label="Response Vehicle">

                  <select
                    name="vehicle_id"
                    value={form.vehicle_id}
                    onChange={handleChange}
                    className="input"
                  >

                    <option value="">
                      Automatic vehicle selection
                    </option>

                    {availableVehicles.map(
                      (vehicle) => (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {vehicle.vehicle_number ||
                            `Vehicle #${vehicle.id}`}
                          {vehicle.vehicle_type
                            ? ` · ${vehicle.vehicle_type}`
                            : ""}
                          {vehicle.location
                            ? ` · ${vehicle.location}`
                            : ""}
                        </option>
                      )
                    )}

                  </select>

                  <p className="text-xs text-slate-400 mt-2">
                    Leave automatic to let the
                    logistics backend assign a vehicle.
                  </p>

                </FormField>

              </div>

              {/* SELECTED INFORMATION */}

              {(selectedDisaster ||
                selectedZone ||
                selectedVehicle) && (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {selectedDisaster && (
                    <SelectionPanel
                      title="Selected Disaster"
                      icon={
                        <AlertTriangle
                          size={18}
                        />
                      }
                      color="red"
                    >

                      <InfoLine
                        label="ID"
                        value={
                          selectedDisaster.id
                        }
                      />

                      <InfoLine
                        label="Type"
                        value={
                          selectedDisaster.disaster_type ||
                          selectedDisaster.type
                        }
                      />

                      <InfoLine
                        label="Location"
                        value={
                          selectedDisaster.location
                        }
                      />

                      <InfoLine
                        label="Severity"
                        value={
                          selectedDisaster.severity
                        }
                      />

                    </SelectionPanel>
                  )}

                  {selectedZone && (
                    <SelectionPanel
                      title="Response Zone"
                      icon={
                        <MapPin size={18} />
                      }
                      color="blue"
                    >

                      <InfoLine
                        label="ID"
                        value={
                          selectedZone.id
                        }
                      />

                      <InfoLine
                        label="Grid"
                        value={
                          selectedZone.grid_cell_id
                        }
                      />

                      <InfoLine
                        label="Location"
                        value={
                          selectedZone.location
                        }
                      />

                      <InfoLine
                        label="Population"
                        value={formatNumber(
                          selectedZone.population
                        )}
                      />

                      <InfoLine
                        label="Vulnerable"
                        value={formatNumber(
                          selectedZone.vulnerable_population
                        )}
                      />

                    </SelectionPanel>
                  )}

                  {selectedVehicle && (
                    <SelectionPanel
                      title="Selected Vehicle"
                      icon={
                        <Truck size={18} />
                      }
                      color="orange"
                    >

                      <InfoLine
                        label="Vehicle"
                        value={
                          selectedVehicle.vehicle_number ||
                          `#${selectedVehicle.id}`
                        }
                      />

                      <InfoLine
                        label="Driver"
                        value={
                          selectedVehicle.driver_name
                        }
                      />

                      <InfoLine
                        label="Type"
                        value={
                          selectedVehicle.vehicle_type
                        }
                      />

                      <InfoLine
                        label="Location"
                        value={
                          selectedVehicle.location
                        }
                      />

                      <InfoLine
                        label="Status"
                        value={
                          selectedVehicle.status
                        }
                      />

                    </SelectionPanel>
                  )}

                </div>
              )}

              {/* ACTIONS */}

              <div className="flex flex-wrap gap-3 mt-6">

                <button
                  type="submit"
                  disabled={
                    optimizing ||
                    multiOptimizing
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-black transition shadow-lg shadow-red-600/20"
                >

                  {optimizing ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Run AI Optimization
                    </>
                  )}

                </button>

                <button
                  type="button"
                  onClick={
                    handleOptimizeMultiple
                  }
                  disabled={
                    multiOptimizing ||
                    optimizing ||
                    !form.disaster_id
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl font-black transition"
                >

                  {multiOptimizing ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Layers size={18} />
                  )}

                  Optimize All Zones
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={
                    optimizing ||
                    multiOptimizing
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-black transition"
                >
                  <RefreshCw size={18} />
                  Reset
                </button>

                {selectedVehicle &&
                  selectedZone && (
                    <button
                      type="button"
                      onClick={
                        handleGetRoute
                      }
                      disabled={routeLoading}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white rounded-xl font-black transition"
                    >

                      {routeLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Route size={18} />
                      )}

                      Route & ETA
                    </button>
                  )}

              </div>
            </form>
          </div>

          {/* ==================================================
              RIGHT SIDE ENGINE STATUS
          ================================================== */}

          <div className="space-y-4">

            <EngineCard
              icon={
                <Brain size={21} />
              }
              title="AI Demand"
              value="Gradient Boosting"
              description="Multi-resource demand prediction"
            />

            <EngineCard
              icon={
                <Users size={21} />
              }
              title="Vulnerability"
              value="Enabled"
              description="Zone-aware demand adjustment"
            />

            <EngineCard
              icon={
                <Zap size={21} />
              }
              title="Optimization"
              value="OR-Tools"
              description="Constraint-based allocation"
            />

            <EngineCard
              icon={
                <Boxes size={21} />
              }
              title="Inventory"
              value={`${resources.length} Records`}
              description="Live backend resources"
            />

            <EngineCard
              icon={
                <Truck size={21} />
              }
              title="Fleet"
              value={`${availableVehicles.length} Ready`}
              description="Available response vehicles"
            />

            <EngineCard
              icon={
                <Database size={21} />
              }
              title="Logistics Plans"
              value={`${plans.length} Saved`}
              description="Persisted backend plans"
            />

            {routeData && (
              <RouteCard
                data={routeData}
              />
            )}

          </div>
        </div>

        {/* ==================================================
            OPTIMIZATION RESULT
        ================================================== */}

        {optimizationResult && (
          <OptimizationResult
            result={
              optimizationResult
            }
            onCreatePlan={
              handleCreatePlan
            }
            savingPlan={
              savingPlan
            }
          />
        )}

        {/* ==================================================
            MULTI-ZONE RESULT
        ================================================== */}

        {multiOptimizationResult && (
          <MultiOptimizationResult
            result={
              multiOptimizationResult
            }
          />
        )}

        {/* ==================================================
            REALLOCATION
        ================================================== */}

        <ReallocationPanel
          plans={plans}
          vehicles={
            availableVehicles
          }
          form={
            reallocationForm
          }
          setForm={
            setReallocationForm
          }
          onSubmit={
            handleReallocate
          }
          loading={
            reallocating
          }
        />

        {/* ==================================================
            LIVE PLANS
        ================================================== */}

        <LogisticsPlans
          plans={plans}
          loading={plansLoading}
          onStatusChange={
            handlePlanStatus
          }
          onRefresh={
            loadPlans
          }
          onView={
            handleViewPlan
          }
        />

        {/* ==================================================
            PLAN DETAILS
        ================================================== */}

        {selectedPlan && (
          <PlanDetails
            plan={selectedPlan}
            onClose={() =>
              setSelectedPlan(null)
            }
          />
        )}

      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.75rem 0.9rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          background: white;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }

        .input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
        }

        .input:disabled {
          cursor: not-allowed;
        }

        .input::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

// ============================================================
// OPTIMIZATION RESULT
// ============================================================

const OptimizationResult = ({
  result,
  onCreatePlan,
  savingPlan,
}) => {
  const disaster =
    result?.disaster || {};

  const zone =
    result?.zone || {};

  const priorityRaw = result?.priority;

  const priority =
    priorityRaw && typeof priorityRaw === "object" ? priorityRaw : {};

  const priorityLevel =
    typeof priorityRaw === "string"
      ? priorityRaw
      : priority.level || result?.priority_level || "-";

  const prediction = result?.prediction || {};

  const predictedDemand =
    prediction?.predicted_demand ??
    (prediction && typeof prediction === "object" && !Array.isArray(prediction)
      ? prediction
      : {});

  const rawAlloc = result?.resource_allocation;

  const allocations = Array.isArray(rawAlloc)
    ? rawAlloc
    : rawAlloc && typeof rawAlloc === "object"
    ? Object.entries(rawAlloc).map(([resource_type, v]) => ({
        resource_type,
        ...v,
        predicted_demand: v?.demand ?? v?.predicted_demand,
        allocation_status:
          (v?.shortage ?? 0) > 0
            ? v?.allocated === 0 ? "shortage" : "partial"
            : "fully_allocated",
      }))
    : [];

  const summary =
    result?.summary || {};

  const vehicle =
    result?.vehicle || null;

  const vulnerabilityRatio =
    Number(
      prediction?.vulnerability_ratio || 0
    );

  const vulnerabilityMultiplier =
    Number(
      prediction?.vulnerability_multiplier || 1
    );

  const demandValue = (
    primary,
    secondary
  ) =>
    predictedDemand?.[primary] ??
    predictedDemand?.[secondary] ??
    predictedDemand?.[
      primary?.toLowerCase()
    ] ??
    0;

  return (
    <div className="space-y-6">

      {/* RESULT HEADER */}

      <div className="bg-white rounded-3xl border border-green-200 shadow-sm overflow-hidden">

        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="p-3 bg-green-600 rounded-2xl text-white">
                <CheckCircle size={26} />
              </div>

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-green-600">
                  AI Optimization Engine
                </p>

                <h2 className="text-2xl font-black text-slate-800">
                  Logistics Plan Generated
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Demand, vulnerability and
                  resource allocation completed.
                </p>

              </div>
            </div>

            <button
              type="button"
              onClick={onCreatePlan}
              disabled={
                savingPlan ||
                allocations.length === 0
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl font-black"
            >

              {savingPlan ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Save Logistics Plan
                </>
              )}

            </button>

          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

          <ResultPanel
            title="Disaster"
            icon={
              <AlertTriangle size={19} />
            }
            color="red"
          >

            <InfoLine
              label="ID"
              value={
                disaster.id
              }
            />

            <InfoLine
              label="Type"
              value={
                disaster.type ||
                disaster.disaster_type
              }
            />

            <InfoLine
              label="Location"
              value={
                disaster.location
              }
            />

            <InfoLine
              label="Severity"
              value={
                disaster.severity
              }
            />

          </ResultPanel>

          <ResultPanel
            title="Response Zone"
            icon={
              <MapPin size={19} />
            }
            color="blue"
          >

            <InfoLine
              label="Zone"
              value={
                zone.id
              }
            />

            <InfoLine
              label="Grid"
              value={
                zone.grid_cell_id
              }
            />

            <InfoLine
              label="Location"
              value={
                zone.location
              }
            />

            <InfoLine
              label="Population"
              value={formatNumber(
                zone.population
              )}
            />

          </ResultPanel>

        </div>
      </div>

      {/* SUMMARY METRICS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <MetricCard
          icon={
            <AlertTriangle size={21} />
          }
          label="Priority"
          value={priorityLevel}
          description={`Weight: ${
            priority.weight ??
            result?.priority_weight ??
            "-"
          }`}
        />

        <MetricCard
          icon={
            <Users size={21} />
          }
          label="Vulnerability"
          value={`${(
            vulnerabilityRatio * 100
          ).toFixed(1)}%`}
          description="Vulnerable population"
        />

        <MetricCard
          icon={
            <Brain size={21} />
          }
          label="Multiplier"
          value={
            vulnerabilityMultiplier.toFixed(
              2
            )
          }
          description="Demand adjustment"
        />

        <MetricCard
          icon={
            <Package size={21} />
          }
          label="Allocated"
          value={formatNumber(
            summary.total_allocated
          )}
          description={`Requested ${formatNumber(
            summary.total_requested
          )}`}
        />

      </div>

      {/* AI DEMAND */}

      <div className="bg-white rounded-3xl border border-purple-200 shadow-sm overflow-hidden">

        <div className="px-6 py-5 bg-purple-50 border-b border-purple-200">

          <div className="flex items-center gap-3">

            <div className="p-3 bg-white rounded-xl text-purple-600">
              <Brain size={21} />
            </div>

            <div>

              <h2 className="text-lg font-black text-purple-900">
                AI Resource Demand
              </h2>

              <p className="text-sm text-purple-700">
                Predicted resource requirements
                from the backend AI pipeline.
              </p>

            </div>

          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <DemandCard
            label="Food"
            value={
              demandValue(
                "Food",
                "food"
              )
            }
          />

          <DemandCard
            label="Water"
            value={
              demandValue(
                "Water",
                "water"
              )
            }
          />

          <DemandCard
            label="Medical Kit"
            value={
              predictedDemand?.[
                "Medical Kit"
              ] ??
              predictedDemand?.medical_kit ??
              predictedDemand?.medical_kit_demand ??
              0
            }
          />

          <DemandCard
            label="Shelter"
            value={
              predictedDemand?.Shelter ??
              predictedDemand?.shelter ??
              predictedDemand?.shelter_demand ??
              0
            }
          />

        </div>
      </div>

      {/* RESOURCE ALLOCATION */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="px-6 py-5 border-b border-slate-200">

          <div className="flex items-center gap-3">

            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Package size={21} />
            </div>

            <div>

              <h2 className="text-lg font-black text-slate-800">
                Resource Allocation
              </h2>

              <p className="text-sm text-slate-500">
                Allocation against backend
                resource inventory.
              </p>

            </div>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="p-12 text-center">

            <Package
              size={42}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-slate-500">
              No allocation data returned.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr>

                  {[
                    "Resource",
                    "Demand",
                    "Available",
                    "Allocated",
                    "Shortage",
                    "Status",
                  ].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-5 py-4 text-left text-xs font-black text-slate-500 uppercase whitespace-nowrap"
                      >
                        {header}
                      </th>
                    )
                  )}

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {allocations.map(
                  (
                    allocation,
                    index
                  ) => {

                    const shortage =
                      Number(
                        allocation?.shortage ||
                        0
                      );

                    return (
                      <tr
                        key={
                          allocation?.resource_type ||
                          allocation?.resource ||
                          index
                        }
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <Package
                              size={17}
                              className="text-blue-600"
                            />

                            <span className="font-bold">
                              {allocation?.resource_type ||
                                allocation?.resource ||
                                "-"}
                            </span>

                          </div>

                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatNumber(
                            allocation?.predicted_demand ??
                            allocation?.demand
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            allocation?.available
                          )}
                        </td>

                        <td className="px-5 py-4 font-black text-blue-700">
                          {formatNumber(
                            allocation?.allocated
                          )}
                        </td>

                        <td className="px-5 py-4 font-black">

                          <span
                            className={
                              shortage > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {formatNumber(
                              shortage
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <AllocationBadge
                            status={
                              allocation?.allocation_status
                            }
                          />

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <SummaryCard
          label="Requested"
          value={
            summary.total_requested
          }
          icon={
            <Package size={20} />
          }
        />

        <SummaryCard
          label="Allocated"
          value={
            summary.total_allocated
          }
          icon={
            <CheckCircle size={20} />
          }
        />

        <SummaryCard
          label="Shortage"
          value={
            summary.total_shortage
          }
          icon={
            <AlertTriangle size={20} />
          }
        />

        <SummaryCard
          label="Delivery"
          value={
            formatStatus(
              summary.delivery_status
            )
          }
          icon={
            <Truck size={20} />
          }
        />

      </div>

      {/* ASSIGNED VEHICLE */}

      {vehicle && (
        <ResultPanel
          title="Assigned Response Vehicle"
          icon={
            <Truck size={19} />
          }
          color="orange"
        >

          <InfoLine
            label="Vehicle"
            value={
              vehicle.vehicle_number ||
              `#${vehicle.id}`
            }
          />

          <InfoLine
            label="Type"
            value={
              vehicle.vehicle_type
            }
          />

          <InfoLine
            label="Driver"
            value={
              vehicle.driver_name
            }
          />

          <InfoLine
            label="Location"
            value={
              vehicle.location
            }
          />

          <InfoLine
            label="Status"
            value={
              vehicle.status
            }
          />

        </ResultPanel>
      )}

    </div>
  );
};

// ============================================================
// MULTI-ZONE RESULT
// ============================================================

const MultiOptimizationResult = ({
  result,
}) => {
  const items =
    normalizeArray(result);

  return (
    <div className="bg-white rounded-3xl border border-purple-200 shadow-sm overflow-hidden">

      <div className="px-6 py-5 bg-purple-50 border-b border-purple-200">

        <div className="flex items-center gap-3">

          <div className="p-3 bg-purple-600 rounded-xl text-white">
            <Layers size={21} />
          </div>

          <div>

            <h2 className="text-xl font-black text-purple-900">
              Multi-Zone Optimization
            </h2>

            <p className="text-sm text-purple-700">
              Backend optimization results across
              multiple response zones.
            </p>

          </div>

        </div>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-slate-50">

              <tr>

                {[
                  "Zone",
                  "Resource",
                  "Demand",
                  "Available",
                  "Allocated",
                  "Shortage",
                  "Status",
                ].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  )
                )}

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {items.map(
                (
                  item,
                  index
                ) => (
                  <tr
                    key={
                      item?.id ||
                      item?.zone_id ||
                      index
                    }
                    className="hover:bg-slate-50"
                  >

                    <td className="px-5 py-4 font-black">
                      {item?.zone_id ??
                        item?.zone?.id ??
                        item?.id ??
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      {item?.resource_type ||
                        item?.resource ||
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(
                        item?.predicted_demand ??
                        item?.demand
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(
                        item?.available
                      )}
                    </td>

                    <td className="px-5 py-4 font-black text-green-700">
                      {formatNumber(
                        item?.allocated
                      )}
                    </td>

                    <td className="px-5 py-4 font-black text-red-600">
                      {formatNumber(
                        item?.shortage
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <AllocationBadge
                        status={
                          item?.allocation_status
                        }
                      />
                    </td>

                  </tr>
                )
              )}

            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center text-slate-500">
          Multi-zone optimization completed.
          The backend returned a response structure
          without a tabular result list.
        </div>
      )}

    </div>
  );
};

// ============================================================
// REALLOCATION PANEL
// ============================================================

const ReallocationPanel = ({
  plans,
  vehicles,
  form,
  setForm,
  onSubmit,
  loading,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden">

      <div className="px-6 py-5 bg-orange-50 border-b border-orange-200">

        <div className="flex items-center gap-3">

          <div className="p-3 bg-orange-600 text-white rounded-xl">
            <RotateCcw size={21} />
          </div>

          <div>

            <h2 className="text-lg font-black text-orange-900">
              Resource Reallocation
            </h2>

            <p className="text-sm text-orange-700">
              Reassign resources or vehicles when
              response requirements change.
            </p>

          </div>
        </div>
      </div>

      <div className="p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <FormField label="Logistics Plan">

            <select
              value={form.plan_id}
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    plan_id:
                      event.target.value,
                  })
                )
              }
              className="input"
            >

              <option value="">
                Select Plan
              </option>

              {plans.map(
                (plan) => (
                  <option
                    key={plan.id}
                    value={plan.id}
                  >
                    #{plan.id} ·{" "}
                    {plan.resource_type ||
                      "Resource"}{" "}
                    ·{" "}
                    {plan.destination_location ||
                      "Destination"}
                  </option>
                )
              )}

            </select>
          </FormField>

          <FormField label="New Vehicle">

            <select
              value={form.vehicle_id}
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    vehicle_id:
                      event.target.value,
                  })
                )
              }
              className="input"
            >

              <option value="">
                Keep Current Vehicle
              </option>

              {vehicles.map(
                (vehicle) => (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                  >
                    {vehicle.vehicle_number ||
                      `Vehicle #${vehicle.id}`}
                    {vehicle.location
                      ? ` · ${vehicle.location}`
                      : ""}
                  </option>
                )
              )}

            </select>
          </FormField>

          <FormField label="New Quantity">

            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    quantity:
                      event.target.value,
                  })
                )
              }
              placeholder="Optional"
              className="input"
            />

          </FormField>

          <FormField label="Reason">

            <input
              type="text"
              value={form.reason}
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    reason:
                      event.target.value,
                  })
                )
              }
              placeholder="Reason for reallocation"
              className="input"
            />

          </FormField>

        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl font-black"
        >

          {loading ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <RotateCcw size={18} />
          )}

          Reallocate Resources

        </button>

      </div>
    </div>
  );
};

// ============================================================
// LIVE LOGISTICS PLANS
// ============================================================

const LogisticsPlans = ({
  plans,
  loading,
  onStatusChange,
  onRefresh,
  onView,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <ClipboardList size={21} />
          </div>

          <div>

            <h2 className="text-lg font-black text-slate-800">
              Live Logistics Plans
            </h2>

            <p className="text-sm text-slate-500">
              Persisted backend plans and delivery
              status.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh Plans
        </button>

      </div>

      {loading ? (
        <div className="p-10 flex justify-center">
          <Loader2
            size={25}
            className="animate-spin text-red-600"
          />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center">

          <ClipboardList
            size={44}
            className="mx-auto text-slate-300"
          />

          <h3 className="mt-4 font-bold text-slate-700">
            No saved logistics plans
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Run AI optimization and save a plan.
          </p>

        </div>
      ) : (
        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-slate-50">

              <tr>

                {[
                  "Plan",
                  "Route",
                  "Resource",
                  "Quantity",
                  "Vehicle",
                  "Priority",
                  "Status",
                  "Action",
                ].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-5 py-4 text-left text-xs font-black text-slate-500 uppercase whitespace-nowrap"
                    >
                      {header}
                    </th>
                  )
                )}

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {plans.map(
                (plan) => {

                  const status =
                    String(
                      plan?.status || ""
                    ).toLowerCase();

                  const delivered =
                    status.includes(
                      "delivered"
                    ) ||
                    status.includes(
                      "complete"
                    );

                  const inTransit =
                    status.includes(
                      "transit"
                    ) ||
                    status.includes(
                      "dispatch"
                    );

                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50"
                    >

                      {/* PLAN */}

                      <td className="px-5 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            onView(plan)
                          }
                          className="inline-flex items-center gap-1 font-black text-red-600 hover:underline"
                        >
                          #{plan.id}
                          <Eye size={14} />
                        </button>

                      </td>

                      {/* ROUTE */}

                      <td className="px-5 py-4 min-w-[270px]">

                        <div className="flex items-start gap-2">

                          <MapPin
                            size={16}
                            className="text-red-500 mt-0.5"
                          />

                          <div>

                            <p className="font-semibold">
                              {plan.source_location ||
                                "-"}
                            </p>

                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <ArrowRight
                                size={12}
                              />
                              {plan.destination_location ||
                                "-"}
                            </div>

                          </div>

                        </div>
                      </td>

                      {/* RESOURCE */}

                      <td className="px-5 py-4 font-semibold">
                        {plan.resource_type ||
                          "-"}
                      </td>

                      {/* QUANTITY */}

                      <td className="px-5 py-4 font-black">
                        {formatNumber(
                          plan.quantity
                        )}
                      </td>

                      {/* VEHICLE */}

                      <td className="px-5 py-4">

                        {plan.vehicle_id ? (
                          <div className="flex items-center gap-2">
                            <Truck
                              size={16}
                              className="text-slate-500"
                            />
                            #{plan.vehicle_id}
                          </div>
                        ) : (
                          "-"
                        )}

                      </td>

                      {/* PRIORITY */}

                      <td className="px-5 py-4">
                        <PriorityBadge
                          priority={
                            plan.priority
                          }
                        />
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <PlanStatus
                          status={
                            plan.status
                          }
                        />
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

                          {!inTransit &&
                            !delivered && (
                              <button
                                type="button"
                                onClick={() =>
                                  onStatusChange(
                                    plan,
                                    "in_transit"
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-black hover:bg-purple-100"
                              >
                                Dispatch
                              </button>
                            )}

                          {!delivered && (
                            <button
                              type="button"
                              onClick={() =>
                                onStatusChange(
                                  plan,
                                  "delivered"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-black hover:bg-green-100"
                            >
                              Delivered
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================
// PLAN DETAILS
// ============================================================

const PlanDetails = ({
  plan,
  onClose,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-red-200 shadow-sm overflow-hidden">

      <div className="px-6 py-5 bg-red-50 border-b border-red-200 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="p-3 bg-red-600 text-white rounded-xl">
            <ClipboardList size={20} />
          </div>

          <div>

            <h2 className="text-lg font-black text-red-900">
              Logistics Plan #{plan?.id}
            </h2>

            <p className="text-sm text-red-700">
              Live backend plan details
            </p>

          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-lg bg-white border border-red-200 text-red-700 font-bold hover:bg-red-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>

      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <InfoLine
          label="Plan ID"
          value={
            plan?.id
          }
        />

        <InfoLine
          label="Disaster ID"
          value={
            plan?.disaster_id
          }
        />

        <InfoLine
          label="Resource"
          value={
            plan?.resource_type
          }
        />

        <InfoLine
          label="Quantity"
          value={formatNumber(
            plan?.quantity
          )}
        />

        <InfoLine
          label="Vehicle ID"
          value={
            plan?.vehicle_id
          }
        />

        <InfoLine
          label="Priority"
          value={
            formatStatus(
              plan?.priority
            )
          }
        />

        <InfoLine
          label="Status"
          value={
            formatStatus(
              plan?.status
            )
          }
        />

        <InfoLine
          label="Source"
          value={
            plan?.source_location
          }
        />

        <InfoLine
          label="Destination"
          value={
            plan?.destination_location
          }
        />

      </div>
    </div>
  );
};

// ============================================================
// ROUTE CARD
// ============================================================

const RouteCard = ({
  data,
}) => {
  const eta =
    data?.eta_minutes ??
    data?.estimated_time_minutes ??
    data?.estimated_travel_time_minutes ??
    data?.travel_time_minutes ??
    data?.eta;

  const distance =
    data?.distance_km ??
    data?.distance ??
    data?.distanceKm;

  const originRaw =
    data?.source_location ??
    data?.source ??
    data?.origin;

  const source =
    originRaw && typeof originRaw === "object"
      ? `${originRaw.latitude ?? ""}, ${originRaw.longitude ?? ""}`
      : originRaw;

  const destRaw =
    data?.destination_location ??
    data?.destination ??
    data?.destination_address;

  const destination =
    destRaw && typeof destRaw === "object"
      ? `${destRaw.latitude ?? ""}, ${destRaw.longitude ?? ""}`
      : destRaw;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
          <Navigation size={20} />
        </div>

        <div>

          <p className="text-xs font-black uppercase text-slate-500">
            Route Intelligence
          </p>

          <h3 className="font-black text-slate-800">
            Vehicle Route & ETA
          </h3>

        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">

        <SmallMetric
          label="Distance"
          value={
            distance !== undefined &&
            distance !== null
              ? `${distance} km`
              : "-"
          }
        />

        <SmallMetric
          label="ETA"
          value={
            eta !== undefined &&
            eta !== null
              ? `${eta} min`
              : "-"
          }
        />

      </div>

      {(source ||
        destination) && (
        <div className="mt-4 space-y-2">

          <InfoLine
            label="From"
            value={source}
          />

          <InfoLine
            label="To"
            value={destination}
          />

        </div>
      )}

      {data?.route_status && (
        <div className="mt-4">
          <PlanStatus
            status={
              data.route_status
            }
          />
        </div>
      )}

    </div>
  );
};

// ============================================================
// ENGINE CARD
// ============================================================

const EngineCard = ({
  icon,
  title,
  value,
  description,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
          {icon}
        </div>

        <div>

          <p className="text-xs font-black uppercase text-slate-400">
            {title}
          </p>

          <p className="font-black text-slate-800 mt-0.5">
            {value}
          </p>

          <p className="text-xs text-slate-500 mt-0.5">
            {description}
          </p>

        </div>
      </div>
    </div>
  );
};

// ============================================================
// LIVE METRIC
// ============================================================

const LiveMetric = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="text-3xl font-black text-slate-800 mt-2">
            {formatNumber(value)}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {description}
          </p>

        </div>

        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          {icon}
        </div>

      </div>
    </div>
  );
};

// ============================================================
// FORM FIELD
// ============================================================

const FormField = ({
  label,
  children,
}) => {
  return (
    <div>

      <label className="block text-sm font-bold text-slate-700 mb-2">
        {label}
      </label>

      {children}

    </div>
  );
};

// ============================================================
// SELECTION PANEL
// ============================================================

const SelectionPanel = ({
  title,
  icon,
  color,
  children,
}) => {
  const colors = {
    red:
      "bg-red-50 border-red-200 text-red-700",

    blue:
      "bg-blue-50 border-blue-200 text-blue-700",

    orange:
      "bg-orange-50 border-orange-200 text-orange-700",
  };

  return (
    <div
      className={`border rounded-2xl p-4 ${
        colors[color] ||
        colors.blue
      }`}
    >

      <div className="flex items-center gap-2 mb-4">
        {icon}

        <h3 className="font-black">
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        {children}
      </div>

    </div>
  );
};

// ============================================================
// RESULT PANEL
// ============================================================

const ResultPanel = ({
  title,
  icon,
  color,
  children,
}) => {
  const colors = {
    red:
      "border-red-200 bg-red-50",

    blue:
      "border-blue-200 bg-blue-50",

    orange:
      "border-orange-200 bg-orange-50",
  };

  return (
    <div
      className={`border rounded-2xl p-5 ${
        colors[color] ||
        colors.blue
      }`}
    >

      <div className="flex items-center gap-2 mb-4">

        {icon}

        <h3 className="font-black text-slate-800">
          {title}
        </h3>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>

    </div>
  );
};

// ============================================================
// INFO LINE
// ============================================================

const InfoLine = ({
  label,
  value,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-white/70 rounded-lg">

      <span className="text-xs font-semibold text-slate-500">
        {label}
      </span>

      <span className="text-sm font-black text-slate-800 text-right break-words">
        {value === null ||
        value === undefined ||
        value === ""
          ? "-"
          : value}
      </span>

    </div>
  );
};

// ============================================================
// METRIC CARD
// ============================================================

const MetricCard = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-black uppercase text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>

        </div>

        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
          {icon}
        </div>

      </div>
    </div>
  );
};

// ============================================================
// DEMAND CARD
// ============================================================

const DemandCard = ({
  label,
  value,
}) => {
  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">

      <div className="flex items-center gap-2">

        <Package
          size={17}
          className="text-purple-600"
        />

        <span className="text-sm font-bold text-slate-600">
          {label}
        </span>

      </div>

      <p className="mt-3 text-3xl font-black text-slate-800">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Predicted demand
      </p>

    </div>
  );
};

// ============================================================
// SUMMARY CARD
// ============================================================

const SummaryCard = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-xs font-black uppercase text-slate-400">
          {label}
        </p>

        <div className="text-slate-500">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-2xl font-black text-slate-800">
        {typeof value === "number"
          ? formatNumber(value)
          : value || "-"}
      </p>

    </div>
  );
};

// ============================================================
// ALLOCATION BADGE
// ============================================================

const AllocationBadge = ({
  status,
}) => {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "shortage"
    ) ||
    normalized.includes(
      "unavailable"
    )
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-black">

        <XCircle size={13} />

        Shortage

      </span>
    );
  }

  if (
    normalized.includes(
      "partial"
    )
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-black">

        <AlertTriangle size={13} />

        Partial

      </span>
    );
  }

  if (
    normalized.includes(
      "allocated"
    ) ||
    normalized.includes(
      "fully"
    )
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-black">

        <CheckCircle size={13} />

        Allocated

      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">

      <CircleDot size={13} />

      {formatStatus(status)}

    </span>
  );
};

// ============================================================
// PLAN STATUS
// ============================================================

const PlanStatus = ({
  status,
}) => {
  const normalized =
    String(status || "")
      .toLowerCase();

  let classes =
    "bg-blue-100 text-blue-700";

  if (
    normalized.includes(
      "transit"
    ) ||
    normalized.includes(
      "dispatch"
    )
  ) {
    classes =
      "bg-purple-100 text-purple-700";
  }

  if (
    normalized.includes(
      "delivered"
    ) ||
    normalized.includes(
      "complete"
    )
  ) {
    classes =
      "bg-green-100 text-green-700";
  }

  if (
    normalized.includes(
      "cancel"
    ) ||
    normalized.includes(
      "failed"
    )
  ) {
    classes =
      "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${classes}`}
    >
      <CircleDot size={12} />
      {formatStatus(status)}
    </span>
  );
};

// ============================================================
// PRIORITY BADGE
// ============================================================

const PriorityBadge = ({
  priority,
}) => {
  const normalized =
    String(priority || "")
      .toLowerCase();

  let classes =
    "bg-slate-100 text-slate-700";

  if (
    normalized === "critical"
  ) {
    classes =
      "bg-red-100 text-red-700";
  } else if (
    normalized === "high"
  ) {
    classes =
      "bg-orange-100 text-orange-700";
  } else if (
    normalized === "medium"
  ) {
    classes =
      "bg-yellow-100 text-yellow-700";
  } else if (
    normalized === "low"
  ) {
    classes =
      "bg-green-100 text-green-700";
  }

  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-black ${classes}`}
    >
      {formatStatus(priority)}
    </span>
  );
};

// ============================================================
// ALERT
// ============================================================

const AlertBox = ({
  type,
  message,
}) => {
  const success =
    type === "success";

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${
        success
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >

      {success ? (
        <CheckCircle
          size={21}
          className="text-green-600"
        />
      ) : (
        <AlertTriangle
          size={21}
          className="text-red-600"
        />
      )}

      <div>

        <p
          className={`font-black ${
            success
              ? "text-green-800"
              : "text-red-800"
          }`}
        >
          {success
            ? "Operation Successful"
            : "Logistics Error"}
        </p>

        <p
          className={`text-sm mt-1 ${
            success
              ? "text-green-700"
              : "text-red-700"
          }`}
        >
          {message}
        </p>

      </div>
    </div>
  );
};

// ============================================================
// SMALL METRIC
// ============================================================

const SmallMetric = ({
  label,
  value,
}) => {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">

      <p className="text-[10px] font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-black text-slate-800">
        {value}
      </p>

    </div>
  );
};

// ============================================================
// PRIMARY RESOURCE
// ============================================================

const getPrimaryResourceType = (
  result
) => {
  const _raw = result?.resource_allocation;
  const allocations = Array.isArray(_raw)
    ? _raw
    : _raw && typeof _raw === "object"
    ? Object.entries(_raw).map(([resource_type, v]) => ({ resource_type, ...v }))
    : [];

  if (!allocations.length) {
    return "Food";
  }

  const sorted =
    [...allocations].sort(
      (a, b) =>
        Number(
          b?.allocated || 0
        ) -
        Number(
          a?.allocated || 0
        )
    );

  return (
    sorted[0]?.resource_type ||
    sorted[0]?.resource ||
    "Food"
  );
};

// ============================================================
// PRIMARY QUANTITY
// ============================================================

const getPrimaryAllocatedQuantity = (
  result
) => {
  const _raw = result?.resource_allocation;
  const allocations = Array.isArray(_raw)
    ? _raw
    : _raw && typeof _raw === "object"
    ? Object.entries(_raw).map(([resource_type, v]) => ({ resource_type, ...v }))
    : [];

  if (!allocations.length) {
    return 0;
  }

  const sorted =
    [...allocations].sort(
      (a, b) =>
        Number(
          b?.allocated || 0
        ) -
        Number(
          a?.allocated || 0
        )
    );

  return Number(
    sorted[0]?.allocated || 0
  );
};

// ============================================================
// EXPORT
// ============================================================

export default Logistics;