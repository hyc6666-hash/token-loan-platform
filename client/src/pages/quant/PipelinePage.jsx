import { useState, useEffect, useCallback } from 'react'
import { pipelineApi } from '../../services/api'

const STAGES = [
  { id: 'design', label: '策略设计', icon: 'fa-lightbulb', desc: '将投资想法转化为量化模型' },
  { id: 'backtest', label: '验证优化', icon: 'fa-flask', desc: '历史数据回测，计算关键绩效指标' },
  { id: 'paper', label: '模拟测试', icon: 'fa-file-pen', desc: '纸面交易，引入延迟与滑点' },
  { id: 'live', label: '实盘部署', icon: 'fa-rocket', desc: '渐进式上线，三级监控' }
]

const STRATEGY_TYPES = [
  { id: 'trend_following', name: '趋势跟踪', desc: '跟随市场趋势方向交易' },
  { id: 'mean_reversion', name: '均值回归', desc: '利用价格偏离均值后的回归特性' },
  { id: 'market_making', name: '做市策略', desc: '同时挂买卖单赚取价差' },
  { id: 'cross_model_arb', name: '跨模型套利', desc: '利用不同AI模型间价格差异' },
  { id: 'time_region_arb', name: '时间区域套利', desc: '利用不同区域市场时区差异' },
  { id: 'forward_spot_arb', name: '期现套利', desc: '远期合约与现货价差套利' },
  { id: 'multi_strategy', name: '多策略组合', desc: '组合多种策略，分散风险' }
]

