import { useEffect, useState } from "react"
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Brain,
  Truck,
  Map,
} from "lucide-react"

import {
  getUsers,
  updateUser,
  updateMyLanguage,
} from "../services/api"
import { supportedLanguages, useLanguage } from "../i18n.jsx"

function Settings() {
  const { language, setLanguage, t } = useLanguage()
  const [userId, setUserId] = useState(null)

  const [profile, setProfile] = useState({
    name: "",
    role: "",
    email: "",
    contact: "",
  })

  const [notifications, setNotifications] = useState({
    critical: true,
    shortage: true,
    missions: true,
    vehicles: false,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleLanguageChange = async (nextLanguage) => {
    setLanguage(nextLanguage)

    if (!userId) return

    try {
      await updateMyLanguage(nextLanguage)
    } catch (err) {
      setError(err?.message || t("languageSaveError"))
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError("")

    try {
      const storedUser = JSON.parse(
        localStorage.getItem("current_user") || "null"
      )

      const storedNotifications = JSON.parse(
        localStorage.getItem("notification_preferences") || "null"
      )

      if (storedNotifications) {
        setNotifications(storedNotifications)
      }

      if (storedUser?.id) {
        setUserId(storedUser.id)

        setProfile({
          name: storedUser.name || "",
          role: storedUser.role || "",
          email: storedUser.email || "",
          contact: storedUser.contact || "",
        })

        setLoading(false)
        return
      }

      const users = await getUsers()

      const userList = Array.isArray(users)
        ? users
        : users?.users || []

      if (userList.length > 0) {
        const firstUser = userList[0]

        setUserId(firstUser.id)

        setProfile({
          name: firstUser.name || "",
          role: firstUser.role || "",
          email: firstUser.email || "",
          contact: firstUser.contact || "",
        })

        localStorage.setItem(
          "current_user",
          JSON.stringify(firstUser)
        )
      }
    } catch (err) {
      console.error("Settings load error:", err)
      setError(err.message || t("unableLoadSettings"))
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNotificationChange = (field) => {
    setNotifications((prev) => {
      const updated = {
        ...prev,
        [field]: !prev[field],
      }

      localStorage.setItem(
        "notification_preferences",
        JSON.stringify(updated)
      )

      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSuccess("")
    setError("")

    try {
      if (!userId) {
        throw new Error(t("userNotIdentified"))
      }

      const updatedUser = await updateUser(userId, {
        name: profile.name.trim(),
        email: profile.email.trim(),
        role: profile.role.trim(),
        language,
      })

      const storedUser = {
        ...(updatedUser?.user || updatedUser),
        id: userId,
        name: profile.name.trim(),
        email: profile.email.trim(),
        role: profile.role.trim(),
        language,
      }

      localStorage.setItem(
        "current_user",
        JSON.stringify(storedUser)
      )

      localStorage.setItem(
        "notification_preferences",
        JSON.stringify(notifications)
      )

      setSaved(true)
      setSuccess(t("settingsSavedMessage"))

      setTimeout(() => {
        setSaved(false)
        setSuccess("")
      }, 2500)
    } catch (err) {
      console.error("Settings save error:", err)
      setError(err.message || t("unableSaveSettings"))
    } finally {
      setSaving(false)
    }
  }

  const statusItems = [
    {
      title: t("dashboardService"),
      status: t("operational"),
      type: "success",
      icon: Server,
    },
    {
      title: t("aiPredictionService"),
      status: t("ready"),
      type: "success",
      icon: Brain,
    },
    {
      title: t("logisticsEngine"),
      status: t("ready"),
      type: "success",
      icon: Truck,
    },
    {
      title: t("mapService"),
      status: t("demoMode"),
      type: "warning",
      icon: Map,
    },
  ]

  const notificationItems = [
    {
      key: "critical",
      title: t("criticalDisasterAlerts"),
      description: t("criticalDisasterDesc"),
    },
    {
      key: "shortage",
      title: t("resourceShortageAlerts"),
      description: t("resourceShortageDesc"),
    },
    {
      key: "missions",
      title: t("missionUpdates"),
      description: t("missionUpdatesDesc"),
    },
    {
      key: "vehicles",
      title: t("vehicleDeploymentAlerts"),
      description: t("vehicleDeploymentDesc"),
    },
  ]

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-200 p-2">
            <SettingsIcon
              size={22}
              className="text-slate-700"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("settingsTitle")}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {t("settingsDescription")}
            </p>
          </div>
        </div>

        <button
          onClick={loadSettings}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          {t("refresh")}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-3 text-sm text-slate-500">
            {t("loadingSettings")}
          </p>
        </div>
      ) : (
        <>
          {/* Profile + System Status */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Profile */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="rounded-lg bg-blue-100 p-2">
                  <User
                    size={20}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    {t("profileInformation")}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {t("updateOfficerInfo")}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("fullName")}
                  </label>

                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      handleProfileChange(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder={t("fullNamePlaceholder")}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("role")}
                  </label>

                  <input
                    type="text"
                    value={profile.role}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    {t("roleManagedBySystem")}
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("email")}
                  </label>

                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      handleProfileChange(
                        "email",
                        e.target.value
                      )
                    }
                    placeholder={t("enterEmailPlaceholder")}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("contactNumber")}
                  </label>

                  <input
                    type="text"
                    value={profile.contact}
                    onChange={(e) =>
                      handleProfileChange(
                        "contact",
                        e.target.value
                      )
                    }
                    placeholder={t("contactPlaceholder")}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    {t("storedLocally")}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                    {t("saving")}
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={17} />
                    {t("savedSuccessfully")}
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {t("saveChanges")}
                  </>
                )}
              </button>
            </div>

            {/* System Status */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Shield
                    size={20}
                    className="text-green-600"
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    {t("systemStatus")}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {t("currentPlatformStatus")}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {statusItems.map((item) => {
                  const Icon = item.icon

                  const isWarning =
                    item.type === "warning"

                  return (
                    <div
                      key={item.title}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            size={16}
                            className={
                              isWarning
                                ? "text-yellow-600"
                                : "text-green-600"
                            }
                          />

                          <span className="text-sm text-slate-600">
                            {item.title}
                          </span>
                        </div>

                        <span
                          className={`flex items-center gap-2 text-xs font-semibold ${
                            isWarning
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isWarning
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          />

                          {item.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="mt-6 rounded-xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">
                  {t("language")}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {t("chooseLanguage")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t("languageSavedEveryRole")}
                </p>
              </div>

              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value)}
                className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                aria-label={t("language")}
              >
                {supportedLanguages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
              <div className="rounded-lg bg-orange-100 p-2">
                <Bell
                  size={20}
                  className="text-orange-600"
                />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  {t("notificationPreferences")}
                </h2>

                <p className="text-sm text-slate-500">
                  {t("configureAlerts")}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {notificationItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-4 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={() =>
                        handleNotificationChange(item.key)
                      }
                      className="peer sr-only"
                    />

                    <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-200" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Info */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex gap-3">
              <Shield
                size={20}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <h3 className="text-sm font-bold text-blue-900">
                  {t("systemConfiguration")}
                </h3>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  {t("settingsConfigNote")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Settings