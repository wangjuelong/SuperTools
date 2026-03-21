import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { marked } from 'marked'

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayTitle() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function newNote(): Note {
  const now = Date.now()
  return { id: String(now), title: todayTitle(), content: '', tags: [], pinned: false, createdAt: now, updatedAt: now }
}

function relativeDate(ts: number) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  if (hour < 24) return `${hour} 小时前`
  if (day < 7) return `${day} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

function stripMd(s: string) {
  return s.replace(/[#*`_~[\]()>!|-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function renderMd(content: string): string {
  try {
    const result = marked.parse(content)
    return typeof result === 'string' ? result : ''
  } catch {
    return content
  }
}

// ── Tag pill ───────────────────────────────────────────────────────────────────

const TAG_COLORS = [
  '#3b82f6','#8b5cf6','#f97316','#22c55e','#e11d48','#06b6d4','#f59e0b','#a855f7'
]
function tagColor(tag: string) {
  let h = 0
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return TAG_COLORS[h % TAG_COLORS.length]
}

function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const color = tagColor(label)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      background: color + '22', color, border: `1px solid ${color}55`,
      borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: 500,
      whiteSpace: 'nowrap', userSelect: 'none',
    }}>
      {label}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{ cursor: 'pointer', opacity: 0.6, lineHeight: 1, fontSize: '13px' }}
        >
          ×
        </span>
      )}
    </span>
  )
}

// ── Note list item (must be at module level to keep stable identity across renders) ──

type ViewMode = 'split' | 'edit' | 'preview'

interface NoteItemProps {
  note: Note
  active: boolean
  onSelect: () => void
  onPin: (pinned: boolean) => void
  onDelete: () => void
  onRename: (title: string) => void
}

