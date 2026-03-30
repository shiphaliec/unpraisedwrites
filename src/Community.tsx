import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
} from 'firebase/firestore'

// ── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  ink:    '#1a1410',
  paper:  '#f5f0e8',
  aged:   '#e8dfc8',
  candle: '#c8a45a',
  dim:    '#7a6e5f',
  surface:'#1e1810',
} as const

// ── Owner password ─────────────────────────────────────────────────────────
const OWNER_PASSWORD = 'versesinthedark'

// ── localStorage helpers ───────────────────────────────────────────────────

const DELETE_KEYS_KEY  = 'community:delete-keys'
const LIKED_POEMS_KEY  = 'community:liked'

function loadDeleteKeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DELETE_KEYS_KEY) ?? '{}') } catch { return {} }
}

function saveDeleteKeys(keys: Record<string, string>) {
  localStorage.setItem(DELETE_KEYS_KEY, JSON.stringify(keys))
}

function loadLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_POEMS_KEY) ?? '[]')) } catch { return new Set() }
}

function saveLiked(liked: Set<string>) {
  localStorage.setItem(LIKED_POEMS_KEY, JSON.stringify([...liked]))
}

function generateKey(): string {
  return Math.random().toString(36).slice(2, 12).toUpperCase()
}

// ── Types ──────────────────────────────────────────────────────────────────

interface CommunityPoem {
  id:        string
  title:     string
  name:      string
  lines:     string[]
  createdAt: Timestamp
  deleteKey: string
  likes:     number
}

// ── useCommunityPoems hook ─────────────────────────────────────────────────

