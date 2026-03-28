import { useState, useEffect } from 'react'
import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'

// ── Types ──────────────────────────────────────────────────────────────────

interface Poem {
  id: number
  num: string
  title: string
  date: string
  excerpt: string
  lines: string[]
}

type LikesMap = Record<number, number>

// ── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  ink:    '#1a1410',
  paper:  '#f5f0e8',
  aged:   '#e8dfc8',
  candle: '#c8a45a',
  dim:    '#7a6e5f',
} as const

// ── Poem data ──────────────────────────────────────────────────────────────

const poems: Poem[] = [
  {
    id: 1,
    num: '001',
    title: 'The Room Without Windows',
    date: 'Oct 2024',
    excerpt: 'I have built a room inside my chest— no windows, no door that lets light linger…',
    lines: [
      'I have built a room inside my chest—',
      'no windows, no door that lets light linger,',
      'only the sound of my own breathing',
      'folding into the walls like a prayer',
      'no one asked for.',
      '',
      'The dark here is not absence.',
      'It is a presence that stays.',
    ],
  },
  {
    id: 2,
    num: '002',
    title: 'Cartography of Loss',
    date: 'Sep 2024',
    excerpt: 'You mapped yourself onto the inside of my ribs and I have been walking crooked since…',
    lines: [
      'You mapped yourself onto the inside of my ribs',
      'and I have been walking crooked since,',
      'tilting toward where you used to stand,',
      'finding nothing but the shape of air',
      'that learned your outline.',
      '',
      'I carry the country of you',
      'without a compass.',
    ],
  },
  {
    id: 3,
    num: '003',
    title: 'On Being Afraid of the Light',
    date: 'Aug 2024',
    excerpt: 'It is not the dark that frightens me. It is morning—its indifferent arrival…',
    lines: [
      'It is not the dark that frightens me.',
      'It is morning—its indifferent arrival,',
      'the sun asking questions',
      'I have not yet learned how to answer.',
      '',
      'At least the night',
      'does not expect me to be whole.',
    ],
  },
  {
    id: 4,
    num: '004',
    title: 'Ode to the Hour Before Sleep',
    date: 'Jul 2024',
    excerpt: 'This is when the grief becomes grammatical, when every sentence begins with once…',
    lines: [
      'This is when the grief becomes grammatical—',
      'when every sentence begins with once',
      'and ends before it should.',
      '',
      'I speak to ceilings here.',
      'I confess to shadows.',
      'I rehearse the apologies',
      'I will never deliver.',
    ],
  },
  {
    id: 5,
    num: '005',
    title: 'Inheritance',
    date: 'Jun 2024',
    excerpt: 'My mother taught me silence the way others teach religion—daily, on both knees…',
    lines: [
      'My mother taught me silence',
      'the way others teach religion—',
      'daily, on both knees,',
      'with reverence and consequence.',
      '',
      'I have worshipped at its altar',
      'longer than I have spoken.',
      'It is the only tongue',
      'I know by heart.',
    ],
  },
  {
    id: 6,
    num: '006',
    title: 'Self-Portrait as a Closed Door',
    date: 'May 2024',
    excerpt: 'I have practiced the art of staying shut. Of letting the knocking pass through me like weather…',
    lines: [
      'I have practiced the art of staying shut.',
      'Of letting the knocking pass through me like weather.',
      'Of convincing the wood of my body',
      'that it does not want to open.',
      '',
      'Some rooms are not ready',
      'to be entered.',
      'Some of us are still',
      'learning to be a room at all.',
    ],
  },
]

// ── localStorage — tracks which poems THIS visitor liked ───────────────────

const LIKED_KEY = 'poetry-site:liked'

function loadLiked(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]')) } catch { return new Set() }
}

function saveLiked(liked: Set<number>) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...liked]))
}

// ── useLikes — reads from Firebase, writes to Firebase ────────────────────

function useLikes() {
  const [likes, setLikes] = useState<LikesMap>({})
  const [liked, setLiked] = useState<Set<number>>(loadLiked)

  // Load all like counts from Firestore on mount
  useEffect(() => {
    poems.forEach(async (poem) => {
      const ref = doc(db, 'likes', String(poem.id))
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setLikes(prev => ({ ...prev, [poem.id]: snap.data().count ?? 0 }))
      } else {
        // Document doesn't exist yet — create it with count 0
        await setDoc(ref, { count: 0 })
        setLikes(prev => ({ ...prev, [poem.id]: 0 }))
      }
    })
  }, [])

  const toggle = async (id: number) => {
    const isLiked = liked.has(id)
    const ref = doc(db, 'likes', String(id))

    // Update Firestore count
    await updateDoc(ref, {
      count: increment(isLiked ? -1 : 1)
    })

    // Update local like counts display
    setLikes(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1))
    }))

    // Update which poems this visitor has liked (stored in localStorage)
    setLiked(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(id) : next.add(id)
      saveLiked(next)
      return next
    })
  }

  return { likes, liked, toggle }
}

