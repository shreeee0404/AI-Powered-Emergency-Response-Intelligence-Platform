import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  Package,
  Truck,
  Users,
  ClipboardCheck,
  AlertTriangle,
  RefreshCw,
  Activity,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import {
  getDisasters,
  getResources,
  getVehicles,
  getFieldTeams,
  getMissions,
} from "../services/api";
import { useLanguage } from "../i18n.jsx";

// ============================================================
// HELPERS
// ============================================================

function extractArray(response) {
  if (Array.isArray(response)) return response;

  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }

  if (response?.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  if (response?.items && Array.isArray(response.items)) {
    return response.items;
  }

  if (response?.data?.items && Array.isArray(response.data.items)) {
    return response.data.items;
  }

  return [];
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function Analytics() {
  const { t } = useLanguage();
  const [disasters, setDisasters] = useState([]);
  const [resources, setResources] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [missions, setMissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        getDisasters(),
        getResources(),
        getVehicles(),
        getFieldTeams(),
        getMissions(),
      ]);

      const [
        disasterResult,
        resourceResult,
        vehicleResult,
        teamResult,
        missionResult,
      ] = results;

      if (disasterResult.status === "fulfilled") {
        setDisasters(extractArray(disasterResult.value));
      } else {
        setDisasters([]);
        console.error(
          "Failed to load disasters:",
          disasterResult.reason
        );
      }

      if (resourceResult.status === "fulfilled") {
        setResources(extractArray(resourceResult.value));
      } else {
        setResources([]);
        console.error(
          "Failed to load resources:",
          resourceResult.reason
        );
      }

      if (vehicleResult.status === "fulfilled") {
        setVehicles(extractArray(vehicleResult.value));
      } else {
        setVehicles([]);
        console.error(
          "Failed to load vehicles:",
          vehicleResult.reason
        );
      }

      if (teamResult.status === "fulfilled") {
        setTeams(extractArray(teamResult.value));
      } else {
        setTeams([]);
        console.error(
          "Failed to load field teams:",
          teamResult.reason
        );
      }

      if (missionResult.status === "fulfilled") {
        setMissions(extractArray(missionResult.value));
      } else {
        setMissions([]);
        console.error(
          "Failed to load missions:",
          missionResult.reason
        );
      }

      const failedRequests = results.filter(
        (result) => result.status === "rejected"
      );

      if (failedRequests.length === results.length) {
        setError(
          "Unable to connect to the backend. Please make sure the FastAPI server is running."
        );
      } else if (failedRequests.length > 0) {
        setError(
          `${failedRequests.length} analytics data source${
            failedRequests.length > 1 ? "s" : ""
          } could not be loaded.`
        );
      }
    } catch (err) {
      console.error("Analytics loading error:", err);

      setError(
        err?.message || "Failed to load analytics data."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadAnalytics();
  }, []);

  // ==========================================================
  // DISASTER ANALYTICS
  // ==========================================================

  const severityData = useMemo(() => {
    const levels = [
      "Critical",
      "High",
      "Moderate",
      "Low",
    ];

    return levels.map((level) => ({
      name: level,
      count: disasters.filter(
        (item) =>
          String(item?.severity || "")
            .trim()
            .toLowerCase() === level.toLowerCase()
      ).length,
    }));
  }, [disasters]);

  const highPriorityDisasters = useMemo(() => {
    return disasters.filter((disaster) => {
      const severity = String(
        disaster?.severity || ""
      )
        .trim()
        .toLowerCase();

      return (
        severity === "critical" ||
        severity === "high"
      );
    }).length;
  }, [disasters]);

  // ==========================================================
  // RESOURCE ANALYTICS
  // ==========================================================

  const resourceStatusData = useMemo(() => {
    const statuses = [
      "Available",
      "Deployed",
      "Maintenance",
      "Pending",
    ];

    return statuses.map((status) => ({
      name: status,
      count: resources.filter(
        (item) =>
          normalizeStatus(item?.status) ===
          normalizeStatus(status)
      ).length,
    }));
  }, [resources]);

  const totalResourceQuantity = useMemo(() => {
    return resources.reduce((total, resource) => {
      const quantity = Number(
        resource?.quantity || 0
      );

      return (
        total +
        (Number.isFinite(quantity) ? quantity : 0)
      );
    }, 0);
  }, [resources]);

  const availableResourceRecords = useMemo(() => {
    return resources.filter(
      (resource) =>
        normalizeStatus(resource?.status) ===
        "available"
    ).length;
  }, [resources]);

  // ==========================================================
  // VEHICLE ANALYTICS
  // ==========================================================

  const vehicleStatusData = useMemo(() => {
    const statuses = [
      "Available",
      "Deployed",
      "Maintenance",
    ];

    return statuses.map((status) => ({
      name: status,
      count: vehicles.filter(
        (item) =>
          normalizeStatus(item?.status) ===
          normalizeStatus(status)
      ).length,
    }));
  }, [vehicles]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        normalizeStatus(vehicle?.status) ===
        "available"
    ).length;
  }, [vehicles]);

  const deployedVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        normalizeStatus(vehicle?.status) ===
        "deployed"
    ).length;
  }, [vehicles]);

  // ==========================================================
  // TEAM ANALYTICS
  // ==========================================================

  const activeTeams = useMemo(() => {
    return teams.filter(
      (team) =>
        normalizeStatus(team?.status) ===
        "active"
    ).length;
  }, [teams]);

  const totalTeamMembers = useMemo(() => {
    return teams.reduce((total, team) => {
      const members = Number(
        team?.members || 0
      );

      return (
        total +
        (Number.isFinite(members) ? members : 0)
      );
    }, 0);
  }, [teams]);

  // ==========================================================
  // MISSION ANALYTICS
  // ==========================================================

  const missionStatusData = useMemo(() => {
    const statuses = [
      "Pending",
      "In Progress",
      "Completed",
      "Delivered",
      "Cancelled",
    ];

    return statuses.map((status) => ({
      name: status,

      count: missions.filter((item) => {
        const currentStatus = normalizeStatus(
          item?.status
        );

        const targetStatus = normalizeStatus(
          status
        );

        if (targetStatus === "pending") {
          return (
            currentStatus === "pending" ||
            currentStatus === "planned"
          );
        }

        if (targetStatus === "in_progress") {
          return (
            currentStatus === "in_progress" ||
            currentStatus === "in_transit"
          );
        }

        if (targetStatus === "completed") {
          return currentStatus === "completed";
        }

        if (targetStatus === "delivered") {
          return currentStatus === "delivered";
        }

        if (targetStatus === "cancelled") {
          return currentStatus === "cancelled";
        }

        return false;
      }).length,
    }));
  }, [missions]);

  const completedMissions = useMemo(() => {
    return missions.filter((mission) => {
      const status = normalizeStatus(
        mission?.status
      );

      return (
        status === "completed" ||
        status === "delivered"
      );
    }).length;
  }, [missions]);

  const activeMissions = useMemo(() => {
    return missions.filter((mission) => {
      const status = normalizeStatus(
        mission?.status
      );

      return (
        status === "pending" ||
        status === "planned" ||
        status === "in_progress" ||
        status === "in_transit"
      );
    }).length;
  }, [missions]);

  // ==========================================================
  // MAX VALUES
  // ==========================================================

  const maxSeverityCount = Math.max(
    ...severityData.map((item) => item.count),
    1
  );

  const maxResourceStatusCount = Math.max(
    ...resourceStatusData.map(
      (item) => item.count
    ),
    1
  );

  const maxVehicleStatusCount = Math.max(
    ...vehicleStatusData.map(
      (item) => item.count
    ),
    1
  );

  const maxMissionStatusCount = Math.max(
    ...missionStatusData.map(
      (item) => item.count
    ),
    1
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-red-100 p-3">
            <BarChart3
              size={23}
              className="text-red-600"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("responseAnalytics")}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Real-time operational insights from the
              disaster response system
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />

          {loading ? t("loading") : t("refresh")}
        </button>

      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="font-semibold text-red-800">
              Analytics Notice
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>

        </div>
      )}

      {/* ====================================================
          KPI CARDS
      ==================================================== */}

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">

        <AnalyticsCard
          title="Total Disasters"
          value={
            loading ? "—" : disasters.length
          }
          subtitle="Recorded incidents"
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />

        <AnalyticsCard
          title="Resource Quantity"
          value={
            loading
              ? "—"
              : totalResourceQuantity.toLocaleString()
          }
          subtitle={`${resources.length} resource records`}
          icon={Package}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />

        <AnalyticsCard
          title="Vehicles"
          value={
            loading ? "—" : vehicles.length
          }
          subtitle={`${availableVehicles} available`}
          icon={Truck}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        <AnalyticsCard
          title="Field Teams"
          value={
            loading ? "—" : teams.length
          }
          subtitle={`${activeTeams} active`}
          icon={Users}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        <AnalyticsCard
          title="Missions"
          value={
            loading ? "—" : missions.length
          }
          subtitle={`${completedMissions} completed`}
          icon={ClipboardCheck}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />

      </div>

      {/* ====================================================
          QUICK OPERATIONAL STATS
      ==================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <QuickStat
          label="High Priority Disasters"
          value={
            loading
              ? "—"
              : highPriorityDisasters
          }
          icon={AlertTriangle}
        />

        <QuickStat
          label="Active Missions"
          value={
            loading
              ? "—"
              : activeMissions
          }
          icon={Activity}
        />

        <QuickStat
          label="Available Vehicles"
          value={
            loading
              ? "—"
              : availableVehicles
          }
          icon={Truck}
        />

        <QuickStat
          label="Active Field Teams"
          value={
            loading
              ? "—"
              : activeTeams
          }
          icon={Users}
        />

      </div>

      {/* ====================================================
          ANALYTICS CHARTS
      ==================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        <AnalyticsPanel
          title="Disaster Severity"
          description="Distribution of recorded incidents by severity"
        >
          <SimpleBars
            data={severityData}
            maxValue={maxSeverityCount}
            emptyText="No disaster records available."
            barClass="bg-red-600"
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Resource Status"
          description="Current status of resource inventory records"
        >
          <SimpleBars
            data={resourceStatusData}
            maxValue={maxResourceStatusCount}
            emptyText="No resource records available."
            barClass="bg-orange-500"
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Vehicle Fleet Status"
          description="Current operational status of the vehicle fleet"
        >
          <SimpleBars
            data={vehicleStatusData}
            maxValue={maxVehicleStatusCount}
            emptyText="No vehicle records available."
            barClass="bg-blue-600"
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Mission Status"
          description="Current status of disaster response missions"
        >
          <SimpleBars
            data={missionStatusData}
            maxValue={maxMissionStatusCount}
            emptyText="No mission records available."
            barClass="bg-purple-600"
          />
        </AnalyticsPanel>

      </div>

      {/* ====================================================
          OPERATIONAL SUMMARY
      ==================================================== */}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-6">

          <h2 className="text-lg font-bold text-slate-900">
            Operational Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current backend records across the response
            management system
          </p>

        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryItem
            label="Critical Disasters"
            value={
              severityData.find(
                (item) =>
                  item.name === "Critical"
              )?.count || 0
            }
          />

          <SummaryItem
            label="Available Resources"
            value={availableResourceRecords}
          />

          <SummaryItem
            label="Available Vehicles"
            value={availableVehicles}
          />

          <SummaryItem
            label="Active Field Teams"
            value={activeTeams}
          />

        </div>

      </div>

      {/* ====================================================
          RESPONSE OVERVIEW
      ==================================================== */}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">

        <OverviewCard
          title="Mission Progress"
          icon={ClipboardCheck}
          iconClass="text-purple-600"
          bgClass="bg-purple-100"
          value={completedMissions}
          label="Completed / Delivered"
          secondary={`${activeMissions} currently active`}
        />

        <OverviewCard
          title="Fleet Readiness"
          icon={Truck}
          iconClass="text-blue-600"
          bgClass="bg-blue-100"
          value={availableVehicles}
          label="Vehicles Available"
          secondary={`${deployedVehicles} currently deployed`}
        />

        <OverviewCard
          title="Team Capacity"
          icon={Users}
          iconClass="text-green-600"
          bgClass="bg-green-100"
          value={totalTeamMembers}
          label="Total Team Members"
          secondary={`${activeTeams} active field teams`}
        />

      </div>

      {/* ====================================================
          DATA SUMMARY
      ==================================================== */}

      {!loading && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-2">

            <Activity
              size={19}
              className="text-slate-600"
            />

            <h2 className="text-lg font-bold text-slate-900">
              Data Summary
            </h2>

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <DataCount
              label="Disasters"
              value={disasters.length}
            />

            <DataCount
              label="Resources"
              value={resources.length}
            />

            <DataCount
              label="Vehicles"
              value={vehicles.length}
            />

            <DataCount
              label="Field Teams"
              value={teams.length}
            />

            <DataCount
              label="Missions"
              value={missions.length}
            />

          </div>

        </div>
      )}

      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {!loading &&
        disasters.length === 0 &&
        resources.length === 0 &&
        vehicles.length === 0 &&
        teams.length === 0 &&
        missions.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">

            <BarChart3
              size={42}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-4 text-lg font-semibold text-slate-800">
              No analytics data yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Analytics will appear automatically once
              disasters, resources, vehicles, field teams,
              or missions are added.
            </p>

            <button
              type="button"
              onClick={loadAnalytics}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Try Again
            </button>

          </div>
        )}

    </div>
  );
}

