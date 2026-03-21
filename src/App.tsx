import { useEffect, useState } from 'react'
import JsonTool from './tools/JsonTool'
import Base64Tool from './tools/Base64Tool'
import TimestampTool from './tools/TimestampTool'
import TranslateTool from './tools/TranslateTool'
import NotesTool from './tools/NotesTool'

type TabId = 'notes' | 'json' | 'base64' | 'timestamp' | 'translate'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'notes',     label: '笔记',   icon: '📝' },
  { id: 'json',      label: 'JSON',   icon: '{}' },
  { id: 'base64',    label: 'Base64', icon: 'B64' },
  { id: 'timestamp', label: '时间戳', icon: '⏱' },
  { id: 'translate', label: '翻译',   icon: '译' },
]

const isMac = window.electronAPI?.platform === 'darwin'

function useClockTime() {
  const fmt = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('notes')
  const [darkMode, setDarkMode] = useState(false)
  const time = useClockTime()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header — 3-column grid so tabs are always centered */}
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          height: '52px',
          paddingLeft: isMac ? '76px' : '12px',
          paddingRight: '12px',
          // @ts-expect-error electron drag region
          WebkitAppRegion: 'drag',
        }}
      >
        <div />

        {/* Center: tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            // @ts-expect-error electron drag region
            WebkitAppRegion: 'no-drag',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                border: 'none',
                outline: 'none',
              }}
            >
              <span className="font-mono text-xs opacity-70">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: dark mode toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-all text-base"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              border: 'none',
              // @ts-expect-error electron drag region
              WebkitAppRegion: 'no-drag',
            }}
            title={darkMode ? '切换浅色模式' : '切换深色模式'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {/* Always mount all tools to preserve state; hide inactive ones */}
        <div style={{ display: activeTab === 'notes'     ? 'block' : 'none', height: '100%' }}><NotesTool /></div>
        <div style={{ display: activeTab === 'json'      ? 'block' : 'none', height: '100%' }}><JsonTool /></div>
        <div style={{ display: activeTab === 'base64'    ? 'block' : 'none', height: '100%' }}><Base64Tool /></div>
        <div style={{ display: activeTab === 'timestamp' ? 'block' : 'none', height: '100%' }}><TimestampTool /></div>
        <div style={{ display: activeTab === 'translate' ? 'block' : 'none', height: '100%' }}><TranslateTool /></div>
      </main>

      {/* Status bar */}
      <footer
        style={{
          height: '26px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '14px',
          flexShrink: 0,
        }}
      >
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--text-secondary)', letterSpacing: '0.03em' }}
        >
          {time}
        </span>
      </footer>
    </div>
  )
}