function useCommunityPoems() {
  const [poems,      setPoems]      = useState<CommunityPoem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [deleteKeys, setDeleteKeys] = useState<Record<string, string>>(loadDeleteKeys)
  const [liked,      setLiked]      = useState<Set<string>>(loadLiked)

  useEffect(() => {
    const q = query(collection(db, 'communityPoems'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setPoems(snap.docs.map(d => ({ id: d.id, likes: 0, ...d.data() } as CommunityPoem)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const postPoem = async (
    title: string,
    name: string,
    lines: string[]
  ): Promise<string> => {
    const key = generateKey()
    const ref = await addDoc(collection(db, 'communityPoems'), {
      title,
      name:      name.trim(),
      lines,
      createdAt: Timestamp.now(),
      deleteKey: key,
      likes:     0,
    })
    // Save delete key in localStorage
    const updated = { ...deleteKeys, [ref.id]: key }
    setDeleteKeys(updated)
    saveDeleteKeys(updated)
    return key
  }

  const deletePoem = async (id: string) => {
    await deleteDoc(doc(db, 'communityPoems', id))
    const updated = { ...deleteKeys }
    delete updated[id]
    setDeleteKeys(updated)
    saveDeleteKeys(updated)
  }

  const toggleLike = async (id: string) => {
    const isLiked = liked.has(id)
    const ref = doc(db, 'communityPoems', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    if (snap.data().likes === undefined) {
      await setDoc(ref, { likes: 0 }, { merge: true })
    }
    await updateDoc(ref, { likes: increment(isLiked ? -1 : 1) })
    setLiked(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(id) : next.add(id)
      saveLiked(next)
      return next
    })
  }

  const canDelete = (id: string, poemKey: string): boolean => {
    return deleteKeys[id] === poemKey
  }

  return { poems, loading, postPoem, deletePoem, toggleLike, liked, canDelete }
}

// ── HeartIcon ──────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// ── RulesModal ─────────────────────────────────────────────────────────────

function RulesModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const [checked, setChecked] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,8,6,0.93)',
      zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        background: '#1e1810',
        border: '1px solid rgba(200,164,90,0.2)',
        maxWidth: 500, width: '100%',
        padding: '2.5rem',
        animation: 'fadeUp 0.3s ease',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '1.5rem', fontStyle: 'italic',
          color: COLORS.paper, marginBottom: '0.3rem',
        }}>
          Before You Post
        </div>
        <div style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: '0.62rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: COLORS.dim,
          marginBottom: '1.8rem',
        }}>
          Please read carefully
        </div>

        {/* Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {[
            'Your poem will be visible to all visitors of this site.',
            'After posting you will receive a secret delete key. Save it — it is the only way to delete your poem later.',
            'If you lose your delete key, your poem can only be removed by the site owner.',
            'Do not post content that is offensive, plagiarised, or does not belong to you.',
            'The site owner reserves the right to remove any poem at any time without notice.',
          ].map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '0.65rem', color: COLORS.candle,
                opacity: 0.6, flexShrink: 0, marginTop: '0.15rem',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p style={{
                fontSize: '0.95rem', lineHeight: 1.8,
                color: COLORS.aged,
              }}>
                {rule}
              </p>
            </div>
          ))}
        </div>

        {/* Checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start',
          gap: '0.8rem', cursor: 'pointer',
          marginBottom: '2rem',
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{
              marginTop: '0.2rem', width: 16, height: 16,
              accentColor: COLORS.candle, cursor: 'pointer', flexShrink: 0,
            }}
          />
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '0.95rem', lineHeight: 1.7,
            color: COLORS.paper, fontStyle: 'italic',
          }}>
            I have read and understood the rules above
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={onCancel}
            style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.68rem', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: COLORS.dim,
              background: 'none',
              border: '1px solid rgba(122,110,95,0.25)',
              padding: '0.7rem 1.5rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.68rem', letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: checked ? COLORS.candle : COLORS.dim,
              background: 'none',
              border: `1px solid ${checked ? 'rgba(200,164,90,0.4)' : 'rgba(200,164,90,0.1)'}`,
              padding: '0.7rem 1.5rem',
              cursor: checked ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
            }}
          >
            Post my poem →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KeyModal ───────────────────────────────────────────────────────────────

function KeyModal({
  deleteKey,
  onDone,
}: {
  deleteKey: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(deleteKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,8,6,0.93)',
      zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        background: '#1e1810',
        border: '1px solid rgba(200,164,90,0.2)',
        maxWidth: 420, width: '100%',
        padding: '2.5rem',
        textAlign: 'center',
        animation: 'fadeUp 0.3s ease',
      }}>
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '1.5rem', fontStyle: 'italic',
          color: COLORS.paper, marginBottom: '0.5rem',
        }}>
          Your poem has been posted
        </div>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '0.95rem', fontStyle: 'italic',
          color: COLORS.dim, marginBottom: '2rem', lineHeight: 1.7,
        }}>
          Save your secret delete key below. It will not be shown again.
        </p>

        {/* Key box */}
        <div style={{
          background: 'rgba(200,164,90,0.06)',
          border: '1px solid rgba(200,164,90,0.25)',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          letterSpacing: '0.25em',
          fontFamily: "'Inconsolata', monospace",
          fontSize: '1.3rem',
          color: COLORS.candle,
        }}>
          {deleteKey}
        </div>

        <p style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: '0.62rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: COLORS.dim,
          marginBottom: '1.8rem',
        }}>
          Keep this key safe — losing it means you cannot delete your poem
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopy}
            style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.68rem', letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: copied ? COLORS.candle : COLORS.dim,
              background: 'none',
              border: `1px solid ${copied ? 'rgba(200,164,90,0.4)' : 'rgba(122,110,95,0.25)'}`,
              padding: '0.7rem 1.5rem', cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {copied ? 'Copied ✓' : 'Copy key'}
          </button>
          <button
            onClick={onDone}
            style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.68rem', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: COLORS.candle,
              background: 'none',
              border: '1px solid rgba(200,164,90,0.35)',
              padding: '0.7rem 1.5rem', cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PoemViewModal ──────────────────────────────────────────────────────────

