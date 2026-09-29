import { translateStatus, useLanguage } from "../i18n.jsx"

function StatusBadge({ status }) {
  const { t } = useLanguage()
  const styles = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Moderate: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",

    Active: "bg-blue-100 text-blue-700",
    Available: "bg-green-100 text-green-700",
    Deployed: "bg-purple-100 text-purple-700",
    Maintenance: "bg-slate-200 text-slate-700",

    Pending: "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
  }

  const normalizedStatus = String(status || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase()
  const styleKey = normalizedStatus
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[styleKey] || "bg-slate-100 text-slate-600"
      }`}
    >
      {translateStatus(t, status)}
    </span>
  )
}

export default StatusBadge