import { useState } from 'react'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

interface NodeProps {
  nodeKey?: string | number
  value: JsonValue
  isLast: boolean
  depth: number
}

const C = {
  key: '#60a5fa',
  string: '#4ade80',
  number: '#fb923c',
  bool: '#a78bfa',
  null: '#a78bfa',
  bracket: 'var(--text-secondary)',
  colon: 'var(--text-secondary)',
}

function PrimitiveValue({ value }: { value: string | number | boolean | null }) {
  if (value === null) return <span style={{ color: C.null }}>null</span>
  if (typeof value === 'boolean')
    return <span style={{ color: C.bool }}>{String(value)}</span>
  if (typeof value === 'number')
    return <span style={{ color: C.number }}>{value}</span>
  return (
    <span style={{ color: C.string }}>
      &quot;{String(value).replace(/</g, '&lt;')}&quot;
    </span>
  )
}

function KeyLabel({ nodeKey }: { nodeKey: string | number }) {
  return (
    <>
      <span style={{ color: C.key }}>
        {typeof nodeKey === 'string' ? `"${nodeKey}"` : nodeKey}
      </span>
      <span style={{ color: C.colon }}>: </span>
    </>
  )
}

function JsonNode({ nodeKey, value, isLast, depth }: NodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  const indent = depth * 20
  const comma = !isLast ? <span style={{ color: C.bracket }}>,</span> : null

  // Primitive
  if (value === null || typeof value !== 'object') {
    return (
      <div style={{ paddingLeft: indent, lineHeight: '1.75' }}>
        {nodeKey !== undefined && <KeyLabel nodeKey={nodeKey} />}
        <PrimitiveValue value={value as string | number | boolean | null} />
        {comma}
      </div>
    )
  }

  // Object or Array
  const isArray = Array.isArray(value)
  const entries: [string | number, JsonValue][] = isArray
    ? (value as JsonValue[]).map((v, i) => [i, v])
    : Object.entries(value as Record<string, JsonValue>)

  const openBr = isArray ? '[' : '{'
  const closeBr = isArray ? ']' : '}'
  const count = entries.length
  const label = isArray
    ? `${count} ${count === 1 ? 'item' : 'items'}`
    : `${count} ${count === 1 ? 'key' : 'keys'}`

  if (count === 0) {
    return (
      <div style={{ paddingLeft: indent, lineHeight: '1.75' }}>
        {nodeKey !== undefined && <KeyLabel nodeKey={nodeKey} />}
        <span style={{ color: C.bracket }}>
          {openBr}{closeBr}
        </span>
        {comma}
      </div>
    )
  }

  return (
    <>
      <div
        style={{ paddingLeft: indent, lineHeight: '1.75', cursor: 'pointer' }}
        onClick={() => setExpanded((e) => !e)}
        className="hover:opacity-80 select-none"
      >
        {nodeKey !== undefined && <KeyLabel nodeKey={nodeKey} />}
        <span
          style={{
            color: C.bracket,
            fontSize: '0.6rem',
            marginRight: '5px',
            verticalAlign: 'middle',
          }}
        >
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ color: C.bracket }}>{openBr}</span>
        {!expanded && (
          <>
            <span
              style={{
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                fontSize: '0.75rem',
                margin: '0 6px',
              }}
            >
              {label}
            </span>
            <span style={{ color: C.bracket }}>{closeBr}</span>
            {comma}
          </>
        )}
      </div>

      {expanded && (
        <>
          {entries.map(([k, v], idx) => (
            <JsonNode
              key={String(k)}
              nodeKey={isArray ? undefined : k}
              value={v}
              isLast={idx === entries.length - 1}
              depth={depth + 1}
            />
          ))}
          <div style={{ paddingLeft: indent, lineHeight: '1.75' }}>
            <span style={{ color: C.bracket }}>{closeBr}</span>
            {comma}
          </div>
        </>
      )}
    </>
  )
}

export default function JsonTreeView({ data }: { data: JsonValue }) {
  return (
    <div
      className="font-mono text-sm h-full overflow-auto p-3"
      style={{ color: 'var(--text-primary)' }}
    >
      <JsonNode value={data} isLast={true} depth={0} />
    </div>
  )
}
