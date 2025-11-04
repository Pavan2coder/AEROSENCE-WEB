export default function Toast({ type = 'info', message }) {
  const color = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${color}`}>
      {message}
    </div>
  )
}
