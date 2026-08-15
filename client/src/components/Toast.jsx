import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, duration = 4000) => {
    setToast(message)
    setTimeout(() => setToast(null), duration)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${toast ? 'show' : ''}`}>
        <i className="fas fa-check-circle"></i>
        <span className="toast-text">{toast}</span>
      </div>
    </ToastContext.Provider>
  )
}
