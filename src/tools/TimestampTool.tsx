import { useState, useEffect } from 'react'

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function parseDate(str: string): Date | null {
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export default function TimestampTool() {
  const [now, setNow] = useState(Date.now())

  // Timestamp → Date
  const [tsInput, setTsInput] = useState('')
  const [tsUnit, setTsUnit] = useState<'s' | 'ms'>('s')
  const [tsResult, setTsResult] = useState('')
  const [tsError, setTsError] = useState('')

  // Date → Timestamp
  const [dateInput, setDateInput] = useState('')
  const [dateResult, setDateResult] = useState('')
  const [dateError, setDateError] = useState('')

  const [copiedTs, setCopiedTs] = useState(false)
  const [copiedDate, setCopiedDate] = useState(false)

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Timestamp → Date
  useEffect(() => {
    if (!tsInput.trim()) {
      setTsResult('')
      setTsError('')
      return
    }
    const num = Number(tsInput.trim())
    if (isNaN(num)) {
      setTsError('请输入有效的数字')
      setTsResult('')
      return
    }
    const ms = tsUnit === 's' ? num * 1000 : num
    const d = new Date(ms)
    if (isNaN(d.getTime())) {
      setTsError('无效的时间戳')
      setTsResult('')
      return
    }
    setTsResult(
      `本地时间：${formatDate(d)}\nUTC 时间：${d.toISOString().replace('T', ' ').slice(0, 19)}`
    )
    setTsError('')
  }, [tsInput, tsUnit])

  // Date → Timestamp
  useEffect(() => {
    if (!dateInput.trim()) {
      setDateResult('')
      setDateError('')
      return
    }
    const d = parseDate(dateInput.trim())
    if (!d) {
      setDateError('无法解析时间，支持格式：2024-01-01 12:00:00 / ISO 8601')
      setDateResult('')
      return
    }
    const ts = d.getTime()
    setDateResult(`秒级时间戳：${Math.floor(ts / 1000)}\n毫秒时间戳：${ts}`)
    setDateError('')
  }, [dateInput])

  const copyText = async (text: string, which: 'ts' | 'date') => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    if (which === 'ts') {
      setCopiedTs(true)
      setTimeout(() => setCopiedTs(false), 1500)
    } else {
      setCopiedDate(true)
      setTimeout(() => setCopiedDate(false), 1500)
    }
  }

  const useCurrentTs = () => {
    setTsInput(String(Math.floor(Date.now() / 1000)))
    setTsUnit('s')
  }

  const useCurrentDate = () => {
    setDateInput(formatDate(new Date()))
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Live clock banner */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
      >
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            当前时间
          </p>
          <p className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatDate(new Date(now))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Unix 时间戳（秒）
          </p>
          <p className="font-mono text-lg font-semibold" style={{ color: 'var(--accent)' }}>
            {Math.floor(now / 1000)}
          </p>
        </div>
      </div>

      {/* Two panels */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Timestamp → Date */}
        <div
          className="flex-1 flex flex-col gap-3 rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              时间戳 → 时间
            </h3>
            <button
              onClick={useCurrentTs}
              className="text-xs px-2 py-1 rounded-md"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              用当前时间戳
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="输入时间戳..."
              className="flex-1 rounded-lg px-3 py-2 font-mono text-sm outline-none"
              style={{
                background: 'var(--bg-secondary)',
                border: `1.5px solid ${tsError ? '#f87171' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
            />
            <div
              className="flex rounded-lg p-0.5 gap-0.5"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)' }}
            >
              {(['s', 'ms'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setTsUnit(u)}
                  className="px-2 py-1 rounded-md text-xs font-mono font-medium transition-all"
                  style={{
                    background: tsUnit === u ? 'var(--accent)' : 'transparent',
                    color: tsUnit === u ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {tsError && (
            <p className="text-xs" style={{ color: '#f87171' }}>⚠ {tsError}</p>
          )}

          {tsResult && (
            <div
              className="rounded-lg p-3 font-mono text-sm flex-1"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}
            >
              {tsResult}
            </div>
          )}

          <button
            onClick={() => copyText(tsResult, 'ts')}
            disabled={!tsResult}
            className="text-sm py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: copiedTs ? '#10b981' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: tsResult ? 'pointer' : 'not-allowed',
              opacity: tsResult ? 1 : 0.4,
            }}
          >
            {copiedTs ? '已复制 ✓' : '复制结果'}
          </button>
        </div>

        {/* Date → Timestamp */}
        <div
          className="flex-1 flex flex-col gap-3 rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              时间 → 时间戳
            </h3>
            <button
              onClick={useCurrentDate}
              className="text-xs px-2 py-1 rounded-md"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              用当前时间
            </button>
          </div>

          <input
            type="text"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            placeholder="2024-01-01 12:00:00"
            className="rounded-lg px-3 py-2 font-mono text-sm outline-none"
            style={{
              background: 'var(--bg-secondary)',
              border: `1.5px solid ${dateError ? '#f87171' : 'var(--border)'}`,
              color: 'var(--text-primary)',
            }}
          />

          {dateError && (
            <p className="text-xs" style={{ color: '#f87171' }}>⚠ {dateError}</p>
          )}

          {dateResult && (
            <div
              className="rounded-lg p-3 font-mono text-sm flex-1"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}
            >
              {dateResult}
            </div>
          )}

          <button
            onClick={() => copyText(dateResult, 'date')}
            disabled={!dateResult}
            className="text-sm py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: copiedDate ? '#10b981' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: dateResult ? 'pointer' : 'not-allowed',
              opacity: dateResult ? 1 : 0.4,
            }}
          >
            {copiedDate ? '已复制 ✓' : '复制结果'}
          </button>
        </div>
      </div>
    </div>
  )
}
