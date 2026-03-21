import { useState, useCallback, useRef, useEffect } from 'react'
import JsonTreeView from './JsonTreeView'

type Indent = 2 | 4

// ── JSON History ────────────────────────────────────────────────────────────────

interface HistoryEntry {
  time: string   // YYYY-MM-DD HH:MM:SS
  content: string
}

const HISTORY_KEY = 'json-history'
const MAX_HISTORY = 50

function nowStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function minifiedKey(content: string): string {
  try { return JSON.stringify(JSON.parse(content)) } catch { return content }
}

// ── Dropdown button ────────────────────────────────────────────────────────────

interface DropdownOption {
  label: string
  value: string
}

function DropdownButton({
  label,
  options,
  onSelect,
  btnStyle,
}: {
  label: string
  options: DropdownOption[]
  onSelect: (value: string) => void
  btnStyle?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          border: 'none',
          cursor: 'pointer',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          ...btnStyle,
        }}
      >
        {label}
        <span style={{ fontSize: '10px', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
            zIndex: 200,
            minWidth: '150px',
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelect(opt.value)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.background = 'var(--bg-secondary)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.background = 'transparent')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main tool ──────────────────────────────────────────────────────────────────

export default function JsonTool() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<unknown>(null)
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<Indent>(2)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)

  const recordHistory = useCallback((content: string) => {
    setHistory((prev) => {
      if (prev.length > 0 && minifiedKey(prev[0].content) === minifiedKey(content)) return prev
      const next = [{ time: nowStr(), content }, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [])

  const tryParse = useCallback((value: string) => {
    if (!value.trim()) {
      setParsed(null)
      setError('')
      return
    }
    try {
      setParsed(JSON.parse(value))
      setError('')
    } catch (e) {
      setParsed(null)
      setError((e as Error).message)
    }
  }, [])

  const updateInput = (value: string) => {
    setInput(value)
    tryParse(value)
  }

  // Format / Minify — operate on left textarea
  const handleFormat = () => {
    if (!input.trim()) return
    try {
      const p = JSON.parse(input)
      const formatted = JSON.stringify(p, null, indent)
      updateInput(formatted)
      recordHistory(formatted)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleMinify = () => {
    if (!input.trim()) return
    try {
      const p = JSON.parse(input)
      const minified = JSON.stringify(p)
      updateInput(minified)
      recordHistory(minified)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Chinese ↔ Unicode
  const handleUnicode = (action: string) => {
    if (!input) return
    let result: string
    if (action === 'zh2unicode') {
      result = input.replace(
        /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u2e80-\u2eff\u3000-\u303f]/g,
        (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
      )
    } else {
      result = input.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
    }
    updateInput(result)
    recordHistory(result)
  }

  // Remove backslash escapes
  const handleUnescape = () => {
    if (!input) return
    // If the whole input is a JSON-encoded string, unwrap it first
    let result = input.trim()
    if (result.startsWith('"') && result.endsWith('"')) {
      try {
        result = JSON.parse(result) as string
        updateInput(result)
        recordHistory(result)
        return
      } catch {
        // fall through to simple replace
      }
    }
    result = result.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    updateInput(result)
    recordHistory(result)
  }

  // Indent dropdown
  const handleIndent = (value: string) => {
    const n = Number(value) as Indent
    setIndent(n)
    // Re-format immediately if input is valid
    if (!input.trim()) return
    try {
      const p = JSON.parse(input)
      updateInput(JSON.stringify(p, null, n))
    } catch {
      // just update indent preference silently
    }
  }

  const handleCopy = async () => {
    if (!input) return
    await navigator.clipboard.writeText(input)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClear = () => {
    setInput('')
    setParsed(null)
    setError('')
  }

  const btnBase: React.CSSProperties = {
    border: 'none',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
  }

  const divider = (
    <div
      style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 2px' }}
    />
  )

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleFormat}
          style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}
        >
          格式化
        </button>
        <button
          onClick={handleMinify}
          style={{ ...btnBase, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          压缩
        </button>

        {divider}

        <DropdownButton
          label="中文 / Unicode"
          options={[
            { label: '中文 → Unicode', value: 'zh2unicode' },
            { label: 'Unicode → 中文', value: 'unicode2zh' },
          ]}
          onSelect={handleUnicode}
        />

        <button
          onClick={handleUnescape}
          style={{ ...btnBase, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          去除转义
        </button>

        <DropdownButton
          label={`缩进：${indent} 空格`}
          options={[
            { label: '2 空格', value: '2' },
            { label: '4 空格', value: '4' },
          ]}
          onSelect={handleIndent}
        />

        <div className="flex-1" />

        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{
            ...btnBase,
            background: showHistory ? 'var(--accent)' : 'var(--bg-secondary)',
            color: showHistory ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {showHistory ? '隐藏历史' : '历史'}
        </button>

        {divider}

        <button
          onClick={handleClear}
          style={{ ...btnBase, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          清空
        </button>
        <button
          onClick={handleCopy}
          disabled={!input}
          style={{
            ...btnBase,
            background: copied ? '#10b981' : 'var(--accent)',
            color: '#fff',
            opacity: input ? 1 : 0.4,
            cursor: input ? 'pointer' : 'not-allowed',
          }}
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>

      {/* Main panes */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* History panel — leftmost, fixed width */}
        {showHistory && (
          <div
            style={{
              width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column',
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                JSON 历史
              </span>
              <button
                onClick={() => {
                  setHistory([])
                  saveHistory([])
                }}
                disabled={history.length === 0}
                style={{
                  border: 'none', cursor: history.length > 0 ? 'pointer' : 'not-allowed',
                  borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 500,
                  background: history.length > 0 ? '#fee2e2' : 'var(--bg-secondary)',
                  color: history.length > 0 ? '#ef4444' : 'var(--text-secondary)',
                  opacity: history.length > 0 ? 1 : 0.5,
                }}
              >
                清空
              </button>
            </div>
            {/* Entries */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', fontSize: '13px', color: 'var(--text-secondary)',
                }}>
                  暂无历史记录
                </div>
              ) : (
                history.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background 0.12s', position: 'relative',
                    }}
                    onClick={() => updateInput(entry.content)}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {entry.time}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const next = history.filter((_, j) => j !== i)
                          setHistory(next)
                          saveHistory(next)
                        }}
                        style={{
                          border: 'none', cursor: 'pointer', background: 'transparent',
                          color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1,
                          padding: '0 2px', borderRadius: '3px',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{
                      fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {entry.content.length > 80 ? entry.content.slice(0, 80) + '…' : entry.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            输入 JSON
          </label>
          <textarea
            value={input}
            onChange={(e) => updateInput(e.target.value)}
            placeholder='{"key": "value"}'
            spellCheck={false}
            className="flex-1 resize-none rounded-xl p-3 font-mono text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-card)',
              border: `1.5px solid ${error ? '#f87171' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              lineHeight: '1.6',
            }}
          />
          {error && (
            <p className="text-xs px-1" style={{ color: '#f87171' }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Tree view */}
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            JSON 树状图
          </label>
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)' }}
          >
            {parsed !== null ? (
              <JsonTreeView data={parsed as never} />
            ) : (
              <div
                className="flex items-center justify-center h-full text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {error ? '⚠ 输入包含无效 JSON' : '在左侧输入 JSON…'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
