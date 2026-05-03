import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 right-4 z-[100] flex flex-col-reverse gap-2 xl:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex animate-[toast-in_0.3s_ease-out] items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all ${
              t.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-950/80 text-emerald-300'
                : 'border-rose-500/20 bg-rose-950/80 text-rose-300'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