export default function PipelinePage() {
  const [dashboard, setDashboard] = useState(null)
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAIConfig, setShowAIConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const data = await pipelineApi.getDashboard()
      setDashboard(data)
    } catch (err) {
      console.error('Load dashboard error:', err)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleCreate = async (formData) => {
    setLoading(true)
    try {
      const pipeline = await pipelineApi.createPipeline(formData)
      showMessage('success', 'Pipeline 创建成功')
      setShowCreate(false)
      setSelectedPipeline(pipeline)
      loadData()
    } catch (err) {
      showMessage('error', '创建失败: ' + err.message)
    }
    setLoading(false)
  }

  const handleSelectPipeline = async (pipelineId) => {
    try {
      const pipeline = await pipelineApi.getPipeline(pipelineId)
      setSelectedPipeline(pipeline)
    } catch (err) {
      showMessage('error', '加载失败: ' + err.message)
    }
  }

  return (
    <div className="quant-container">
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 0, marginBottom: 16, fontSize: 14,
          background: message.type === 'success' ? 'rgba(34,211,238,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? 'var(--primary)' : 'var(--danger-fg)',
          border: `1px solid ${message.type === 'success' ? 'var(--primary)' : 'var(--danger-fg)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>AI 量化交易 Pipeline</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            四阶段量化交易流程 · 全程 AI 接管 · 支持多模型接入
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="quant-btn quant-btn-secondary" onClick={() => setShowAIConfig(true)}>
            <i className="fa-solid fa-plug" style={{ marginRight: 6 }} />
            AI 模型配置
          </button>
          <button className="quant-btn" onClick={() => setShowCreate(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
            新建策略
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {dashboard && (
        <div className="quant-grid-4" style={{ marginBottom: 24 }}>
          <StatCard label="Pipeline 总数" value={dashboard.stats?.total || 0} icon="fa-layer-group" />
          <StatCard label="进行中" value={(dashboard.stats?.design || 0) + (dashboard.stats?.backtest || 0) + (dashboard.stats?.paper || 0) + (dashboard.stats?.live || 0)} icon="fa-spinner" />
          <StatCard label="已完成" value={dashboard.stats?.completed || 0} icon="fa-check-circle" />
          <StatCard label="默认 AI 模型" value={dashboard.default_model?.name || '未配置'} icon="fa-brain" sub={dashboard.default_model?.model_id || ''} />
        </div>
      )}

      {/* Pipeline 列表 */}
      <div className="quant-card" style={{ marginBottom: 24 }}>
        <div className="quant-card-header">
          <div className="quant-card-title">策略 Pipeline 列表</div>
        </div>
        {dashboard?.pipelines?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>策略名称</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>类型</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>当前阶段</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>状态</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>资金</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)' }}>创建时间</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-tertiary)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.pipelines.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.strategy_name}</td>
                    <td style={{ padding: '10px 12px' }}>{STRATEGY_TYPES.find(s => s.id === p.strategy_type)?.name || p.strategy_type}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <StageBadge stage={p.current_stage} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={p.stage_status} />
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{(p.capital_allocation || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontSize: 12 }}>{p.created_at}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button className="quant-btn quant-btn-sm" onClick={() => handleSelectPipeline(p.id)}>
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
            暂无 Pipeline，点击「新建策略」开始
          </div>
        )}
      </div>

      {/* Pipeline 详情 */}
      {selectedPipeline && (
        <PipelineDetail pipeline={selectedPipeline} onUpdate={loadData} onMessage={showMessage} />
      )}

      {/* 创建 Pipeline 弹窗 */}
      {showCreate && (
        <CreatePipelineModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          loading={loading}
        />
      )}

      {/* AI 模型配置弹窗 */}
      {showAIConfig && (
        <AIModelConfigModal onClose={() => { setShowAIConfig(false); loadData() }} onMessage={showMessage} />
      )}
    </div>
  )
}

// ============ 统计卡片 ============
function StatCard({ label, value, icon, sub }) {
  return (
    <div className="quant-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
        </div>
        <i className={`fa-solid ${icon}`} style={{ color: 'var(--primary)', fontSize: 20 }} />
      </div>
    </div>
  )
}

// ============ 阶段徽章 ============
function StageBadge({ stage }) {
  const config = STAGES.find(s => s.id === stage) || { label: stage, icon: 'fa-circle' }
  const colors = {
    design: 'var(--primary)',
    backtest: '#a78bfa',
    paper: '#fbbf24',
    live: '#34d399',
    completed: '#10b981',
    failed: '#ef4444'
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 0, fontSize: 11,
      background: `${colors[stage] || 'var(--gray-500)'}20`,
      color: colors[stage] || 'var(--gray-500)',
      border: `1px solid ${colors[stage] || 'var(--gray-500)'}40`
    }}>
      <i className={`fa-solid ${config.icon}`} />
      {config.label}
    </span>
  )
}

// ============ 状态徽章 ============
function StatusBadge({ status }) {
  const config = {
    pending: { color: 'var(--gray-400)', label: '待处理' },
    in_progress: { color: 'var(--primary)', label: '进行中' },
    passed: { color: '#34d399', label: '通过' },
    failed: { color: '#ef4444', label: '失败' },
    skipped: { color: 'var(--gray-400)', label: '跳过' }
  }[status] || { color: 'var(--gray-400)', label: status }

  return (
    <span style={{
      padding: '2px 8px', borderRadius: 0, fontSize: 11,
      color: config.color, border: `1px solid ${config.color}40`
    }}>
      {config.label}
    </span>
  )
}

// ============ Pipeline 详情（四阶段流程） ============
function PipelineDetail({ pipeline, onUpdate, onMessage }) {
  const [activeStage, setActiveStage] = useState(pipeline.current_stage)
  const [stageLoading, setStageLoading] = useState(false)

  const stages = ['design', 'backtest', 'paper', 'live']
  const currentIdx = stages.indexOf(pipeline.current_stage)

  const runStage = async (stageNum, data = {}) => {
    setStageLoading(true)
    try {
      let result
      if (stageNum === 1) result = await pipelineApi.stage1Design(pipeline.id, data)
      else if (stageNum === 2) result = await pipelineApi.stage2Backtest(pipeline.id, data)
      else if (stageNum === 3) result = await pipelineApi.stage3Paper(pipeline.id, data)
      else if (stageNum === 4) result = await pipelineApi.stage4Live(pipeline.id, data)

      if (result.passed === false) {
        onMessage('error', `阶段${stageNum} 未通过，请查看分析结果`)
      } else {
        onMessage('success', `阶段${stageNum} 执行完成`)
      }
      onUpdate()
      // 重新加载 pipeline
      const updated = await pipelineApi.getPipeline(pipeline.id)
      // 使用闭包外的方式更新
    } catch (err) {
      onMessage('error', `执行失败: ${err.message}`)
    }
    setStageLoading(false)
  }

  return (
    <div className="quant-card" style={{ marginBottom: 24 }}>
      <div className="quant-card-header">
        <div>
          <div className="quant-card-title">{pipeline.strategy_name}</div>
          <div className="quant-card-subtitle">
            {STRATEGY_TYPES.find(s => s.id === pipeline.strategy_type)?.name} · 
            模型: {pipeline.config?.model_code} · 
            区域: {pipeline.config?.region} · 
            初始资金: {(pipeline.config?.initial_capital || 0).toLocaleString()}
          </div>
        </div>
        <StageBadge stage={pipeline.current_stage} />
      </div>

      {/* 四阶段进度条 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {STAGES.map((stage, idx) => {
          const isActive = stage.id === activeStage
          const isCompleted = idx < currentIdx || (idx === currentIdx && pipeline.stage_status === 'passed')
          const isCurrent = idx === currentIdx
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              style={{
                flex: 1, padding: '12px 16px', background: 'transparent',
                border: 'none', borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? 'var(--primary)' : isCompleted ? '#34d399' : 'var(--text-tertiary)',
                cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: isCompleted ? '#34d39920' : isCurrent ? 'var(--primary)20' : 'var(--surface-2)',
                color: isCompleted ? '#34d399' : isCurrent ? 'var(--primary)' : 'var(--text-tertiary)',
                border: `1px solid ${isCompleted ? '#34d399' : isCurrent ? 'var(--primary)' : 'var(--border)'}`
              }}>
                {isCompleted ? <i className="fa-solid fa-check" /> : idx + 1}
              </div>
              {stage.label}
            </button>
          )
        })}
      </div>

      {/* 阶段内容 */}
      <div style={{ minHeight: 300 }}>
        {activeStage === 'design' && <Stage1Design pipeline={pipeline} onRun={(d) => runStage(1, d)} loading={stageLoading} />}
        {activeStage === 'backtest' && <Stage2Backtest pipeline={pipeline} onRun={(d) => runStage(2, d)} loading={stageLoading} />}
        {activeStage === 'paper' && <Stage3Paper pipeline={pipeline} onRun={(d) => runStage(3, d)} loading={stageLoading} />}
        {activeStage === 'live' && <Stage4Live pipeline={pipeline} onRun={(d) => runStage(4, d)} loading={stageLoading} />}
      </div>
    </div>
  )
}

// ============ 阶段1: 策略设计 ============
function Stage1Design({ pipeline, onRun, loading }) {
  const [userIdea, setUserIdea] = useState(pipeline.hypothesis || '')

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label className="trade-label">投资假设 / 策略想法</label>
        <textarea
          className="trade-input"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="例如：低市盈率（低基价）的AI模型在未来表现更好，因为市场会修正低估..."
          value={userIdea}
          onChange={e => setUserIdea(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="quant-btn" onClick={() => onRun({ user_idea: userIdea })} disabled={loading}>
          {loading ? <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} /> : <i className="fa-solid fa-brain" style={{ marginRight: 6 }} />}
          AI 设计策略
        </button>
      </div>

      {pipeline.design_data?.ai_result && (
        <AIResultDisplay result={pipeline.design_data.ai_result} title="AI 策略设计结果" />
      )}

      {pipeline.design_data?.market_context && (
        <div style={{ marginTop: 16 }}>
          <div className="trade-label" style={{ marginBottom: 8 }}>市场上下文</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <MetricBox label="最新价格" value={pipeline.design_data.market_context.latest_price?.toFixed(2) || 'N/A'} />
            <MetricBox label="价差" value={pipeline.design_data.market_context.spread?.toFixed(2) || 'N/A'} />
            <MetricBox label="数据源" value={pipeline.design_data.market_context.source || 'N/A'} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============ 阶段2: 回测 ============
function Stage2Backtest({ pipeline, onRun, loading }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [latency, setLatency] = useState(100)

  useEffect(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    setStartDate(d.toISOString().split('T')[0])
  }, [])

  const backtest = pipeline.backtest_data?.backtest_result
  const aiAnalysis = pipeline.backtest_data?.ai_analysis

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="trade-label">开始日期</label>
          <input type="date" className="trade-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="trade-label">结束日期</label>
          <input type="date" className="trade-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <button className="quant-btn" onClick={() => onRun({ start_date: startDate, end_date: endDate })} disabled={loading}>
        {loading ? <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} /> : <i className="fa-solid fa-play" style={{ marginRight: 6 }} />}
        运行回测
      </button>

      {backtest && (
        <div style={{ marginTop: 16 }}>
          <div className="trade-label" style={{ marginBottom: 8 }}>回测绩效指标</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <MetricBox label="总收益率" value={`${(backtest.total_return * 100).toFixed(2)}%`} color={backtest.total_return >= 0 ? '#34d399' : '#ef4444'} />
            <MetricBox label="年化收益" value={`${(backtest.annualized_return * 100).toFixed(2)}%`} color={backtest.annualized_return >= 0 ? '#34d399' : '#ef4444'} />
            <MetricBox label="最大回撤" value={`${(backtest.max_drawdown * 100).toFixed(2)}%`} color="#ef4444" />
            <MetricBox label="夏普比率" value={backtest.sharpe_ratio.toFixed(2)} color={backtest.sharpe_ratio > 1 ? '#34d399' : '#fbbf24'} />
            <MetricBox label="胜率" value={`${(backtest.win_rate * 100).toFixed(1)}%`} />
            <MetricBox label="盈亏比" value={backtest.profit_loss_ratio.toFixed(2)} />
            <MetricBox label="总交易数" value={backtest.total_trades} />
            <MetricBox label="盈利交易" value={backtest.winning_trades} color="#34d399" />
          </div>
        </div>
      )}

      {aiAnalysis && <AIResultDisplay result={aiAnalysis} title="AI 回测分析" />}
    </div>
  )
}

// ============ 阶段3: 模拟交易 ============
function Stage3Paper({ pipeline, onRun, loading }) {
  const [latencyMs, setLatencyMs] = useState(100)
  const [slippageBps, setSlippageBps] = useState(3)

  const paper = pipeline.paper_data
  const summary = paper?.summary
  const aiReview = paper?.ai_review

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="trade-label">模拟延迟 (ms)</label>
          <input type="number" className="trade-input" value={latencyMs} min={50} max={200}
            onChange={e => setLatencyMs(parseInt(e.target.value) || 100)} />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>范围: 50-200ms</div>
        </div>
        <div>
          <label className="trade-label">滑点 (bps)</label>
          <input type="number" className="trade-input" value={slippageBps} min={1} max={20}
            onChange={e => setSlippageBps(parseInt(e.target.value) || 3)} />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>基础滑点 2-5bps</div>
        </div>
      </div>

      <button className="quant-btn" onClick={() => onRun({ latency_ms: latencyMs, slippage_bps: slippageBps })} disabled={loading}>
        {loading ? <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} /> : <i className="fa-solid fa-flask" style={{ marginRight: 6 }} />}
        运行模拟交易
      </button>

      {summary && (
        <div style={{ marginTop: 16 }}>
          <div className="trade-label" style={{ marginBottom: 8 }}>模拟交易结果</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <MetricBox label="总收益" value={`${(summary.total_return * 100).toFixed(2)}%`} color={summary.total_return >= 0 ? '#34d399' : '#ef4444'} />
            <MetricBox label="胜率" value={`${(summary.win_rate * 100).toFixed(1)}%`} />
            <MetricBox label="交易数" value={summary.total_trades} />
            <MetricBox label="回测匹配度" value={`${(summary.match_rate * 100).toFixed(1)}%`} color={summary.match_rate >= 0.8 ? '#34d399' : '#fbbf24'} />
          </div>
          <div style={{ marginTop: 8, padding: 12, background: 'var(--surface-2)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            可用资金: {summary.available_capital?.toLocaleString()} · 
            持仓数: {summary.open_positions} · 
            模拟开始: {summary.started_at}
          </div>
        </div>
      )}

      {aiReview && <AIResultDisplay result={aiReview} title="AI 模拟交易评审" />}
    </div>
  )
}

// ============ 阶段4: 实盘部署 ============
function Stage4Live({ pipeline, onRun, loading }) {
  const [initialPercent, setInitialPercent] = useState(0.01)

  const live = pipeline.live_data
  const aiMonitoring = live?.ai_monitoring

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label className="trade-label">初始资金比例</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min={0.01} max={0.10} step={0.01} value={initialPercent}
            onChange={e => setInitialPercent(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', minWidth: 50 }}>
            {(initialPercent * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          渐进式上线：先以 1% 小资金测试，再逐步扩大
        </div>
      </div>

      <button className="quant-btn" onClick={() => onRun({ initial_percent: initialPercent })} disabled={loading}>
        {loading ? <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} /> : <i className="fa-solid fa-rocket" style={{ marginRight: 6 }} />}
        启动实盘部署
      </button>

      {live && (
        <div style={{ marginTop: 16 }}>
          {/* 三级监控 */}
          <div className="trade-label" style={{ marginBottom: 8 }}>三级监控机制</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <MonitorCard title="数据监控" status={live.monitoring_levels?.data?.status} icon="fa-database" />
            <MonitorCard title="策略监控" status={live.monitoring_levels?.strategy?.status} icon="fa-chart-line" />
            <MonitorCard title="系统监控" status={live.monitoring_levels?.system?.status} icon="fa-server" />
          </div>

          {/* 部署步骤 */}
          <div className="trade-label" style={{ marginBottom: 8 }}>渐进式部署步骤</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {live.deployment_steps?.map(step => (
              <div key={step.step} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: 'var(--surface-2)',
                border: `1px solid ${step.status === 'active' ? 'var(--primary)' : step.status === 'completed' ? '#34d399' : 'var(--border)'}`
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: step.status === 'active' ? 'var(--primary)20' : step.status === 'completed' ? '#34d39920' : 'var(--surface)',
                  color: step.status === 'active' ? 'var(--primary)' : step.status === 'completed' ? '#34d399' : 'var(--text-tertiary)'
                }}>
                  {step.status === 'completed' ? <i className="fa-solid fa-check" /> : step.step}
                </div>
                <span style={{ fontSize: 13, color: step.status === 'pending' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                  {step.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiMonitoring && <AIResultDisplay result={aiMonitoring} title="AI 实盘监控分析" />}
    </div>
  )
}

// ============ AI 结果展示 ============
function AIResultDisplay({ result, title }) {
  const [showRaw, setShowRaw] = useState(false)

  if (!result) return null

  return (
    <div style={{
      marginTop: 16, padding: 16, background: 'var(--surface-2)',
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
          <i className="fa-solid fa-brain" style={{ marginRight: 6 }} />
          {title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {result.model_name && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {result.model_name} · {result.latency_ms}ms
            </span>
          )}
          <span style={{
            padding: '2px 6px', fontSize: 10,
            background: result.success ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
            color: result.success ? '#34d399' : '#ef4444'
          }}>
            {result.success ? 'SUCCESS' : 'FALLBACK'}
          </span>
          <button onClick={() => setShowRaw(!showRaw)} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            cursor: 'pointer', fontSize: 11
          }}>
            {showRaw ? '结构化' : '原始'}
          </button>
        </div>
      </div>

      {result.success && result.parsed ? (
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          {showRaw ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
              {result.content}
            </pre>
          ) : (
            <StructuredAIResult data={result.parsed} />
          )}
        </div>
      ) : result.content ? (
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
          {result.content}
        </pre>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {result.message || '无分析结果（使用规则引擎回退）'}
        </div>
      )}
    </div>
  )
}

// ============ 结构化 AI 结果 ============
function StructuredAIResult({ data }) {
  if (!data || typeof data !== 'object') return null

  const renderValue = (key, value) => {
    if (Array.isArray(value)) {
      return (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{key}:</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {value.map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {typeof item === 'object' ? JSON.stringify(item) : item}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{key}:</div>
          <div style={{ paddingLeft: 12 }}>
            {Object.entries(value).map(([k, v]) => renderValue(k, v))}
          </div>
        </div>
      )
    }
    return (
      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 120 }}>{key}:</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{String(value)}</span>
      </div>
    )
  }

  return <div>{Object.entries(data).map(([k, v]) => renderValue(k, v))}</div>
}

// ============ 指标盒子 ============
function MetricBox({ label, value, color }) {
  return (
    <div style={{
      padding: '8px 12px', background: 'var(--surface-2)',
      border: '1px solid var(--border)'
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

// ============ 监控卡片 ============
function MonitorCard({ title, status, icon }) {
  const colors = {
    active: '#34d399',
    healthy: '#34d399',
    warning: '#fbbf24',
    critical: '#ef4444',
    pending: 'var(--text-tertiary)'
  }
  const color = colors[status] || 'var(--text-tertiary)'

  return (
    <div style={{
      padding: 12, background: 'var(--surface-2)',
      border: `1px solid ${color}40`, textAlign: 'center'
    }}>
      <i className={`fa-solid ${icon}`} style={{ color, fontSize: 20, marginBottom: 4 }} />
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{status?.toUpperCase() || 'N/A'}</div>
    </div>
  )
}

// ============ 创建 Pipeline 弹窗 ============
function CreatePipelineModal({ onClose, onCreate, loading }) {
  const [form, setForm] = useState({
    strategy_name: '',
    strategy_type: 'trend_following',
    hypothesis: '',
    model_code: 'GLM-5.2',
    region: 'SG1',
    timeframe: '1h',
    initial_capital: 1000000
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.strategy_name) return
    onCreate(form)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div className="quant-card" style={{ width: 500, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="quant-card-header">
          <div className="quant-card-title">新建策略 Pipeline</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">策略名称</label>
            <input type="text" className="trade-input" placeholder="例如：GLM趋势跟踪策略"
              value={form.strategy_name} onChange={e => setForm({ ...form, strategy_name: e.target.value })} required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">策略类型</label>
            <select className="trade-input" value={form.strategy_type}
              onChange={e => setForm({ ...form, strategy_type: e.target.value })}>
              {STRATEGY_TYPES.map(s => <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="trade-label">交易模型</label>
              <select className="trade-input" value={form.model_code}
                onChange={e => setForm({ ...form, model_code: e.target.value })}>
                <option value="GLM-5.2">GLM-5.2</option>
                <option value="DeepSeek-V4">DeepSeek-V4</option>
                <option value="Qwen3-Max">Qwen3-Max</option>
                <option value="Kimi-K3">Kimi-K3</option>
              </select>
            </div>
            <div>
              <label className="trade-label">区域</label>
              <select className="trade-input" value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}>
                <option value="SG1">SG1 新加坡</option>
                <option value="HK1">HK1 香港</option>
                <option value="EU1">EU1 欧洲</option>
                <option value="US1">US1 美国</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="trade-label">时间周期</label>
              <select className="trade-input" value={form.timeframe}
                onChange={e => setForm({ ...form, timeframe: e.target.value })}>
                <option value="5m">5分钟</option>
                <option value="15m">15分钟</option>
                <option value="1h">1小时</option>
                <option value="4h">4小时</option>
                <option value="1d">日线</option>
              </select>
            </div>
            <div>
              <label className="trade-label">初始资金</label>
              <input type="number" className="trade-input" value={form.initial_capital}
                onChange={e => setForm({ ...form, initial_capital: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="trade-label">投资假设（可选）</label>
            <textarea className="trade-input" style={{ minHeight: 60, resize: 'vertical' }}
              placeholder="描述你的投资想法和可验证的假设..."
              value={form.hypothesis} onChange={e => setForm({ ...form, hypothesis: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="quant-btn quant-btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="quant-btn" disabled={loading}>
              {loading ? '创建中...' : '创建 Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ AI 模型配置弹窗 ============
function AIModelConfigModal({ onClose, onMessage }) {
  const [models, setModels] = useState([])
  const [providers, setProviders] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [testing, setTesting] = useState({})

  const loadData = async () => {
    try {
      const [modelList, providerList] = await Promise.all([
        pipelineApi.getAIModels(),
        pipelineApi.getProviders()
      ])
      setModels(modelList)
      setProviders(providerList)
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = async (data) => {
    try {
      await pipelineApi.createAIModel(data)
      onMessage('success', 'AI 模型添加成功')
      setShowAdd(false)
      loadData()
    } catch (err) {
      onMessage('error', '添加失败: ' + err.message)
    }
  }

  const handleTest = async (modelId) => {
    setTesting({ ...testing, [modelId]: true })
    try {
      const result = await pipelineApi.testAIModel(modelId)
      if (result.success) {
        onMessage('success', `连接成功！延迟 ${result.latency_ms}ms`)
      } else {
        onMessage('error', result.message)
      }
      loadData()
    } catch (err) {
      onMessage('error', '测试失败: ' + err.message)
    }
    setTesting({ ...testing, [modelId]: false })
  }

  const handleSetDefault = async (modelId) => {
    try {
      await pipelineApi.updateAIModel(modelId, { is_default: true, status: 'active' })
      onMessage('success', '已设为默认模型')
      loadData()
    } catch (err) {
      onMessage('error', '设置失败: ' + err.message)
    }
  }

  const handleDelete = async (modelId) => {
    if (!confirm('确定删除此 AI 模型配置？')) return
    try {
      await pipelineApi.deleteAIModel(modelId)
      onMessage('success', '已删除')
      loadData()
    } catch (err) {
      onMessage('error', '删除失败: ' + err.message)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div className="quant-card" style={{ width: 600, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="quant-card-header">
          <div>
            <div className="quant-card-title">AI 模型配置</div>
            <div className="quant-card-subtitle">接入不同 AI 模型进行策略分析与实时诊断</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="quant-btn quant-btn-sm" onClick={() => setShowAdd(true)}>
              <i className="fa-solid fa-plus" /> 添加模型
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {models.length > 0 ? (
            models.map(model => (
              <div key={model.id} style={{
                padding: 12, marginBottom: 8, background: 'var(--surface-2)',
                border: `1px solid ${model.status === 'active' ? 'var(--primary)40' : 'var(--border)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {model.name}
                      {model.is_default && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--primary)' }}>DEFAULT</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {providers[model.provider]?.name || model.provider} · {model.model_id}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 6px', fontSize: 10,
                    background: model.status === 'active' ? 'rgba(52,211,153,0.1)' : model.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                    color: model.status === 'active' ? '#34d399' : model.status === 'error' ? '#ef4444' : 'var(--text-tertiary)'
                  }}>
                    {model.status?.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                  {model.api_base}
                </div>

                {model.last_error && (
                  <div style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11, marginBottom: 8 }}>
                    {model.last_error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="quant-btn quant-btn-sm" onClick={() => handleTest(model.id)} disabled={testing[model.id]}>
                    {testing[model.id] ? '测试中...' : '测试连接'}
                  </button>
                  {!model.is_default && (
                    <button className="quant-btn quant-btn-sm quant-btn-secondary" onClick={() => handleSetDefault(model.id)}>
                      设为默认
                    </button>
                  )}
                  <button className="quant-btn quant-btn-sm quant-btn-secondary" onClick={() => handleDelete(model.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <i className="fa-solid fa-plug" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
              暂未配置 AI 模型，点击「添加模型」接入
            </div>
          )}

          <div style={{
            marginTop: 16, padding: 12, background: 'rgba(34,211,238,0.05)',
            border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-tertiary)'
          }}>
            <strong style={{ color: 'var(--primary)' }}>说明：</strong>
            支持接入 OpenAI、Anthropic、DeepSeek、智谱、月之暗面、通义千问等兼容 OpenAI 接口的模型。
            配置 API Key 后，系统将在策略设计、回测分析、模拟评审、实盘监控各阶段调用 AI 进行分析。
            未配置或连接失败时，自动回退到规则引擎。
          </div>
        </div>
      </div>

      {showAdd && (
        <AddAIModelModal
          providers={providers}
          onClose={() => setShowAdd(false)}
          onAdd={handleCreate}
        />
      )}
    </div>
  )
}