function PoemViewModal({
  poem,
  isLiked,
  canDelete,
  onLike,
  onDelete,
  onClose,
}: {
  poem: CommunityPoem
  isLiked: boolean
  canDelete: boolean
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        <span style={{
          fontFamily: "'Inconsolata', monospace", fontSize: '0.62rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: COLORS.candle, opacity: 0.7, display: 'block', marginBottom: '1rem',
        }}>
          Community · {poem.createdAt?.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        <div style={{
          fontFamily: "'IM Fell English', serif", fontSize: '1.8rem',
          fontStyle: 'italic', color: COLORS.paper, marginBottom: '0.4rem',
        }}>
          {poem.title}
        </div>

        <div style={{
          fontFamily: "'Inconsolata', monospace", fontSize: '0.65rem',
          letterSpacing: '0.12em', color: COLORS.dim,
          marginBottom: '1.5rem', textTransform: 'uppercase',
        }}>
          by {poem.name || 'Anonymous'}
        </div>

        <div style={{ fontSize: '1rem', lineHeight: 2.1, color: COLORS.aged }}>
          {poem.lines.map((line, i) =>
            line ? <p key={i}>{line}</p> : <br key={i} />
          )}
        </div>

        {/* Footer row */}
        <div style={{
          marginTop: '2rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.8rem',
        }}>
          {/* Like button */}
          <button
            onClick={() => onLike(poem.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: isLiked ? '#c87a7a' : COLORS.dim,
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.65rem', letterSpacing: '0.08em',
              transition: 'color 0.2s', padding: 0,
            }}
          >
            <HeartIcon filled={isLiked} />
            {poem.likes > 0 && <span>{poem.likes}</span>}
          </button>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {/* Delete button — only for poster or owner */}
            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Delete your poem? This cannot be undone.')) {
                    onDelete(poem.id)
                    onClose()
                  }
                }}
                style={{
                  fontFamily: "'Inconsolata', monospace",
                  fontSize: '0.62rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#c87a7a',
                  background: 'none',
                  border: '1px solid rgba(200,100,100,0.3)',
                  padding: '0.3rem 0.8rem', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
            <span style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.68rem', letterSpacing: '0.15em', color: COLORS.dim,
            }}>
              — {poem.name || 'Anonymous'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PostForm ───────────────────────────────────────────────────────────────

function PostForm({ onPost }: { onPost: (title: string, name: string, lines: string[]) => Promise<string> }) {
  const [title,       setTitle]       = useState('')
  const [name,        setName]        = useState('')
  const [text,        setText]        = useState('')
  const [showRules,   setShowRules]   = useState(false)
  const [showKey,     setShowKey]     = useState(false)
  const [generatedKey,setGeneratedKey]= useState('')
  const [posting,     setPosting]     = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(200,164,90,0.18)', color: COLORS.paper,
    fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
    padding: '0.75rem 1rem', outline: 'none', borderRadius: 0,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inconsolata', monospace", fontSize: '0.65rem',
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: COLORS.candle, opacity: 0.7, display: 'block', marginBottom: '0.4rem',
  }

  const disabled = !title.trim() || !name.trim() || !text.trim() || posting

  const handleSubmitClick = () => {
    if (disabled) return
    setShowRules(true)
  }

  const handleConfirmPost = async () => {
    setShowRules(false)
    setPosting(true)
    const lines = text.split('\n')
    const key = await onPost(title, name, lines)
    setGeneratedKey(key)
    setTitle(''); setName(''); setText('')
    setPosting(false)
    setShowKey(true)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

        <div>
          <span style={labelStyle}>Poem title</span>
          <input type="text" placeholder="Title of your poem"
            value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} />
        </div>

        <div>
          <span style={labelStyle}>Your name</span>
          <input type="text" placeholder="Your name or pen name"
            value={name} onChange={e => setName(e.target.value)}
            style={inputStyle} />
        </div>

        <div>
          <span style={labelStyle}>Your poem</span>
          <textarea
            placeholder={'Write your poem here…\nEach line on a new line.\nLeave a blank line between stanzas.'}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 2 }}
          />
        </div>

        <button
          onClick={handleSubmitClick}
          disabled={disabled}
          style={{
            alignSelf: 'flex-start',
            fontFamily: "'Inconsolata', monospace",
            fontSize: '0.7rem', letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: disabled ? COLORS.dim : COLORS.candle,
            background: 'none',
            border: `1px solid ${disabled ? 'rgba(200,164,90,0.1)' : 'rgba(200,164,90,0.35)'}`,
            padding: '0.75rem 2rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {posting ? 'Posting…' : 'Submit poem →'}
        </button>
      </div>

      {showRules && (
        <RulesModal
          onCancel={() => setShowRules(false)}
          onConfirm={handleConfirmPost}
        />
      )}

      {showKey && (
        <KeyModal
          deleteKey={generatedKey}
          onDone={() => setShowKey(false)}
        />
      )}
    </>
  )
}

// ── PoemCard ───────────────────────────────────────────────────────────────

