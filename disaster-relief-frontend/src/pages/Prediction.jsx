import { useState, useEffect } from "react"
import { Brain, Play, AlertTriangle, CheckCircle2 } from "lucide-react"
import { getZones, predictZoneDemand, simulateScenario } from "../services/api"
import { useLanguage } from "../i18n.jsx"

function Prediction() {
  const { t } = useLanguage()

  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState("")
  const [zoneResult, setZoneResult] = useState(null)

  const [simForm, setSimForm] = useState({
    disaster_type: "Flood",
    population: 10000,
    vulnerable_population: 2000,
    severity_score: 5,
    latitude: 11.0,
    longitude: 77.0,
    severity: "Medium",
  })
  const [simResult, setSimResult] = useState(null)

  const [loading, setLoading] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const [error, setError] = useState("")
  const [simError, setSimError] = useState("")

  useEffect(() => {
    getZones()
      .then(setZones)
      .catch(() => {})
  }, [])

  const handleZonePredict = async () => {
    if (!selectedZoneId) return
    setError("")
    setZoneResult(null)
    setLoading(true)
    try {
      const data = await predictZoneDemand(Number(selectedZoneId))
      setZoneResult(data)
    } catch (err) {
      setError(err?.message || t("predictionFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = async () => {
    setSimError("")
    setSimResult(null)
    setSimLoading(true)
    try {
      const data = await simulateScenario({
        ...simForm,
        population: Number(simForm.population),
        vulnerable_population: Number(simForm.vulnerable_population),
        severity_score: Number(simForm.severity_score),
        latitude: Number(simForm.latitude),
        longitude: Number(simForm.longitude),
      })
      setSimResult(data)
    } catch (err) {
      setSimError(err?.message || t("predictionFailed"))
    } finally {
      setSimLoading(false)
    }
  }

  const DemandCard = ({ label, value }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-red-600">{value ?? "—"}</p>
    </div>
  )

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("predictionTitle")}</h1>
          <p className="text-sm text-slate-500">{t("predictionDescription")}</p>
        </div>
      </div>

      {/* Zone Prediction */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">{t("runZonePrediction")}</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          >
            <option value="">{t("selectZone")}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.location} (ID: {z.id})
              </option>
            ))}
          </select>

          <button
            onClick={handleZonePredict}
            disabled={loading || !selectedZoneId}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={16} />
            {loading ? t("predicting") : t("runPrediction")}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {zoneResult && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 size={16} />
              {t("predictionResults")} — {zoneResult.location}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DemandCard label={t("food")} value={zoneResult.predictions?.food_demand} />
              <DemandCard label={t("water")} value={zoneResult.predictions?.water_demand_litres} />
              <DemandCard label={t("medical")} value={zoneResult.predictions?.medical_kit_demand} />
              <DemandCard label={t("shelter")} value={zoneResult.predictions?.shelter_demand} />
            </div>
          </div>
        )}
      </div>

      {/* Scenario Simulation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">{t("scenarioSimulation")}</h2>
        <p className="mb-5 text-sm text-slate-500">{t("scenarioSimulationDesc")}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{t("disasterTypeForPrediction")}</label>
            <select
              value={simForm.disaster_type}
              onChange={(e) => setSimForm((f) => ({ ...f, disaster_type: e.target.value, severity: f.severity }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              {["Flood", "Earthquake", "Wildfire", "Cyclone", "Landslide"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {[
            { key: "population", label: t("populationLabel") },
            { key: "vulnerable_population", label: t("vulnerablePopulation") },
            { key: "severity_score", label: t("severityScoreInput") },
            { key: "latitude", label: t("latitude") },
            { key: "longitude", label: t("longitude") },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
              <input
                type="number"
                value={simForm[key]}
                onChange={(e) => setSimForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{t("severity")}</label>
            <select
              value={simForm.severity}
              onChange={(e) => setSimForm((f) => ({ ...f, severity: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              {["Low", "Medium", "High", "Critical"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={simLoading}
          className="mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={16} />
          {simLoading ? t("simulating") : t("runSimulation")}
        </button>

        {simError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {simError}
          </div>
        )}

        {simResult && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 size={16} />
              {t("predictionResults")}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DemandCard label={t("food")} value={simResult.predictions?.food_demand} />
              <DemandCard label={t("water")} value={simResult.predictions?.water_demand_litres} />
              <DemandCard label={t("medical")} value={simResult.predictions?.medical_kit_demand} />
              <DemandCard label={t("shelter")} value={simResult.predictions?.shelter_demand} />
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default Prediction
