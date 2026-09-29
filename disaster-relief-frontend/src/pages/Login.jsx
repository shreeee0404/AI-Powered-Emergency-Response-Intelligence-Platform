import { useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  Users,
  UserCog,
  UserRoundCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"

import {
  login,
  createUser,
  createFieldTeam,
  deleteUser,
} from "../services/api"

import {
  supportedLanguages,
  useLanguage,
  translateStatus,
} from "../i18n.jsx"

function Login() {
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()

  // ============================================================
  // LOGIN / REGISTER MODE
  // ============================================================

  const [isRegister, setIsRegister] = useState(false)
  const [registerStep, setRegisterStep] = useState(1)

  // ============================================================
  // LOGIN STATE
  // ============================================================

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // ============================================================
  // REGISTER ACCOUNT STATE
  // ============================================================

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [role, setRole] = useState("")

  const [showRegisterPassword, setShowRegisterPassword] =
    useState(false)

  // ============================================================
  // FIELD TEAM STATE
  // ============================================================

  const [teamName, setTeamName] = useState("")
  const [members, setMembers] = useState("")
  const [zone, setZone] = useState("")
  const [leader, setLeader] = useState("")
  const [status, setStatus] = useState("Active")

  // ============================================================
  // UI STATE
  // ============================================================

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // ============================================================
  // NORMALIZE ROLE
  // ============================================================

  const normalizeRole = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\_-]+/g, " ")
      .replace(/\s+/g, " ")
  }

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (event) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!username.trim()) {
      setError(t("pleaseEnterUsername"))
      return
    }

    if (!password) {
      setError(t("pleaseEnterPassword"))
      return
    }

    try {
      setLoading(true)

      const data = await login(
        username.trim(),
        password
      )

      if (!data?.access_token) {
        throw new Error(
          "Login response did not contain an access token."
        )
      }

      localStorage.setItem(
        "access_token",
        data.access_token
      )

      if (data.user) {
        localStorage.setItem(
          "current_user",
          JSON.stringify(data.user)
        )

        setLanguage(data.user.language || "en")
      }

      const userRole = normalizeRole(
        data.user?.role
      )

      // Field Team
      if (
        userRole === "field team" ||
        userRole === "fieldteam"
      ) {
        navigate("/missions", {
          replace: true,
        })

        return
      }

      // Admin / Emergency Coordinator
      navigate("/", {
        replace: true,
      })
    } catch (err) {
      console.error("Login error:", err)

      setError(
        err?.message ||
          t("loginFailed")
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // SWITCH LOGIN / REGISTER
  // ============================================================

  const switchMode = () => {
    setIsRegister((current) => !current)

    setRegisterStep(1)

    setError("")
    setSuccess("")

    setRole("")

    setName("")
    setEmail("")
    setRegisterPassword("")

    setTeamName("")
    setMembers("")
    setZone("")
    setLeader("")
    setStatus("Active")

    setUsername("")
    setPassword("")

    setShowPassword(false)
    setShowRegisterPassword(false)
  }

  // ============================================================
  // SELECT ROLE
  // ============================================================

  const handleRoleSelect = (selectedRole) => {
    setError("")
    setSuccess("")

    if (selectedRole === "Admin") {
      return
    }

    if (
      selectedRole === "Emergency Coordinator"
    ) {
      setError(
        t("coordinatorOnlyByAdmin")
      )
      return
    }

    if (selectedRole === "Field Team") {
      setRole("Field Team")
    }
  }

  // ============================================================
  // REGISTER STEP 1
  // ============================================================

  const handleAccountContinue = (event) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!name.trim()) {
      setError(t("pleaseEnterName"))
      return
    }

    if (!email.trim()) {
      setError(t("pleaseEnterEmail"))
      return
    }

    if (!registerPassword) {
      setError(
        t("pleaseCreatePassword")
      )
      return
    }

    if (registerPassword.length < 6) {
      setError(
        t("passwordMinError")
      )
      return
    }

    if (!role) {
      setError(
        t("pleaseSelectFieldTeam")
      )
      return
    }

    if (role !== "Field Team") {
      setError(
        t("onlyFieldTeamSelfRegister")
      )
      return
    }

    setTeamName(name.trim())

    setRegisterStep(2)
  }

  // ============================================================
  // REGISTER STEP 2
  // ============================================================

  const handleFinalRegistration = async (event) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!teamName.trim()) {
      setError(
        t("pleaseEnterTeamName")
      )
      return
    }

    if (
      members === "" ||
      Number(members) < 0 ||
      !Number.isFinite(Number(members))
    ) {
      setError(
        t("pleaseEnterValidMembers")
      )
      return
    }

    if (!zone.trim()) {
      setError(t("pleaseEnterZone"))
      return
    }

    if (!leader.trim()) {
      setError(
        t("pleaseEnterLeader")
      )
      return
    }

    if (!status.trim()) {
      setError(
        t("pleaseSelectStatus")
      )
      return
    }

    let createdUserId = null

    try {
      setLoading(true)

      // Create user
      const userResponse = await createUser({
        name: name.trim(),
        email: email.trim(),
        password: registerPassword,
        role: "Field Team",
      })

      createdUserId =
        userResponse?.id ||
        userResponse?.user?.id ||
        null

      // Create field team
      await createFieldTeam({
        name: teamName.trim(),
        members: Number(members),
        zone: zone.trim(),
        leader: leader.trim(),
        status: status.trim(),
      })

      // Success
      setSuccess(
        t("fieldTeamCreated")
      )

      setUsername(email.trim())
      setPassword("")

      setName("")
      setEmail("")
      setRegisterPassword("")
      setRole("")

      setTeamName("")
      setMembers("")
      setZone("")
      setLeader("")
      setStatus("Active")

      setRegisterStep(1)

      setTimeout(() => {
        setIsRegister(false)
        setSuccess("")
      }, 1500)
    } catch (err) {
      console.error(
        "Field Team registration error:",
        err
      )

      // Rollback user if team creation fails
      if (createdUserId) {
        try {
          await deleteUser(createdUserId)
        } catch (rollbackError) {
          console.error(
            "Failed to rollback user creation:",
            rollbackError
          )
        }
      }

      setError(
        err?.message ||
          t("registrationFailed")
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // BACK TO STEP 1
  // ============================================================

  const handleBackToAccount = () => {
    setError("")
    setSuccess("")
    setRegisterStep(1)
  }

  // ============================================================
  // INPUT CLASS
  // ============================================================

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-white">

      {/* ======================================================
          MAIN PAGE
      ====================================================== */}

      <div className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8">

        <div className="w-full max-w-md">

          {/* ==================================================
              LOGO
          ================================================== */}

          <div className="mb-8 flex items-center justify-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/20">

              <ShieldAlert
                size={26}
                className="text-white"
              />

            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                {t("appName")}
              </p>

              <p className="text-sm text-slate-500">
                {t("appSubtitle")}
              </p>
            </div>

          </div>

          {/* ==================================================
              CARD
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

            {/* ==================================================
                LANGUAGE
            ================================================== */}

            <div className="mb-6 flex justify-end">

              <label className="flex items-center gap-2 text-xs font-bold text-slate-500">

                <span>
                  {t("language")}
                </span>

                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  aria-label={t("language")}
                >

                  {supportedLanguages.map(
                    (item) => (
                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.name}
                      </option>
                    )
                  )}

                </select>

              </label>

            </div>

            {/* ==================================================
                HEADING
            ================================================== */}

            <div className="mb-7">

              <div className="flex items-center gap-2">

                {isRegister ? (
                  <User
                    size={22}
                    className="text-red-600"
                  />
                ) : (
                  <ShieldAlert
                    size={22}
                    className="text-red-600"
                  />
                )}

                <h2 className="text-2xl font-bold text-slate-900">

                  {isRegister
                    ? registerStep === 1
                      ? t(
                          "createFieldTeamAccount"
                        )
                      : t(
                          "fieldTeamDetails"
                        )
                    : "Welcome back"}

                </h2>

              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">

                {isRegister
                  ? registerStep === 1
                    ? t(
                        "createFieldTeamSubtitle"
                      )
                    : t(
                        "fieldTeamDetailsSubtitle"
                      )
                  : "Sign in to access the disaster response system."}

              </p>

            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-sm font-medium text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* ==================================================
                SUCCESS
            ================================================== */}

            {success && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-sm font-medium text-green-700">
                  {success}
                </p>

              </div>
            )}

            {/* ==================================================
                LOGIN
            ================================================== */}

            {!isRegister && (
              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                {/* Username */}

                <div>

                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Username / Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(event) =>
                        setUsername(
                          event.target.value
                        )
                      }
                      placeholder={t(
                        "usernamePlaceholder"
                      )}
                      autoComplete="username"
                      className={`${inputClass} pl-11 pr-4`}
                    />

                  </div>

                </div>

                {/* Password */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder={t(
                        "passwordPlaceholder"
                      )}
                      autoComplete="current-password"
                      className={`${inputClass} pl-11 pr-12`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Sign In */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? t("signingIn")
                    : "Sign In"}
                </button>

              </form>
            )}

            {/* ==================================================
                REGISTER STEP 1
            ================================================== */}

            {isRegister &&
              registerStep === 1 && (
                <form
                  onSubmit={
                    handleAccountContinue
                  }
                  className="space-y-5"
                >

                  {/* Name */}

                  <div>

                    <label
                      htmlFor="register-name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("fullNameLabel")}
                    </label>

                    <div className="relative">

                      <User
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="register-name"
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(
                            event.target.value
                          )
                        }
                        placeholder={t(
                          "namePlaceholder"
                        )}
                        autoComplete="name"
                        className={`${inputClass} pl-11 pr-4`}
                      />

                    </div>

                  </div>

                  {/* Email */}

                  <div>

                    <label
                      htmlFor="register-email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("email")}
                    </label>

                    <div className="relative">

                      <Mail
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value
                          )
                        }
                        placeholder={t(
                          "emailPlaceholder"
                        )}
                        autoComplete="email"
                        className={`${inputClass} pl-11 pr-4`}
                      />

                    </div>

                  </div>

                  {/* Password */}

                  <div>

                    <label
                      htmlFor="register-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("password")}
                    </label>

                    <div className="relative">

                      <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="register-password"
                        type={
                          showRegisterPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          registerPassword
                        }
                        onChange={(event) =>
                          setRegisterPassword(
                            event.target.value
                          )
                        }
                        placeholder={t(
                          "createPasswordPlaceholder"
                        )}
                        autoComplete="new-password"
                        className={`${inputClass} pl-11 pr-12`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword(
                            (current) =>
                              !current
                          )
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showRegisterPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>

                    </div>

                    <p className="mt-1.5 text-xs text-slate-400">
                      {t("minSixChars")}
                    </p>

                  </div>

                  {/* Role */}

                  <div>

                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                      {t("roleLabel")}
                    </label>

                    <div className="space-y-3">

                      {/* Admin */}

                      <button
                        type="button"
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4 text-left opacity-60"
                      >

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200">

                          <UserCog
                            size={19}
                            className="text-slate-500"
                          />

                        </div>

                        <div>

                          <p className="text-sm font-bold text-slate-700">
                            {t("adminRole")}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {t(
                              "selfRegistrationUnavailable"
                            )}
                          </p>

                        </div>

                      </button>

                      {/* Emergency Coordinator */}

                      <button
                        type="button"
                        onClick={() =>
                          handleRoleSelect(
                            "Emergency Coordinator"
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">

                          <UserRoundCheck
                            size={19}
                            className="text-blue-600"
                          />

                        </div>

                        <div>

                          <p className="text-sm font-bold text-slate-700">
                            {t(
                              "emergencyCoordinatorRole"
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {t(
                              "createdOnlyByAdmin"
                            )}
                          </p>

                        </div>

                      </button>

                      {/* Field Team */}

                      <button
                        type="button"
                        onClick={() =>
                          handleRoleSelect(
                            "Field Team"
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                          role === "Field Team"
                            ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                            : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50"
                        }`}
                      >

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            role === "Field Team"
                              ? "bg-red-600 text-white"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          <Users size={19} />
                        </div>

                        <div>

                          <p className="text-sm font-bold text-slate-700">
                            {t("fieldTeamRole")}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {t(
                              "availableForSelfRegistration"
                            )}
                          </p>

                        </div>

                      </button>

                    </div>

                  </div>

                  {/* Continue */}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      role !== "Field Team"
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("continue")}
                    <ArrowRight size={17} />
                  </button>

                </form>
              )}

            {/* ==================================================
                REGISTER STEP 2
            ================================================== */}

            {isRegister &&
              registerStep === 2 && (
                <form
                  onSubmit={
                    handleFinalRegistration
                  }
                  className="space-y-5"
                >

                  {/* Team Name */}

                  <div>

                    <label
                      htmlFor="team-name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("teamName")}
                    </label>

                    <div className="relative">

                      <Users
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="team-name"
                        type="text"
                        value={teamName}
                        onChange={(event) =>
                          setTeamName(
                            event.target.value
                          )
                        }
                        placeholder={t(
                          "teamNamePlaceholder"
                        )}
                        className={`${inputClass} pl-11 pr-4`}
                      />

                    </div>

                  </div>

                  {/* Members */}

                  <div>

                    <label
                      htmlFor="members"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("numberOfMembers")}
                    </label>

                    <input
                      id="members"
                      type="number"
                      min="0"
                      value={members}
                      onChange={(event) =>
                        setMembers(
                          event.target.value
                        )
                      }
                      placeholder={t(
                        "membersPlaceholder"
                      )}
                      className={`${inputClass} px-4`}
                    />

                  </div>

                  {/* Zone */}

                  <div>

                    <label
                      htmlFor="zone"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("zone")}
                    </label>

                    <input
                      id="zone"
                      type="text"
                      value={zone}
                      onChange={(event) =>
                        setZone(
                          event.target.value
                        )
                      }
                      placeholder={t(
                        "zoneExample"
                      )}
                      className={`${inputClass} px-4`}
                    />

                  </div>

                  {/* Leader */}

                  <div>

                    <label
                      htmlFor="leader"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("teamLeader")}
                    </label>

                    <input
                      id="leader"
                      type="text"
                      value={leader}
                      onChange={(event) =>
                        setLeader(
                          event.target.value
                        )
                      }
                      placeholder={t(
                        "teamLeaderPlaceholder"
                      )}
                      className={`${inputClass} px-4`}
                    />

                  </div>

                  {/* Status */}

                  <div>

                    <label
                      htmlFor="status"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {t("statusLabel")}
                    </label>

                    <select
                      id="status"
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target.value
                        )
                      }
                      className={`${inputClass} px-4`}
                    >

                      <option value="Active">
                        {translateStatus(
                          t,
                          "Active"
                        )}
                      </option>

                      <option value="Available">
                        {translateStatus(
                          t,
                          "Available"
                        )}
                      </option>

                      <option value="Busy">
                        {t("statusBusy")}
                      </option>

                      <option value="On Mission">
                        {translateStatus(
                          t,
                          "On Mission"
                        )}
                      </option>

                      <option value="Inactive">
                        {translateStatus(
                          t,
                          "Inactive"
                        )}
                      </option>

                    </select>

                  </div>

                  {/* Buttons */}

                  <div className="flex gap-3">

                    <button
                      type="button"
                      onClick={
                        handleBackToAccount
                      }
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >

                      <ArrowLeft size={17} />

                      {t("back")}

                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {loading
                        ? t("creating")
                        : t("createAccount")}

                      {!loading && (
                        <CheckCircle2
                          size={17}
                        />
                      )}

                    </button>

                  </div>

                </form>
              )}

            {/* ==================================================
                LOGIN / REGISTER SWITCH
            ================================================== */}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">

              <p className="text-sm text-slate-500">

                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}

                <button
                  type="button"
                  onClick={switchMode}
                  className="ml-1 font-semibold text-red-600 transition hover:text-red-700"
                >
                  {isRegister
                    ? "Sign In"
                    : "Register"}
                </button>

              </p>

            </div>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="mt-4 text-center">

              <p className="text-xs text-slate-400">
                Authorized personnel only
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Login