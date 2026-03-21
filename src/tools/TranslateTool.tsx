import { useState, useEffect, useRef, useCallback } from 'react'

// ── Language definitions ───────────────────────────────────────────────────────

interface Lang {
  code: string
  name: string
  short: string
}

const LANGUAGES: Lang[] = [
  { code: 'zh',    name: '中文（简体）', short: '中文' },
  { code: 'zh-TW', name: '中文（繁體）', short: '繁體' },
  { code: 'en',    name: '英语',         short: 'EN' },
  { code: 'ja',    name: '日语',         short: '日本語' },
  { code: 'ko',    name: '韩语',         short: '한국어' },
  { code: 'fr',    name: '法语',         short: 'FR' },
  { code: 'de',    name: '德语',         short: 'DE' },
  { code: 'es',    name: '西班牙语',     short: 'ES' },
  { code: 'ru',    name: '俄语',         short: 'RU' },
  { code: 'pt',    name: '葡萄牙语',     short: 'PT' },
  { code: 'ar',    name: '阿拉伯语',     short: 'AR' },
  { code: 'it',    name: '意大利语',     short: 'IT' },
  { code: 'th',    name: '泰语',         short: 'TH' },
  { code: 'vi',    name: '越南语',       short: 'VI' },
  { code: 'id',    name: '印尼语',       short: 'ID' },
  { code: 'nl',    name: '荷兰语',       short: 'NL' },
]

const AUTO: Lang = { code: 'auto', name: '自动检测', short: '自动' }
const SRC_LANGS = [AUTO, ...LANGUAGES]
const LANG_MAP: Record<string, Lang> = {}
;[...SRC_LANGS, ...LANGUAGES].forEach((l) => { LANG_MAP[l.code] = l })

const SRC_QUICK = ['auto', 'zh', 'en']
const TGT_QUICK = ['zh', 'en']

// ── Translation providers ──────────────────────────────────────────────────────

interface Provider {
  id: string
  name: string
  translate: (text: string, from: string, to: string) => Promise<string>
}

// Google language code mapping
function toGoogleCode(code: string): string {
  const map: Record<string, string> = { zh: 'zh-CN', 'zh-TW': 'zh-TW' }
  return map[code] ?? code
}

// Provider 1: MyMemory (free, 500 words/day)
async function myMemoryTranslate(text: string, from: string, to: string): Promise<string> {
  const sl = from === 'auto' ? 'autodetect' : from
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text.slice(0, 500))}` +
    `&langpair=${encodeURIComponent(`${sl}|${to}`)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as {
    responseStatus: number
    responseData: { translatedText: string }
    responseDetails?: string
  }
  if (data.responseStatus !== 200) throw new Error(data.responseDetails ?? 'MyMemory error')
  const translated = data.responseData.translatedText
  // Detect quota warning
  if (translated.toUpperCase().includes('MYMEMORY WARNING')) throw new Error('MyMemory 额度已用尽')
  return translated
}

// Provider 2: Google Translate (unofficial gtx endpoint)
async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  const sl = from === 'auto' ? 'auto' : toGoogleCode(from)
  const tl = toGoogleCode(to)
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text.slice(0, 500))}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as unknown[][]
  if (!Array.isArray(data?.[0])) throw new Error('Google response invalid')
  return (data[0] as unknown[][]).map((item) => String(item[0] ?? '')).join('')
}