// ── HeartIcon ──────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// ── LikeButton ─────────────────────────────────────────────────────────────

interface LikeButtonProps {
  poemId: number
  count: number
  isLiked: boolean
  onToggle: (id: number) => void
}

function LikeButton({ poemId, count, isLiked, onToggle }: LikeButtonProps) {
  const [popping, setPopping] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLiked) {
      setPopping(true)
      setTimeout(() => setPopping(false), 380)
    }
    onToggle(poemId)
  }

  return (
    <button
      className={`like-btn${isLiked ? ' liked' : ''}${popping ? ' pop' : ''}`}
      onClick={handleClick}
      title={isLiked ? 'Unlike this poem' : 'Like this poem'}
    >
      <HeartIcon filled={isLiked} />
      <span>{count > 0 ? count : ''}</span>
    </button>
  )
}

// ── PoemLines ──────────────────────────────────────────────────────────────

function PoemLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) =>
        line ? <p key={i}>{line}</p> : <br key={i} />
      )}
    </>
  )
}

// ── PoemModal ──────────────────────────────────────────────────────────────

interface PoemModalProps {
  poem: Poem
  likeCount: number
  isLiked: boolean
  onToggleLike: (id: number) => void
  onClose: () => void
}

function PoemModal({ poem, likeCount, isLiked, onToggleLike, onClose }: PoemModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <span style={{
          fontFamily: "'Inconsolata', monospace", fontSize: '0.62rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: COLORS.candle, opacity: 0.7, display: 'block', marginBottom: '1rem',
        }}>
          {poem.num} · {poem.date}
        </span>
        <div style={{
          fontFamily: "'IM Fell English', serif", fontSize: '1.8rem',
          fontStyle: 'italic', color: COLORS.paper, marginBottom: '1.5rem',
        }}>
          {poem.title}
        </div>
        <div style={{ fontSize: '1rem', lineHeight: 2.1, color: COLORS.aged }}>
          <PoemLines lines={poem.lines} />
        </div>
        <div style={{
          marginTop: '2rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <LikeButton
            poemId={poem.id}
            count={likeCount}
            isLiked={isLiked}
            onToggle={onToggleLike}
          />
          <span style={{
            fontFamily: "'Inconsolata', monospace", fontSize: '0.68rem',
            letterSpacing: '0.15em', color: COLORS.dim,
          }}>
            — Your Name
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Archive (default export) ───────────────────────────────────────────────

export default function Archive() {
  const [selected, setSelected] = useState<Poem | null>(null)
  const { likes, liked, toggle } = useLikes()

  return (
    <section style={{ minHeight: '100vh', padding: '8rem 2rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 style={{
          fontFamily: "'IM Fell English', serif", fontSize: '2.5rem',
          fontStyle: 'italic', color: COLORS.paper, marginBottom: '0.5rem',
        }}>
          The Archive
        </h2>
        <p style={{
          fontFamily: "'Inconsolata', monospace", fontSize: '0.7rem',
          letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.dim,
        }}>
          All poems · Sorted by shadow
        </p>
      </div>

      <div className="archive-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
      }}>
        {poems.map((poem, idx) => (
          <div
            key={poem.id}
            className="poem-card fade-up"
            onClick={() => setSelected(poem)}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className="card-bar" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 2, background: COLORS.candle,
              transform: 'scaleX(0)', transformOrigin: 'left',
              transition: 'transform 0.4s ease',
            }} />
            <div style={{
              fontFamily: "'Inconsolata', monospace", fontSize: '0.62rem',
              color: COLORS.candle, opacity: 0.5,
              letterSpacing: '0.1em', marginBottom: '0.8rem',
            }}>
              {poem.num}
            </div>
            <div style={{
              fontFamily: "'IM Fell English', serif", fontSize: '1.3rem',
              fontStyle: 'italic', color: COLORS.paper, marginBottom: '0.8rem',
            }}>
              {poem.title}
            </div>
            <div style={{
              fontSize: '0.88rem', lineHeight: 1.9,
              color: COLORS.dim, fontStyle: 'italic',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {poem.excerpt}
            </div>
            <div style={{
              marginTop: '1.2rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: "'Inconsolata', monospace", fontSize: '0.62rem',
              letterSpacing: '0.12em', color: 'rgba(122,110,95,0.5)', textTransform: 'uppercase',
            }}>
              <span>{poem.date}</span>
              <LikeButton
                poemId={poem.id}
                count={likes[poem.id] ?? 0}
                isLiked={liked.has(poem.id)}
                onToggle={toggle}
              />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <PoemModal
          poem={selected}
          likeCount={likes[selected.id] ?? 0}
          isLiked={liked.has(selected.id)}
          onToggleLike={toggle}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
