import { useState, useCallback } from 'react'

type Mode = 'encode' | 'decode'

export default function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [urlSafe, setUrlSafe] = useState(false)
  const [copied, setCopied] = useState(false)

  const process = useCallback((value: string, currentMode: Mode, safe: boolean) => {
    if (!value.trim()) {
      setOutput('')
      setError('')
      return
    }
    try {
      if (currentMode === 'encode') {
        let result = btoa(unescape(encodeURIComponent(value)))
        if (safe) {
          result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
        setOutput(result)
      } else {
        let normalized = value
        if (safe) {
          normalized = value.replace(/-/g, '+').replace(/_/g, '/')
          const pad = normalized.length % 4
          if (pad) normalized += '='.repeat(4 - pad)
        }
        setOutput(decodeURIComponent(escape(atob(normalized))))
      }
      setError('')
    } catch {
      setError(currentMode === 'encode' ? '编码失败' : '无效的 Base64 字符串')
      setOutput('')
    }
  }, [])

  const handleInput = (value: string) => {
    setInput(value)
    process(value, mode, urlSafe)
  }

  const handleMode = (newMode: Mode) => {
    setMode(newMode)
    process(input, newMode, urlSafe)
  }

  const handleUrlSafe = (safe: boolean) => {
    setUrlSafe(safe)
    process(input, mode, safe)
  }

  const handleSwap = () => {
    const newMode: Mode = mode === 'encode' ? 'decode' : 'encode'
    setInput(output)
    setMode(newMode)
    process(output, newMode, urlSafe)
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleMode(m)}
              className="px-3 py-1 rounded-md text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {m === 'encode' ? '编码' : '解码'}
            </button>
          ))}
        </div>

        {/* URL-safe toggle */}
        <label
          className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div
            onClick={() => handleUrlSafe(!urlSafe)}
            className="w-8 h-4 rounded-full relative transition-all"
            style={{
              background: urlSafe ? 'var(--accent)' : 'var(--border)',
              cursor: 'pointer',
            }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: urlSafe ? '17px' : '2px' }}
            />
          </div>
          URL-safe
        </label>

        <div className="flex-1" />

        <button
          onClick={handleSwap}
          disabled={!output}
          className="px-3 py-1 rounded-md text-sm transition-all"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: 'none',
            cursor: output ? 'pointer' : 'not-allowed',
            opacity: output ? 1 : 0.4,
          }}
          title="将输出作为新输入"
        >
          ⇄ 互换
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-1 rounded-md text-sm transition-all"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          清空
        </button>
        <button
          onClick={handleCopy}
          disabled={!output}
          className="px-3 py-1 rounded-md text-sm font-medium transition-all"
          style={{
            background: copied ? '#10b981' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: output ? 'pointer' : 'not-allowed',
            opacity: output ? 1 : 0.4,
          }}
        >
          {copied ? '已复制 ✓' : '复制结果'}
        </button>
      </div>

      {/* Editor panes */}
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'encode' ? '原始文本' : 'Base64 字符串'}
          </label>
          <textarea
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入 Base64 字符串...'}
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

        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'encode' ? 'Base64 结果' : '解码结果'}
          </label>
          <textarea
            value={output}
            readOnly
            placeholder="结果将显示在这里..."
            spellCheck={false}
            className="flex-1 resize-none rounded-xl p-3 font-mono text-sm outline-none"
            style={{
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
            }}
          />
        </div>
      </div>
    </div>
  )
}