// Provider 3: Lingva (open-source Google Translate front-end)
async function lingvaTranslate(text: string, from: string, to: string): Promise<string> {
  const sl = from === 'auto' ? 'auto' : (from === 'zh' ? 'zh' : from)
  const tl = to === 'zh' ? 'zh' : to
  const url = `https://lingva.ml/api/v1/${sl}/${tl}/${encodeURIComponent(text.slice(0, 500))}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { translation?: string }
  if (!data.translation) throw new Error('Lingva response invalid')
  return data.translation
}

const PROVIDERS: Provider[] = [
  { id: 'mymemory', name: 'MyMemory',   translate: myMemoryTranslate },
  { id: 'google',   name: 'Google',     translate: googleTranslate },
  { id: 'lingva',   name: 'Lingva',     translate: lingvaTranslate },
]

// ── Language tab bar component ─────────────────────────────────────────────────

function LangTabBar({
  langs,
  quickCodes,
  selected,
  onSelect,
}: {
  langs: Lang[]
  quickCodes: string[]
  selected: string
  onSelect: (code: string) => void
}) {
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const quickLangs = quickCodes.map((c) => langs.find((l) => l.code === c)!).filter(Boolean)
  const isQuick = quickCodes.includes(selected)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {quickLangs.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang.code)}
          style={{
            border: 'none',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            background: selected === lang.code ? 'var(--accent)' : 'transparent',
            color: selected === lang.code ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {lang.short}
        </button>
      ))}

      <div ref={dropRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropOpen((o) => !o)}
          style={{
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            background: !isQuick ? 'var(--accent)' : 'transparent',
            color: !isQuick ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          {!isQuick ? (LANG_MAP[selected]?.short ?? selected) : '更多'}
          <span style={{ fontSize: '9px', opacity: 0.7 }}>{dropOpen ? '▲' : '▼'}</span>
        </button>

        {dropOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 300,
              minWidth: '160px',
              maxHeight: '280px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {langs.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { onSelect(lang.code); setDropOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 12px',
                  textAlign: 'left',
                  background: selected === lang.code ? 'var(--accent)' : 'transparent',
                  color: selected === lang.code ? '#fff' : 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderRadius: '6px',
                }}
                onMouseEnter={(e) => {
                  if (selected !== lang.code)
                    (e.target as HTMLElement).style.background = 'var(--bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  if (selected !== lang.code)
                    (e.target as HTMLElement).style.background = 'transparent'
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main tool ──────────────────────────────────────────────────────────────────

const MAX_CHARS = 500

export default function TranslateTool() {
  const [srcLang, setSrcLang] = useState('auto')
  const [tgtLang, setTgtLang] = useState('zh')
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  // Track the active provider index — persists across requests
  const providerIdxRef = useRef(0)
  const [displayProvider, setDisplayProvider] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doTranslate = useCallback(async (text: string, from: string, to: string) => {
    if (!text.trim()) { setResult(''); setError(''); return }
    if (from !== 'auto' && from === to) { setResult(text); return }

    setLoading(true)
    setError('')

    // Try providers starting from last successful one, wrap around if all fail
    const startIdx = providerIdxRef.current
    let tried = 0

    while (tried < PROVIDERS.length) {
      const idx = (startIdx + tried) % PROVIDERS.length
      try {
        const res = await PROVIDERS[idx].translate(text, from, to)
        // Success — record this provider
        providerIdxRef.current = idx
        setDisplayProvider(idx)
        setResult(res)
        setLoading(false)
        return
      } catch (e) {
        console.warn(`[${PROVIDERS[idx].name}] failed:`, (e as Error).message)
        tried++
      }
    }

    // All providers exhausted
    setError('所有翻译源均不可用，请检查网络连接')
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doTranslate(input, srcLang, tgtLang), 700)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [input, srcLang, tgtLang, doTranslate])

  // Manually switch to next provider and re-translate
  const switchProvider = () => {
    const next = (providerIdxRef.current + 1) % PROVIDERS.length
    providerIdxRef.current = next
    setDisplayProvider(next)
    doTranslate(input, srcLang, tgtLang)
  }

  const handleSwap = () => {
    if (srcLang === 'auto') return
    const prev = { srcLang, tgtLang, input, result }
    setSrcLang(prev.tgtLang)
    setTgtLang(prev.srcLang)
    setInput(prev.result)
    setResult(prev.input)
  }

  const handleSrcLang = (code: string) => {
    setSrcLang(code)
    if (code !== 'auto' && code === tgtLang) setTgtLang(code === 'zh' ? 'en' : 'zh')
  }

  const handleTgtLang = (code: string) => {
    setTgtLang(code)
    if (code === srcLang) setSrcLang(code === 'zh' ? 'en' : 'zh')
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
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

  const currentProviderName = PROVIDERS[displayProvider]?.name ?? 'Unknown'

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Language selector bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 44px 1fr',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          gap: '8px',
        }}
      >
        <LangTabBar langs={SRC_LANGS} quickCodes={SRC_QUICK} selected={srcLang} onSelect={handleSrcLang} />

        <button
          onClick={handleSwap}
          disabled={srcLang === 'auto'}
          title={srcLang === 'auto' ? '自动检测时无法互换' : '互换语言'}
          style={{
            ...btnBase,
            padding: '6px',
            fontSize: '16px',
            background: 'var(--bg-secondary)',
            color: srcLang === 'auto' ? 'var(--border)' : 'var(--text-secondary)',
            cursor: srcLang === 'auto' ? 'not-allowed' : 'pointer',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            justifySelf: 'center',
          }}
        >
          ⇄
        </button>

        <LangTabBar langs={LANGUAGES} quickCodes={TGT_QUICK} selected={tgtLang} onSelect={handleTgtLang} />
      </div>

      {/* Text areas */}
      <div className="flex-1 flex min-h-0">
        {/* Source */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            placeholder="输入要翻译的文字..."
            spellCheck={false}
            className="flex-1 resize-none p-4 font-sans text-base outline-none"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              lineHeight: '1.7',
              border: 'none',
            }}
          />
          <div
            style={{
              padding: '6px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '36px',
            }}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {input.length} / {MAX_CHARS}
            </span>
            {input && (
              <button
                onClick={() => { setInput(''); setResult(''); setError('') }}
                style={{ ...btnBase, padding: '2px 10px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                清空
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className="flex-1 p-4 overflow-y-auto text-base"
            style={{
              color: loading ? 'var(--text-secondary)' : error ? '#f87171' : 'var(--text-primary)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontStyle: loading ? 'italic' : 'normal',
            }}
          >
            {loading
              ? `翻译中...`
              : error
              ? `⚠ ${error}`
              : result || <span style={{ color: 'var(--text-secondary)' }}>译文</span>}
          </div>

          {/* Result footer: provider indicator + copy */}
          <div
            style={{
              padding: '6px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '36px',
            }}
          >
            {/* Provider badge — click to manually switch */}
            <button
              onClick={switchProvider}
              title="点击手动切换翻译源"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'transparent',
                border: `1px solid var(--border)`,
                borderRadius: '20px',
                padding: '2px 10px',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: loading ? '#f59e0b' : error ? '#f87171' : '#10b981',
                  flexShrink: 0,
                }}
              />
              {currentProviderName}
              <span style={{ fontSize: '9px', opacity: 0.5 }}>切换</span>
            </button>

            {result && !loading && !error && (
              <button
                onClick={handleCopy}
                style={{
                  ...btnBase,
                  padding: '2px 10px',
                  fontSize: '12px',
                  background: copied ? '#10b981' : 'var(--accent)',
                  color: '#fff',
                }}
              >
                {copied ? '已复制 ✓' : '复制译文'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
