import { useState, useEffect } from 'react'
import { settingsApi } from '../../services/api'

export default function SettingsPage() {
  const [apiSettings, setApiSettings] = useState([])
  const [system, setSystem] = useState(null)
  const [testing, setTesting] = useState({})
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [api, sys] = await Promise.all([
        settingsApi.getApiSettings(),
        settingsApi.getSystem()
      ])
      setApiSettings(api)
      setSystem(sys)
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  const updateSetting = async (settingId, field, value) => {
    try {
      await settingsApi.updateApiSetting(settingId, { [field]: value })
      setMessage({ type: 'success', text: '设置已保存' })
      setTimeout(() => setMessage(null), 2000)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败: ' + err.message })
    }
  }

  const testConnection = async (settingId) => {
    setTesting({ ...testing, [settingId]: true })
    try {
      const result = await settingsApi.testApiConnection(settingId)
      if (result.success) {
        setMessage({ type: 'success', text: `连接成功！延迟 ${result.latency_ms}ms` })
      } else {
        setMessage({ type: 'error', text: result.message })
      }
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: '测试失败: ' + err.message })
    }
    setTesting({ ...testing, [settingId]: false })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="quant-container">
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: message.type === 'success' ? 'var(--success-fg)' : 'var(--danger-fg)'
        }}>
          {message.text}
        </div>
      )}

      {/* 系统信息 */}
      {system && (
        <div className="quant-card" style={{ marginBottom: 24 }}>
          <div className="quant-card-header">
            <div className="quant-card-title">⚙️ 系统信息</div>
            <span className="quant-tag">v{system.version}</span>
          </div>
          <div className="quant-grid-4">
            <div className="quant-stat">
              <div className="quant-stat-value" style={{ fontSize: 16 }}>{system.mode === 'manual' ? '手动模式' : '自动模式'}</div>
              <div className="quant-stat-label">运行模式</div>
            </div>
            <div className="quant-stat">
              <div className="quant-stat-value" style={{ fontSize: 16 }}>{system.models.length}</div>
              <div className="quant-stat-label">支持模型</div>
            </div>
            <div className="quant-stat">
              <div className="quant-stat-value" style={{ fontSize: 16 }}>{system.regions.length}</div>
              <div className="quant-stat-label">支持区域</div>
            </div>
            <div className="quant-stat">
              <div className="quant-stat-value" style={{ fontSize: 16 }}>{system.platforms.length}</div>
              <div className="quant-stat-label">接入平台</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="trade-label" style={{ marginBottom: 8 }}>功能状态</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(system.features).map(([key, enabled]) => (
                <span key={key} className={`quant-tag ${enabled ? 'risk-low' : ''}`}>
                  {key.replace(/_/g, ' ')}: {enabled ? '✅' : '❌'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API 设置 */}
      <div className="quant-card">
        <div className="quant-card-header">
          <div>
            <div className="quant-card-title">🔌 API 接口设置</div>
            <div className="quant-card-subtitle">
              配置 KAI 平台 API 密钥，当前为预留接口，待平台开放API后即可启用自动化交易
            </div>
          </div>
        </div>

        {apiSettings.map(setting => (
          <div key={setting.id} className="api-setting-card">
            <div className="api-setting-header">
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {setting.platform === 'london' ? '🇬🇧 London (开港 ModelHub)' : '🇭🇰 Hong Kong (KAI 模型服務容量市場)'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{setting.base_url}</div>
              </div>
              <span className={`api-status-badge api-status-${setting.status}`}>
                {setting.status === 'active' ? '● 已连接' : setting.status === 'error' ? '● 错误' : '○ 未连接'}
              </span>
            </div>

            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">API Key</label>
                <input
                  type="password"
                  className="trade-input"
                  placeholder="输入API Key"
                  defaultValue={setting.api_key}
                  onBlur={e => e.target.value !== setting.api_key && updateSetting(setting.id, 'api_key', e.target.value)}
                />
              </div>
              <div className="trade-input-group">
                <label className="trade-label">API Secret</label>
                <input
                  type="password"
                  className="trade-input"
                  placeholder="输入API Secret"
                  defaultValue={setting.api_secret}
                  onBlur={e => e.target.value !== setting.api_secret && updateSetting(setting.id, 'api_secret', e.target.value)}
                />
              </div>
            </div>

            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">REST API Base URL</label>
                <input
                  type="text"
                  className="trade-input"
                  defaultValue={setting.base_url}
                  onBlur={e => e.target.value !== setting.base_url && updateSetting(setting.id, 'base_url', e.target.value)}
                />
              </div>
              <div className="trade-input-group">
                <label className="trade-label">WebSocket URL</label>
                <input
                  type="text"
                  className="trade-input"
                  defaultValue={setting.ws_url}
                  onBlur={e => e.target.value !== setting.ws_url && updateSetting(setting.id, 'ws_url', e.target.value)}
                />
              </div>
            </div>

            {setting.last_error && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, marginBottom: 12,
                background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: 13
              }}>
                错误: {setting.last_error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="quant-btn"
                onClick={() => testConnection(setting.id)}
                disabled={testing[setting.id]}
              >
                {testing[setting.id] ? '测试中...' : '测试连接'}
              </button>
              <button
                className="quant-btn quant-btn-secondary"
                onClick={() => updateSetting(setting.id, 'status', setting.status === 'active' ? 'inactive' : 'active')}
              >
                {setting.status === 'active' ? '禁用' : '启用'}
              </button>
            </div>

            {setting.last_tested_at && (
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
                上次测试: {new Date(setting.last_tested_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        ))}

        <div style={{
          padding: '16px', borderRadius: 8, background: 'var(--info-bg)',
          color: 'var(--info-fg)', fontSize: 13, marginTop: 16
        }}>
          ℹ️ <strong>说明：</strong>当前系统运行在手动模式。API接口已预留，待 KAI 平台（london.kai.com / hongkong.kai.com）正式开放API后，
          填入密钥即可启用自动化交易。香港端目前有API密钥入口，但暂为示范作用。
        </div>
      </div>
    </div>
  )
}