// ============ 添加 AI 模型弹窗 ============
function AddAIModelModal({ providers, onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '',
    provider: 'openai',
    model_id: '',
    api_key: '',
    api_base: '',
    temperature: 0.3,
    max_tokens: 2000
  })

  const provider = providers[form.provider]
  const models = provider?.models || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.model_id || !form.api_key) return
    onAdd({
      ...form,
      api_base: form.api_base || provider?.default_base || ''
    })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }} onClick={onClose}>
      <div className="quant-card" style={{ width: 480, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="quant-card-header">
          <div className="quant-card-title">添加 AI 模型</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">名称</label>
            <input type="text" className="trade-input" placeholder="例如：GPT-4o 分析模型"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">提供商</label>
            <select className="trade-input" value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value, model_id: '', api_base: providers[e.target.value]?.default_base || '' })}>
              {Object.entries(providers).map(([id, p]) => (
                <option key={id} value={id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">模型 ID</label>
            {models.length > 0 ? (
              <select className="trade-input" value={form.model_id}
                onChange={e => setForm({ ...form, model_id: e.target.value })}>
                <option value="">选择模型...</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
              </select>
            ) : (
              <input type="text" className="trade-input" placeholder="输入模型 ID"
                value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })} required />
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">API Key</label>
            <input type="password" className="trade-input" placeholder="sk-..."
              value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="trade-label">API Base URL</label>
            <input type="text" className="trade-input" placeholder={provider?.default_base || 'https://api.openai.com/v1'}
              value={form.api_base} onChange={e => setForm({ ...form, api_base: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="trade-label">Temperature</label>
              <input type="number" className="trade-input" min={0} max={2} step={0.1}
                value={form.temperature} onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="trade-label">Max Tokens</label>
              <input type="number" className="trade-input" min={100} max={8000} step={100}
                value={form.max_tokens} onChange={e => setForm({ ...form, max_tokens: parseInt(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="quant-btn quant-btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="quant-btn">添加</button>
          </div>
        </form>
      </div>
    </div>
  )
}