function NoteItem({ note, active, onSelect, onPin, onDelete, onRename }: NoteItemProps) {
  const [hovered, setHovered] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTitleDraft(note.title) }, [note.title])
  useEffect(() => { if (!active) setEditingTitle(false) }, [active])
  useEffect(() => {
    if (editingTitle) setTimeout(() => { titleInputRef.current?.focus(); titleInputRef.current?.select() }, 0)
  }, [editingTitle])

  const startEdit = (e: React.MouseEvent) => {
    if (!active) return
    e.stopPropagation()
    setEditingTitle(true)
  }

  const commitTitle = () => {
    setEditingTitle(false)
    const val = titleDraft.trim()
    if (val && val !== note.title) onRename(val)
    else setTitleDraft(note.title)
  }

  return (
    <div
      onClick={() => { if (!active) onSelect() }}
      style={{
        padding: '10px 10px', cursor: 'pointer', borderRadius: '8px',
        background: active ? 'var(--accent)' : hovered ? 'var(--bg-secondary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-primary)',
        marginBottom: '2px', transition: 'background 0.15s',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '82px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row 1: title + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
              if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(note.title) }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, fontSize: '17px', fontWeight: 700, border: 'none', outline: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.5)',
              background: 'transparent', color: '#fff', padding: '0', minWidth: 0,
            }}
          />
        ) : (
          <span
            onClick={startEdit}
            title={active ? '点击编辑标题' : undefined}
            style={{
              fontWeight: 700, fontSize: '17px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              cursor: active ? 'text' : 'pointer',
            }}
          >
            {note.pinned && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" style={{ marginRight: '4px', flexShrink: 0 }}>
                <path d="M16 3a1 1 0 0 1 .707 1.707L15.414 6l2.293 2.293a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 0 1-1.414 0L13.586 9l-4.293 4.293.707.707a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 1.414-1.414l.707.707L10.414 6l-1.707-1.707A1 1 0 0 1 10 2.586l6-1a1 1 0 0 1 0 .414zM5 19l4-4 1.414 1.414-4 4z"/>
              </svg>
            )}
            {note.title || '无标题'}
          </span>
        )}

        {(hovered || active) && !editingTitle ? (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onPin(!note.pinned)}
              title={note.pinned ? '取消置顶' : '置顶'}
              style={{
                border: 'none', cursor: 'pointer', borderRadius: '4px',
                padding: '3px 5px', lineHeight: 1, display: 'flex', alignItems: 'center',
                background: note.pinned
                  ? (active ? 'rgba(255,255,255,0.25)' : '#f59e0b22')
                  : (active ? 'rgba(255,255,255,0.15)' : 'var(--bg-primary)'),
                color: note.pinned ? '#f59e0b' : (active ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)'),
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 3a1 1 0 0 1 .707 1.707L15.414 6l2.293 2.293a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 0 1-1.414 0L13.586 9l-4.293 4.293.707.707a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 1.414-1.414l.707.707L10.414 6l-1.707-1.707A1 1 0 0 1 10 2.586l6-1a1 1 0 0 1 0 .414zM5 19l4-4 1.414 1.414-4 4z"/>
              </svg>
            </button>
            <button
              onClick={onDelete}
              title="删除笔记"
              style={{
                border: 'none', cursor: 'pointer', borderRadius: '4px',
                padding: '3px 5px', lineHeight: 1, display: 'flex', alignItems: 'center',
                background: active ? 'rgba(255,255,255,0.15)' : 'var(--bg-primary)',
                color: active ? 'rgba(255,180,180,0.9)' : '#f87171',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 1 1 0-2h4V4a1 1 0 0 1 1-1zm0 4v12h2V7H9zm4 0v12h2V7h-2z"/>
              </svg>
            </button>
          </div>
        ) : !editingTitle ? (
          <span style={{ fontSize: '10px', opacity: 0.5, flexShrink: 0 }}>{relativeDate(note.updatedAt)}</span>
        ) : null}
      </div>

      {/* Row 2: content preview */}
      <div style={{
        fontSize: '12px', opacity: 0.6, marginTop: '3px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: '16px',
      }}>
        {stripMd(note.content).slice(0, 60) || '\u00a0'}
      </div>

      {/* Row 3: tags (read-only) */}
      <div style={{ display: 'flex', gap: '3px', marginTop: '4px', minHeight: '20px', flexWrap: 'wrap' }}>
        {note.tags.slice(0, 3).map((t) => <Tag key={t} label={t} />)}
      </div>
    </div>
  )
}

// ── Expand handle (shown when sidebar is collapsed) ────────────────────────────

function ExpandHandle({ onExpand }: { onExpand: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: hovered ? '28px' : '8px',
        zIndex: 100, display: 'flex', alignItems: 'center',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <button
          onClick={onExpand}
          style={{
            width: '28px', height: '52px', border: '1px solid var(--border)',
            borderLeft: 'none', borderRadius: '0 8px 8px 0',
            cursor: 'pointer', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '3px 0 8px rgba(0,0,0,0.1)',
          }}
        >›</button>
      )}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({
  notes, trashNotes, selected, selectedNote, filterTag, allTags,
  onSelect, onCreate, onFilterTag, onPin, onDelete, onRename, onTagsChange,
  onRestore, onPermanentDelete, onEmptyTrash, onCollapse,
}: {

  notes: Note[]
  trashNotes: Note[]
  selected: string | null
  selectedNote: Note | null
  filterTag: string | null
  allTags: string[]
  onSelect: (id: string) => void
  onCreate: () => void
  onFilterTag: (tag: string | null) => void
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onTagsChange: (id: string, tags: string[]) => void
  onRestore: (id: string) => void
  onPermanentDelete: (id: string) => void
  onEmptyTrash: () => void
  onCollapse: () => void
}) {
  const [showTrash, setShowTrash] = useState(false)
  const pinned = notes.filter((n) => n.pinned)
  const rest   = notes.filter((n) => !n.pinned)
  const [tagInput, setTagInput] = useState('')
  const [tagFocused, setTagFocused] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const tagSuggestions = useMemo(() => {
    if (!selectedNote) return []
    const q = tagInput.trim().toLowerCase()
    return allTags.filter((t) =>
      !selectedNote.tags.includes(t) && (q === '' || t.includes(q))
    )
  }, [allTags, selectedNote, tagInput])

  const addTag = (raw: string) => {
    if (!selectedNote) return
    const t = raw.trim().toLowerCase()
    if (!t || selectedNote.tags.includes(t)) { setTagInput(''); return }
    onTagsChange(selectedNote.id, [...selectedNote.tags, t])
    setTagInput('')
  }

  const removeTag = (t: string) => {
    if (!selectedNote) return
    onTagsChange(selectedNote.id, selectedNote.tags.filter((x) => x !== t))
  }

  const btnStyle: React.CSSProperties = {
    border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '12px',
    fontWeight: 500, transition: 'all 0.15s', padding: '3px 8px',
  }

  return (
    <div style={{
      width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--border)', background: 'var(--bg-card)',
      position: 'relative',
    }}>
      {/* Collapse tab — right edge, vertically centered */}
      <button
        onClick={onCollapse}
        title="收起侧边栏"
        style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: '14px', height: '48px', border: 'none', borderLeft: '1px solid var(--border)',
          borderRadius: '0 4px 4px 0', cursor: 'pointer', zIndex: 10,
          background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', padding: 0,
        }}
      >‹</button>

      {/* Header: new note or trash title */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {showTrash ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              垃圾桶 ({trashNotes.length})
            </span>
            {trashNotes.length > 0 && (
              <button
                onClick={onEmptyTrash}
                style={{ ...btnStyle, padding: '4px 8px', background: '#fee2e2', color: '#ef4444', fontSize: '11px' }}
              >
                清空
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onCreate}
            style={{ ...btnStyle, width: '100%', padding: '7px', background: 'var(--accent)', color: '#fff', fontSize: '13px' }}
          >
            + 新笔记
          </button>
        )}
      </div>

      {/* Tag filters — only in main view */}
      {!showTrash && allTags.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={() => onFilterTag(null)}
            style={{ ...btnStyle, background: filterTag === null ? 'var(--accent)' : 'var(--bg-secondary)', color: filterTag === null ? '#fff' : 'var(--text-secondary)' }}
          >
            全部
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => onFilterTag(filterTag === t ? null : t)}
              style={{ ...btnStyle, background: filterTag === t ? tagColor(t) : 'var(--bg-secondary)', color: filterTag === t ? '#fff' : 'var(--text-secondary)' }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Notes list or Trash list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {!showTrash ? (
          <>
            {pinned.length > 0 && (
              <>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '4px 4px 2px', letterSpacing: '0.08em' }}>
                  置顶
                </div>
                {pinned.map((n) => (
                  <NoteItem key={n.id} note={n} active={n.id === selected}
                    onSelect={() => onSelect(n.id)}
                    onPin={(p) => onPin(n.id, p)}
                    onDelete={() => onDelete(n.id)}
                    onRename={(t) => onRename(n.id, t)}
                  />
                ))}
                <div style={{ height: '1px', background: 'var(--border)', margin: '6px 4px' }} />
              </>
            )}
            {rest.length > 0 && (
              <>
                {pinned.length > 0 && (
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '4px 4px 2px', letterSpacing: '0.08em' }}>
                    全部笔记
                  </div>
                )}
                {rest.map((n) => (
                  <NoteItem key={n.id} note={n} active={n.id === selected}
                    onSelect={() => onSelect(n.id)}
                    onPin={(p) => onPin(n.id, p)}
                    onDelete={() => onDelete(n.id)}
                    onRename={(t) => onRename(n.id, t)}
                  />
                ))}
              </>
            )}
            {notes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '40px' }}>
                暂无笔记<br /><span style={{ fontSize: '11px', opacity: 0.6 }}>点击「+ 新笔记」开始</span>
              </div>
            )}
          </>
        ) : (
          /* Trash view */
          <>
            {trashNotes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '40px' }}>
                垃圾桶为空
              </div>
            )}
            {trashNotes.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '8px 10px', borderRadius: '8px', marginBottom: '2px',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                  {n.title || '无标题'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stripMd(n.content).slice(0, 50) || '\u00a0'}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    onClick={() => onRestore(n.id)}
                    style={{ ...btnStyle, padding: '2px 8px', background: 'var(--accent)', color: '#fff', fontSize: '11px' }}
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => onPermanentDelete(n.id)}
                    style={{ ...btnStyle, padding: '2px 8px', background: '#fee2e2', color: '#ef4444', fontSize: '11px' }}
                  >
                    永久删除
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Tag editor — bottom, only in main view when a note is selected */}
      {!showTrash && selectedNote && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '10px 12px 12px',
          flexShrink: 0, background: 'var(--bg-secondary)', position: 'relative',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px', letterSpacing: '0.06em' }}>
            标签
          </div>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', minHeight: '26px', cursor: 'text' }}
            onClick={() => tagInputRef.current?.focus()}
          >
            {selectedNote.tags.map((t) => (
              <Tag key={t} label={t} onRemove={() => removeTag(t)} />
            ))}
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onFocus={() => setTagFocused(true)}
              onBlur={() => setTimeout(() => setTagFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                if (e.key === 'Backspace' && !tagInput && selectedNote.tags.length > 0) {
                  removeTag(selectedNote.tags[selectedNote.tags.length - 1])
                }
              }}
              placeholder={selectedNote.tags.length === 0 ? '输入标签后按 Enter' : '+ 标签'}
              style={{
                border: 'none', outline: 'none', background: 'transparent', fontSize: '11px',
                color: 'var(--text-primary)', minWidth: '80px', flex: 1, padding: '1px 0',
              }}
            />
          </div>
          {tagFocused && tagSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '100%', left: '12px', right: '12px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              padding: '4px', marginBottom: '4px', zIndex: 20,
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '2px 6px 4px', fontWeight: 600, letterSpacing: '0.05em' }}>已有标签</div>
              {tagSuggestions.slice(0, 6).map((t) => (
                <div key={t} onMouseDown={(e) => { e.preventDefault(); addTag(t) }}
                  style={{ padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Tag label={t} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trash toggle button at very bottom */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => setShowTrash((v) => !v)}
          style={{
            ...btnStyle, width: '100%', padding: '6px',
            background: showTrash ? 'var(--accent)' : 'var(--bg-secondary)',
            color: showTrash ? '#fff' : 'var(--text-secondary)', fontSize: '12px',
          }}
        >
          {showTrash ? '← 返回笔记' : `🗑 垃圾桶${trashNotes.length > 0 ? ` (${trashNotes.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Editor ─────────────────────────────────────────────────────────────────────

function Editor({ note, onChange }: { note: Note; onChange: (updated: Partial<Note>) => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const preview = useMemo(() => renderMd(note.content), [note.content])

  const modeBtn = (mode: ViewMode, label: string) => (
    <button
      onClick={() => setViewMode(mode)}
      style={{
        border: 'none', cursor: 'pointer', borderRadius: '4px', padding: '3px 12px',
        fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
        background: viewMode === mode ? 'var(--accent)' : 'transparent',
        color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Content panes — always mounted, hidden via display:none so flex sizing is always correct */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <textarea
          value={note.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={'在这里输入内容（支持 Markdown）...\n\n# 标题\n**粗体** *斜体*\n- 列表项\n```代码块```'}
          spellCheck={false}
          style={{
            display: viewMode === 'preview' ? 'none' : undefined,
            flex: 1, minWidth: 0, resize: 'none', border: 'none', outline: 'none',
            padding: '20px 24px', overflow: 'auto',
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: '13px', lineHeight: '1.75', background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            borderRight: viewMode === 'split' ? '1px solid var(--border)' : 'none',
          }}
        />
        <div
          className="md-preview"
          style={{
            display: viewMode === 'edit' ? 'none' : undefined,
            flex: 1, minWidth: 0, overflow: 'auto',
            padding: '20px 24px', background: 'var(--bg-secondary)',
          }}
          dangerouslySetInnerHTML={{ __html: preview || '<p style="opacity:0.4;margin:0">预览将显示在这里…</p>' }}
        />
      </div>

      {/* Mode toggle — slim bar at the very bottom, spans full right width */}
      <div style={{
        height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', gap: '1px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px' }}>
          {modeBtn('edit', '编辑')}
          {modeBtn('split', '分屏')}
          {modeBtn('preview', '预览')}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotesTool() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.electronAPI?.notes?.list().then((all) => {
      const sorted = [...all].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      })
      setNotes(sorted)
      if (sorted.length > 0) setSelectedId(sorted[0].id)
      setLoaded(true)
    }).catch(console.error) ?? setLoaded(true)
  }, [])

  const scheduleSave = useCallback((note: Note) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      window.electronAPI?.notes?.save(note)
    }, 800)
  }, [])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const updated = prev.map((n) => {
        if (n.id !== id) return n
        const next: Note = { ...n, ...patch, updatedAt: Date.now() }
        scheduleSave(next)
        return next
      })
      return [...updated].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      })
    })
  }, [scheduleSave])

  const createNote = useCallback(() => {
    const note = newNote()
    window.electronAPI?.notes?.save(note)
    setNotes((prev) => [note, ...prev])
    setSelectedId(note.id)
    setFilterTag(null)
  }, [])

  // Soft delete — move to trash
  const deleteNote = useCallback((id: string) => {
    updateNote(id, { deleted: true, pinned: false })
    setNotes((prev) => {
      const alive = prev.filter((n) => n.id !== id || n.deleted)
      const aliveActive = alive.filter((n) => !n.deleted)
      setSelectedId(aliveActive.length > 0 ? aliveActive[0].id : null)
      return prev.map((n) => n.id === id ? { ...n, deleted: true, pinned: false } : n)
    })
  }, [updateNote])

  // Restore from trash
  const restoreNote = useCallback((id: string) => {
    updateNote(id, { deleted: false })
  }, [updateNote])

  // Permanent delete
  const permanentDeleteNote = useCallback((id: string) => {
    window.electronAPI?.notes?.delete(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Empty trash
  const emptyTrash = useCallback(() => {
    setNotes((prev) => {
      prev.filter((n) => n.deleted).forEach((n) => window.electronAPI?.notes?.delete(n.id))
      return prev.filter((n) => !n.deleted)
    })
  }, [])

  const activeNotes = useMemo(() => notes.filter((n) => !n.deleted), [notes])
  const trashNotes  = useMemo(() => notes.filter((n) => n.deleted), [notes])

  const visibleNotes = useMemo(() => {
    const base = activeNotes
    if (!filterTag) return base
    return base.filter((n) => n.tags.includes(filterTag))
  }, [activeNotes, filterTag])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    activeNotes.forEach((n) => n.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [activeNotes])

  const selectedNote = activeNotes.find((n) => n.id === selectedId) ?? null

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {sidebarCollapsed && <ExpandHandle onExpand={() => setSidebarCollapsed(false)} />}

      {!sidebarCollapsed && (
        <Sidebar
          notes={visibleNotes}
          trashNotes={trashNotes}
          selected={selectedId}
          selectedNote={selectedNote}
          filterTag={filterTag}
          allTags={allTags}
          onSelect={setSelectedId}
          onCreate={createNote}
          onFilterTag={setFilterTag}
          onPin={(id, pinned) => updateNote(id, { pinned })}
          onDelete={deleteNote}
          onRename={(id, title) => updateNote(id, { title })}
          onTagsChange={(id, tags) => updateNote(id, { tags })}
          onRestore={restoreNote}
          onPermanentDelete={permanentDeleteNote}
          onEmptyTrash={emptyTrash}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      )}

      {selectedNote && (
        <Editor
          note={selectedNote}
          onChange={(patch) => updateNote(selectedNote.id, patch)}
        />
      )}
      {!selectedNote && <div style={{ flex: 1 }} />}
    </div>
  )
}