function PoemCard({
  poem,
  isLiked,
  canDelete,
  onLike,
  onDelete,
  onClick,
}: {
  poem: CommunityPoem
  isLiked: boolean
  canDelete: boolean
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onClick: (poem: CommunityPoem) => void
}) {
  return (
    <div
      className="poem-card"
      onClick={() => onClick(poem)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-bar" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: COLORS.candle,
        transform: 'scaleX(0)', transformOrigin: 'left',
        transition: 'transform 0.4s ease',
      }} />

      {/* Title */}
      <div style={{
        fontFamily: "'IM Fell English', serif", fontSize: '1.2rem',
        fontStyle: 'italic', color: COLORS.paper, marginBottom: '0.3rem',
      }}>
        {poem.title}
      </div>

      {/* Author */}
      <div style={{
        fontFamily: "'Inconsolata', monospace", fontSize: '0.6rem',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: COLORS.candle, opacity: 0.6, marginBottom: '0.9rem',
      }}>
        by {poem.name || 'Anonymous'}
      </div>

      {/* Preview lines — first 4 */}
      <div style={{
        fontSize: '0.88rem', lineHeight: 1.9, color: COLORS.dim,
        fontStyle: 'italic',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
      }}>
        {poem.lines.filter(l => l).slice(0, 4).join('\n')}
      </div>

      {/* Bottom row */}
      <div style={{
        marginTop: '1.2rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        fontFamily: "'Inconsolata', monospace", fontSize: '0.6rem',
        letterSpacing: '0.1em', color: 'rgba(122,110,95,0.5)',
        textTransform: 'uppercase',
      }}>
        <span>
          {poem.createdAt?.toDate().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Like */}
          <button
            onClick={e => { e.stopPropagation(); onLike(poem.id) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: isLiked ? '#c87a7a' : COLORS.dim,
              fontFamily: "'Inconsolata', monospace",
              fontSize: '0.6rem', padding: 0,
              transition: 'color 0.2s',
            }}
          >
            <HeartIcon filled={isLiked} />
            {poem.likes > 0 && <span>{poem.likes}</span>}
          </button>

          {/* Delete — only visible to poster or owner */}
          {canDelete && (
            <button
              onClick={e => {
                e.stopPropagation()
                if (window.confirm('Delete your poem? This cannot be undone.')) {
                  onDelete(poem.id)
                }
              }}
              style={{
                background: 'none',
                border: '1px solid rgba(200,100,100,0.3)',
                color: '#c87a7a',
                fontFamily: "'Inconsolata', monospace",
                fontSize: '0.55rem', letterSpacing: '0.1em',
                padding: '0.15rem 0.5rem', cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Community (default export) ─────────────────────────────────────────────

export default function Community() {
  const {
    poems, loading, postPoem,
    deletePoem, toggleLike, liked, canDelete,
  } = useCommunityPoems()

  const [selected,   setSelected]   = useState<CommunityPoem | null>(null)
  const [ownerMode,  setOwnerMode]  = useState(false)

  // Owner mode via Ctrl + Shift + O
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        const pass = prompt('Enter owner password:')
        if (pass === OWNER_PASSWORD) setOwnerMode(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <section style={{ minHeight: '100vh', padding: '8rem 2rem 5rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Heading */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 style={{
          fontFamily: "'IM Fell English', serif", fontSize: '2.5rem',
          fontStyle: 'italic', color: COLORS.paper, marginBottom: '0.5rem',
        }}>
          Community Poems
        </h2>
        <p style={{
          fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
          letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.dim,
        }}>
          Written by readers · Share your voice
        </p>
        {ownerMode && (
          <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.62rem', color: '#c87a7a', letterSpacing: '0.12em' }}>
              [owner mode active]
            </span>
            <button
              onClick={() => setOwnerMode(false)}
              style={{
                background: 'none', border: '1px solid rgba(200,100,100,0.25)',
                color: '#c87a7a', fontFamily: "'Inconsolata', monospace",
                fontSize: '0.58rem', letterSpacing: '0.1em',
                padding: '0.2rem 0.6rem', cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Exit
            </button>
          </div>
        )}
      </div>

      {/* Two column layout — form left, poems right */}
      <div className="community-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: '3.5rem',
        alignItems: 'start',
      }}>

        {/* Post form */}
        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <p style={{
            fontFamily: "'Inconsolata', monospace", fontSize: '0.65rem',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: COLORS.candle, opacity: 0.6, marginBottom: '1.5rem',
          }}>
            Share your poem
          </p>
          <PostForm onPost={postPoem} />
        </div>

        {/* Poems grid */}
        <div className="fade-up" style={{ animationDelay: '0.2s' }}>
          <p style={{
            fontFamily: "'Inconsolata', monospace", fontSize: '0.65rem',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: COLORS.candle, opacity: 0.6, marginBottom: '1.5rem',
          }}>
            From the community · {poems.length} {poems.length === 1 ? 'poem' : 'poems'}
          </p>

          {loading ? (
            <p style={{ fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem', color: COLORS.dim }}>
              Loading…
            </p>
          ) : poems.length === 0 ? (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1rem', color: COLORS.dim }}>
              No poems yet. Be the first to share one.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {poems.map(poem => (
                <PoemCard
                  key={poem.id}
                  poem={poem}
                  isLiked={liked.has(poem.id)}
                  canDelete={ownerMode || canDelete(poem.id, poem.deleteKey)}
                  onLike={toggleLike}
                  onDelete={deletePoem}
                  onClick={setSelected}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full poem modal */}
      {selected && (
        <PoemViewModal
          poem={selected}
          isLiked={liked.has(selected.id)}
          canDelete={ownerMode || canDelete(selected.id, selected.deleteKey)}
          onLike={toggleLike}
          onDelete={deletePoem}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
