import { useState, createContext, useContext, useCallback, useRef } from 'react'

/**
 * Toast 组件 (Kai UI 规范)
 * 
 * 规范要点：
 * 1. 左侧色条 + 图标 + 文字（无障碍三重传达）
 * 2. 支持 success / error / warning / info 四种类型
 * 3. 自动消失 + 手动关闭
 */
const ToastContext = createContext(null)

const config = {
  success: { icon: 'fa-check-circle', cls: 'toast-success' },
  error:   { icon: 'fa-exclamation-circle', cls: 'toast-error' },
  warning: { icon: 'fa-exclamation-triangle', cls: 'toast-warning' },
  info:    { icon: 'fa-info-circle', cls: 'toast-info' }
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const c = config[t.type] || config.success
          return (
            <div key={t.id} className={`toast show ${c.cls}`}>
              <i className={`fas ${c.icon}`}></i>
              <span className="toast-text">{t.message}</span>
              <button
                className="toast-close"
                onClick={() => dismiss(t.id)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