// ============================================================
// ANALYTICS CARD
// ============================================================

function AnalyticsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon
            size={21}
            className={iconColor}
          />
        </div>

      </div>

    </div>
  );
}

// ============================================================
// QUICK STAT
// ============================================================

function QuickStat({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

      <div>
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-900">
          {value}
        </p>
      </div>

      <div className="rounded-lg bg-slate-100 p-2.5">
        <Icon
          size={20}
          className="text-slate-600"
        />
      </div>

    </div>
  );
}

// ============================================================
// ANALYTICS PANEL
// ============================================================

function AnalyticsPanel({
  title,
  description,
  children,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-6">
        {children}
      </div>

    </div>
  );
}

// ============================================================
// SIMPLE BAR CHART
// ============================================================

function SimpleBars({
  data,
  maxValue,
  emptyText,
  barClass,
}) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {data.map((item) => {
        const width =
          item.count === 0
            ? 0
            : Math.max(
                (item.count / maxValue) * 100,
                6
              );

        return (
          <div key={item.name}>

            <div className="mb-2 flex items-center justify-between gap-4">

              <span className="text-sm font-medium text-slate-700">
                {item.name}
              </span>

              <span className="text-sm font-bold text-slate-900">
                {item.count}
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className={`h-full rounded-full transition-all duration-700 ${barClass}`}
                style={{
                  width: `${width}%`,
                }}
              />

            </div>

          </div>
        );
      })}

    </div>
  );
}

// ============================================================
// SUMMARY ITEM
// ============================================================

function SummaryItem({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

// ============================================================
// OVERVIEW CARD
// ============================================================

function OverviewCard({
  title,
  icon: Icon,
  iconClass,
  bgClass,
  value,
  label,
  secondary,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center gap-3">

        <div
          className={`rounded-lg p-2.5 ${bgClass}`}
        >
          <Icon
            size={21}
            className={iconClass}
          />
        </div>

        <h3 className="font-semibold text-slate-800">
          {title}
        </h3>

      </div>

      <p className="mt-5 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {secondary}
      </p>

    </div>
  );
}

// ============================================================
// DATA COUNT
// ============================================================

function DataCount({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 text-center">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

export default Analytics;