import {
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  Package,
  Truck,
  ClipboardList,
  X,
  RefreshCw,
  Siren,
} from "lucide-react"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { translateStatus } from "../i18n.jsx"

import {
  getDisasters,
  getResources,
  getVehicles,
  getMissions,
  getSOSRequests,
} from "../services/api"
import { useLanguage } from "../i18n.jsx"


function Topbar() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true)
    window.addEventListener("pwa-update-available", handleUpdate)
    return () => window.removeEventListener("pwa-update-available", handleUpdate)
  }, [])

  /* ============================================================
     CURRENT USER
     ============================================================ */

  const getStoredUser = () => {
    const storedUser = localStorage.getItem("current_user")

    if (!storedUser) {
      return null
    }

    try {
      return JSON.parse(storedUser)
    } catch {
      return null
    }
  }

  const user = getStoredUser()

  const userName = user?.name || "User"
  const userRole = user?.role || "Operations"

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()


  /* ============================================================
     LOGOUT
     ============================================================ */

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("current_user")
    localStorage.removeItem("notification_preferences")

    setShowMenu(false)
    setShowNotifications(false)

    navigate("/login", {
      replace: true,
    })
  }


  /* ============================================================
     SEARCH
     ============================================================ */

  const searchItems = [
    {
      name: "Dashboard",
      keywords: [
        "dashboard",
        "home",
        "overview",
      ],
      path: "/",
    },

    {
      name: "Incidents",
      keywords: [
        "incident",
        "incidents",
        "disaster",
        "disasters",
      ],
      path: "/incidents",
    },

    {
      name: "Impact Map",
      keywords: [
        "impact",
        "map",
        "location",
        "zones",
      ],
      path: "/impact-map",
    },

    {
      name: "Resources",
      keywords: [
        "resource",
        "resources",
        "inventory",
        "stock",
      ],
      path: "/resources",
    },

    {
      name: "Vehicles",
      keywords: [
        "vehicle",
        "vehicles",
        "truck",
        "transport",
        "fleet",
      ],
      path: "/vehicles",
    },

    {
      name: "AI Prediction",
      keywords: [
        "prediction",
        "predict",
        "demand",
        "forecast",
        "ai",
      ],
      path: "/prediction",
    },

    {
      name: "Logistics",
      keywords: [
        "logistics",
        "route",
        "dispatch",
        "delivery",
        "optimization",
      ],
      path: "/logistics",
    },

    {
      name: "Field Teams",
      keywords: [
        "team",
        "teams",
        "field",
        "personnel",
      ],
      path: "/field-teams",
    },

    {
      name: "Teams",
      keywords: [
        "team",
        "teams",
        "coordinator",
      ],
      path: "/teams",
    },

    {
      name: "Missions",
      keywords: [
        "mission",
        "missions",
        "assignment",
        "response",
      ],
      path: "/missions",
    },

    {
      name: "Analytics",
      keywords: [
        "analytics",
        "analysis",
        "reports",
        "report",
      ],
      path: "/analytics",
    },

    {
      name: "Settings",
      keywords: [
        "settings",
        "configuration",
        "account",
        "profile",
      ],
      path: "/settings",
    },
  ]


  const filteredResults =
    searchQuery.trim() === ""
      ? []
      : searchItems.filter((item) => {
          const query = searchQuery
            .toLowerCase()
            .trim()

          return (
            item.name
              .toLowerCase()
              .includes(query) ||
            item.keywords.some((keyword) =>
              keyword.includes(query)
            )
          )
        })


  const handleSearch = (item) => {
    setSearchQuery("")
    setShowSearchResults(false)
    navigate(item.path)
  }


  const handleSearchKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      filteredResults.length > 0
    ) {
      handleSearch(filteredResults[0])
    }

    if (event.key === "Escape") {
      setSearchQuery("")
      setShowSearchResults(false)
    }
  }


  /* ============================================================
     LOAD REAL NOTIFICATIONS
     ============================================================ */

  const loadNotifications = async () => {
    setLoadingNotifications(true)

    try {
      const results = await Promise.allSettled([
        getDisasters(),
        getResources(),
        getVehicles(),
        getMissions(),
        getSOSRequests(),
      ])

      const disasters =
        results[0].status === "fulfilled" &&
        Array.isArray(results[0].value)
          ? results[0].value
          : []

      const resources =
        results[1].status === "fulfilled" &&
        Array.isArray(results[1].value)
          ? results[1].value
          : []

      const vehicles =
        results[2].status === "fulfilled" &&
        Array.isArray(results[2].value)
          ? results[2].value
          : []

      const missions =
        results[3].status === "fulfilled" &&
        Array.isArray(results[3].value)
          ? results[3].value
          : []

      const sosRequests =
        results[4].status === "fulfilled" &&
        Array.isArray(results[4].value)
          ? results[4].value
          : []


      const alerts = []


      /* ========================================================
         SOS ALERTS
         ======================================================== */

      const pendingSOS = sosRequests.filter(
        (s) => String(s.status || "").toLowerCase() === "pending"
      )

      pendingSOS.forEach((sos) => {
        alerts.push({
          id: `sos-${sos.id}`,
          type: "sos",
          title: `SOS: ${sos.severity || "Emergency"} Request`,
          message: `${sos.name || "Unknown"} — ${sos.location || "Unknown location"} (${sos.people_count || 1} people)`,
          time: "Pending SOS",
          priority: "critical",
          path: "/sos",
        })
      })


      /* ========================================================
         DISASTER ALERTS
         ======================================================== */

      disasters.forEach((disaster) => {
        const severity = String(
          disaster.severity || ""
        ).toLowerCase()

        if (
          severity === "critical" ||
          severity === "high"
        ) {
          alerts.push({
            id: `disaster-${disaster.id}`,
            type: "disaster",
            title: t("notifDisasterAlert", {
              severity: translateStatus(t, disaster.severity),
            }),
            message: t("notifDisasterMessage", {
              type: disaster.disaster_type || t("disasterType"),
              location: disaster.location || t("unknown"),
            }),
            time: t("notifActiveIncident"),
            priority:
              severity === "critical"
                ? "critical"
                : "warning",
            path: "/incidents",
          })
        }
      })


      /* ========================================================
         RESOURCE ALERTS
         ======================================================== */

      resources.forEach((resource) => {
        const quantity = Number(
          resource.quantity
        )

        if (
          !Number.isNaN(quantity) &&
          quantity <= 100
        ) {
          alerts.push({
            id: `resource-${resource.id}`,
            type: "resource",
            title: t("notifLowStock"),
            message: t("notifLowStockMessage", {
              type: resource.resource_type || t("resources"),
              quantity: resource.quantity,
              location: resource.location || t("unknown"),
            }),
            time: t("notifInventoryAlert"),
            priority: "warning",
            path: "/resources",
          })
        }
      })


      /* ========================================================
         VEHICLE ALERTS
         ======================================================== */

      vehicles.forEach((vehicle) => {
        const status = String(
          vehicle.status || ""
        ).toLowerCase()

        if (
          status === "unavailable" ||
          status === "maintenance" ||
          status === "inactive"
        ) {
          alerts.push({
            id: `vehicle-${vehicle.id}`,
            type: "vehicle",
            title: t("notifVehicleUnavailable"),
            message: t("notifVehicleMessage", {
              vehicle: vehicle.vehicle_number || t("vehicles"),
              status: translateStatus(t, vehicle.status),
            }),
            time: t("notifVehicleAlert"),
            priority: "warning",
            path: "/vehicles",
          })
        }
      })


      /* ========================================================
         MISSION ALERTS

         Current backend Mission fields:
         title
         disaster_id
         field_team_id
         location
         status
         description
         ======================================================== */

      missions.forEach((mission) => {
        const status = String(
          mission.status || ""
        ).toLowerCase()

        if (status === "pending") {
          alerts.push({
            id: `mission-${mission.id}`,
            type: "mission",
            title: t("notifMissionPending"),
            message: t("notifMissionPendingMessage", {
              title: mission.title || t("missions"),
              location: mission.location || t("unknown"),
            }),
            time: t("notifMissionAlert"),
            priority: "warning",
            path: "/missions",
          })
        }

        if (
          status === "in progress" ||
          status === "in_progress" ||
          status === "active"
        ) {
          alerts.push({
            id: `mission-active-${mission.id}`,
            type: "mission",
            title: t("notifMissionInProgress"),
            message: t("notifMissionInProgressMessage", {
              title: mission.title || t("missions"),
              location: mission.location || t("unknown"),
            }),
            time: t("notifMissionUpdate"),
            priority: "warning",
            path: "/missions",
          })
        }
      })


      /* ========================================================
         SORT ALERTS
         Critical alerts first
         ======================================================== */

      alerts.sort((a, b) => {
        if (
          a.priority === "critical" &&
          b.priority !== "critical"
        ) {
          return -1
        }

        if (
          a.priority !== "critical" &&
          b.priority === "critical"
        ) {
          return 1
        }

        return 0
      })

      setNotifications(alerts)

    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      )

      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }


  useEffect(() => {
    loadNotifications()

    const interval = setInterval(
      loadNotifications,
      30000
    )

    return () => {
      clearInterval(interval)
    }
  }, [])


  /* ============================================================
     NOTIFICATION ICON
     ============================================================ */

  const getNotificationIcon = (type) => {
    if (type === "sos") {
      return <Siren size={17} />
    }

    if (type === "disaster") {
      return <AlertTriangle size={17} />
    }

    if (type === "resource") {
      return <Package size={17} />
    }

    if (type === "vehicle") {
      return <Truck size={17} />
    }

    return <ClipboardList size={17} />
  }


  /* ============================================================
     NOTIFICATION STYLE
     ============================================================ */

  const getNotificationStyle = (
    priority
  ) => {
    if (priority === "critical") {
      return {
        container:
          "bg-red-50 border-red-100",
        icon:
          "bg-red-100 text-red-600",
        title:
          "text-red-800",
      }
    }

    return {
      container:
        "bg-amber-50 border-amber-100",
      icon:
        "bg-amber-100 text-amber-600",
      title:
        "text-amber-800",
    }
  }


  /* ============================================================
     UI
     ============================================================ */

  return (
    <>
      {updateAvailable && (
        <div className="fixed left-1/2 top-3 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-800 shadow-xl">
          <span>{t("updateAvailable")}</span>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">
            {t("refresh")}
          </button>
        </div>
      )}
      <header className="fixed left-0 right-0 top-0 z-30 h-20 border-b border-slate-200 bg-white/95 backdrop-blur md:left-64">

      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ======================================================
            TITLE
            ====================================================== */}

        <div className="min-w-0">

          <h2 className="truncate text-base font-bold text-slate-900 sm:text-xl">
            {t("operations")}
          </h2>

          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block sm:text-sm">
            {t("systemOperational")}
          </p>

        </div>


        {/* ======================================================
            RIGHT CONTROLS
            ====================================================== */}

        <div className="ml-4 flex items-center gap-2 sm:gap-4">

          {/* ====================================================
              SEARCH
              ==================================================== */}

          <div className="relative hidden lg:block">

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">

              <Search
                size={17}
                className="shrink-0 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(
                    event.target.value
                  )

                  setShowSearchResults(true)
                }}
                onFocus={() => {
                  if (
                    searchQuery.trim()
                  ) {
                    setShowSearchResults(
                      true
                    )
                  }
                }}
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder={t("searchPlaceholder")}
                className="w-40 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />

            </div>


            {/* Search Results */}

            {showSearchResults &&
              searchQuery.trim() && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                  {filteredResults.length >
                  0 ? (
                    <div className="py-1">

                      <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t("pages")}
                      </p>

                      {filteredResults.map(
                        (item) => (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() =>
                              handleSearch(
                                item
                              )
                            }
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                          >

                            <Search
                              size={15}
                              className="text-slate-400"
                            />

                            <span className="font-medium">
                              {item.name}
                            </span>

                          </button>
                        )
                      )}

                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center">

                      <Search
                        size={20}
                        className="mx-auto mb-2 text-slate-300"
                      />

                      <p className="text-sm font-medium text-slate-600">
                        {t("noResultsFound")}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {t("tryAnotherKeyword")}
                      </p>

                    </div>
                  )}

                </div>
              )}

          </div>


          {/* ====================================================
              NOTIFICATIONS
              ==================================================== */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowNotifications(
                  (prev) => !prev
                )
              }
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Notifications"
            >

              <Bell size={20} />

              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {notifications.length > 9
                    ? "9+"
                    : notifications.length}
                </span>
              )}

            </button>


            {/* Notification Panel */}

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">

                {/* Header */}

                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("notifications")}
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {t("liveSystemAlerts")}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">

                    <button
                      type="button"
                      onClick={
                        loadNotifications
                      }
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Refresh notifications"
                    >
                      <RefreshCw
                        size={15}
                        className={
                          loadingNotifications
                            ? "animate-spin"
                            : ""
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowNotifications(
                          false
                        )
                      }
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>

                  </div>

                </div>


                {/* Notifications */}

                <div className="max-h-96 overflow-y-auto">

                  {loadingNotifications ? (
                    <div className="px-4 py-8 text-center">

                      <RefreshCw
                        size={22}
                        className="mx-auto animate-spin text-red-500"
                      />

                      <p className="mt-2 text-sm text-slate-500">
                        {t("loadingAlerts")}
                      </p>

                    </div>
                  ) : notifications.length ===
                    0 ? (
                    <div className="px-4 py-10 text-center">

                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                        <ShieldCheck
                          size={20}
                          className="text-green-600"
                        />
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        {t("noActiveAlerts")}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {t("everythingNormal")}
                      </p>

                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">

                      {notifications.map(
                        (notification) => {
                          const style =
                            getNotificationStyle(
                              notification.priority
                            )

                          return (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={() => {
                                setShowNotifications(
                                  false
                                )

                                navigate(
                                  notification.path
                                )
                              }}
                              className="flex w-full gap-3 p-4 text-left transition hover:bg-slate-50"
                            >

                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.icon}`}
                              >
                                {getNotificationIcon(
                                  notification.type
                                )}
                              </div>

                              <div className="min-w-0 flex-1">

                                <p
                                  className={`text-sm font-semibold ${style.title}`}
                                >
                                  {
                                    notification.title
                                  }
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {
                                    notification.message
                                  }
                                </p>

                                <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                                  {
                                    notification.time
                                  }
                                </p>

                              </div>

                            </button>
                          )
                        }
                      )}

                    </div>
                  )}

                </div>


                {/* Footer */}

                {notifications.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-2.5">

                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(
                          false
                        )

                        navigate(
                          "/analytics"
                        )
                      }}
                      className="w-full text-center text-xs font-semibold text-red-600 transition hover:text-red-700"
                    >
                      {t("viewSystemAnalytics")}
                    </button>

                  </div>
                )}

              </div>
            )}

          </div>


          {/* ====================================================
              LIVE SYSTEM
              ==================================================== */}

          <div className="hidden items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 sm:flex">

            <ShieldCheck
              size={16}
              className="text-green-600"
            />

            <span className="text-xs font-semibold text-green-700">
              {t("liveSystem")}
            </span>

          </div>


          {/* ====================================================
              USER MENU
              ==================================================== */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowMenu(
                  (prev) => !prev
                )
              }
              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-100 sm:gap-3 sm:p-2"
            >

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-sm">
                {initials || "U"}
              </div>

              <div className="hidden text-left lg:block">

                <p className="max-w-32 truncate text-sm font-semibold text-slate-800">
                  {userName}
                </p>

                <p className="max-w-32 truncate text-[11px] capitalize text-slate-500">
                  {userRole}
                </p>

              </div>

              <ChevronDown
                size={16}
                className={`hidden text-slate-400 transition-transform sm:block ${
                  showMenu
                    ? "rotate-180"
                    : ""
                }`}
              />

            </button>


            {/* User Dropdown */}

            {showMenu && (
              <div className="absolute right-0 top-14 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                <div className="border-b border-slate-100 px-4 py-3">

                  <p className="truncate text-sm font-semibold text-slate-900">
                    {userName}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {userRole}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    navigate("/settings")
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ShieldCheck
                    size={17}
                  />

                  <span>
                    {t("accountSettings")}
                  </span>
                </button>


                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >

                  <LogOut size={17} />

                  <span>
                    {t("logout")}
                  </span>

                </button>

              </div>
            )}

          </div>

        </div>

      </div>

      </header>
    </>
  )
}

export default Topbar