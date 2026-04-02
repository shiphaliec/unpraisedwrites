import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

// ── Types (shared with Community) ─────────────────────────────────────────

export interface CommunityPoem {
  id:        string
  title:     string
  name:      string
  lines:     string[]
  createdAt: Timestamp
  deleteKey: string
  likes:     number
}

// ── Design tokens ──────────────────────────────────────────────────────────

const C = {
  surface:    '#181818',
  card:       '#1f1f1f',
  border:     'rgba(255,255,255,0.07)',
  borderHover:'rgba(255,255,255,0.14)',
  text:       '#f0f0f0',
  muted:      '#888',
  faint:      '#444',
  accent:     '#c8a45a',
  accentDim:  'rgba(200,164,90,0.12)',
  gold:       '#f5c842',
  goldDim:    'rgba(245,200,66,0.1)',
  goldBorder: 'rgba(245,200,66,0.3)',
  silver:     '#b0b8c8',
  silverDim:  'rgba(176,184,200,0.1)',
  silverBorder:'rgba(176,184,200,0.3)',
  bronze:     '#e8834a',
  bronzeDim:  'rgba(232,131,74,0.1)',
  bronzeBorder:'rgba(232,131,74,0.3)',
} as const

// ── Helpers ────────────────────────────────────────────────────────────────

function getMonthKey(): string {
  const now = new Date()
  return `votes-${now.getFullYear()}-${now.getMonth() + 1}`
}

function getVoteStorageKey(): string {
  return `starpoet:voted:${getMonthKey()}`
}

function loadMyVote(): string {
  return localStorage.getItem(getVoteStorageKey()) ?? ''
}

function saveMyVote(name: string) {
  localStorage.setItem(getVoteStorageKey(), name)
}

function getDaysLeftInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.getDate() - now.getDate()
}

function getMonthName(): string {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
}

// ── useStarPoet hook ───────────────────────────────────────────────────────

interface VoteData {
  [poetName: string]: number
}

function useStarPoet(poems: CommunityPoem[], currentUserName: string) {
  const [votes,    setVotes]    = useState<VoteData>({})
  const [myVote,   setMyVote]   = useState<string>(loadMyVote)
  const [voting,   setVoting]   = useState(false)

  const monthKey = getMonthKey()

  // Real time listener on vote document
  useEffect(() => {
    const ref = doc(db, 'votes', monthKey)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setVotes(snap.data().nominees ?? {})
      }
    })
    return () => unsub()
  }, [monthKey])

  // Get nominees — writers with 3+ poems, top 5 by poem count
  const poetCounts: Record<string, number> = {}
  poems.forEach(p => {
    if (p.name) poetCounts[p.name] = (poetCounts[p.name] ?? 0) + 1
  })

  const nominees = Object.entries(poetCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, poemCount]) => ({
      name,
      poemCount,
      voteCount: votes[name] ?? 0,
    }))

  const castVote = async (poetName: string) => {
    if (voting) return
    if (poetName === currentUserName) return // can't vote for yourself
    setVoting(true)

    const ref = doc(db, 'votes', monthKey)
    const snap = await getDoc(ref)
    const current: VoteData = snap.exists() ? (snap.data().nominees ?? {}) : {}

    // Remove previous vote if exists
    if (myVote && myVote !== poetName) {
      current[myVote] = Math.max(0, (current[myVote] ?? 1) - 1)
    }

    // Add new vote
    if (myVote !== poetName) {
      current[poetName] = (current[poetName] ?? 0) + 1
    }

    await setDoc(ref, { nominees: current }, { merge: true })

    if (myVote !== poetName) {
      setMyVote(poetName)
      saveMyVote(poetName)
    }

    setVoting(false)
  }

  // Compute badges
  const sorted = [...nominees].sort((a, b) => b.voteCount - a.voteCount)
  const starPoet    = sorted[0] ?? null
  const risingVoice = sorted[1] ?? null

  // Devoted Pen — most poems but not star or rising
  const devotedPen = nominees
    .filter(n => n.name !== starPoet?.name && n.name !== risingVoice?.name)
    .sort((a, b) => b.poemCount - a.poemCount)[0] ?? null

  return {
    nominees, votes, myVote, voting, castVote,
    starPoet, risingVoice, devotedPen,
  }
}

// ── Badge configs ──────────────────────────────────────────────────────────

const BADGES = {
  star: {
    icon: '👑',
    label: 'Star Poet',
    sub: 'Most celebrated voice this month',
    color: C.gold,
    dim: C.goldDim,
    border: C.goldBorder,
    glow: '0 0 24px rgba(245,200,66,0.18)',
  },
  rising: {
    icon: '🥈',
    label: 'Rising Voice',
    sub: 'Second most celebrated this month',
    color: C.silver,
    dim: C.silverDim,
    border: C.silverBorder,
    glow: '0 0 20px rgba(176,184,200,0.12)',
  },
  devoted: {
    icon: '🔥',
    label: 'Devoted Pen',
    sub: 'Most dedicated writer this month',
    color: C.bronze,
    dim: C.bronzeDim,
    border: C.bronzeBorder,
    glow: '0 0 20px rgba(232,131,74,0.12)',
  },
}

// ── AnimatedNumber ─────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    let start = display
    const end = value
    if (start === end) return
    const step = end > start ? 1 : -1
    const timer = setInterval(() => {
      start += step
      setDisplay(start)
      if (start === end) clearInterval(timer)
    }, 40)
    return () => clearInterval(timer)
  }, [value])

  return <span>{display}</span>
}

// ── NomineeCard ────────────────────────────────────────────────────────────

function NomineeCard({
  nominee, rank, isVoted, isSelf, onVote, voting,
}: {
  nominee: { name: string; poemCount: number; voteCount: number }
  rank: number
  isVoted: boolean
  isSelf: boolean
  onVote: (name: string) => void
  voting: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const totalVotes = nominee.voteCount
  const pct = totalVotes === 0 ? 0 : Math.min(100, Math.round((totalVotes / Math.max(totalVotes, 1)) * 100))

  const rankColors = ['#f5c842', '#b0b8c8', '#e8834a', C.accent, C.accent]
  const rankColor = rankColors[rank] ?? C.accent

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isVoted ? `rgba(200,164,90,0.06)` : C.card,
        border: `1px solid ${isVoted ? 'rgba(200,164,90,0.3)' : hovered ? C.borderHover : C.border}`,
        borderRadius: 12,
        padding: '1.2rem',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: isVoted ? '0 0 16px rgba(200,164,90,0.1)' : 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.9rem' }}>
        {/* Rank */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${rankColor}18`,
          border: `1px solid ${rankColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 600, color: rankColor, flexShrink: 0,
        }}>
          {rank + 1}
        </div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.95rem', fontWeight: 500, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {nominee.name}
            {isSelf && (
              <span style={{ fontSize: '0.65rem', color: C.muted, marginLeft: '0.4rem' }}>(you)</span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.1rem' }}>
            {nominee.poemCount} {nominee.poemCount === 1 ? 'poem' : 'poems'}
          </div>
        </div>

        {/* Vote count */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.accent }}>
            <AnimatedNumber value={nominee.voteCount} />
          </div>
          <div style={{ fontSize: '0.65rem', color: C.faint }}>votes</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: 'rgba(255,255,255,0.06)',
        borderRadius: 2, marginBottom: '1rem', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: isVoted
            ? `linear-gradient(90deg, ${C.accent}, #f5c842)`
            : `rgba(255,255,255,0.15)`,
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Vote button */}
      <button
        onClick={() => !isSelf && !voting && onVote(nominee.name)}
        disabled={isSelf || voting}
        style={{
          width: '100%', padding: '0.55rem',
          borderRadius: 8, fontSize: '0.78rem',
          fontFamily: 'inherit', cursor: isSelf ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          fontWeight: isVoted ? 500 : 400,
          background: isVoted
            ? C.accent
            : hovered && !isSelf
              ? 'rgba(200,164,90,0.1)'
              : 'transparent',
          border: `1px solid ${isVoted ? C.accent : isSelf ? C.faint : 'rgba(200,164,90,0.25)'}`,
          color: isVoted ? '#1a1410' : isSelf ? C.faint : C.accent,
        }}
      >
        {isSelf ? 'Cannot vote for yourself' : isVoted ? '✓ Voted' : 'Vote'}
      </button>
    </div>
  )
}

// ── BadgeCard ──────────────────────────────────────────────────────────────

function BadgeCard({
  badge, poet,
}: {
  badge: typeof BADGES.star
  poet: { name: string; poemCount: number; voteCount: number } | null
}) {
  const [hovered, setHovered] = useState(false)

  if (!poet) {
    return (
      <div style={{
        background: C.card, border: `1px dashed ${C.border}`,
        borderRadius: 12, padding: '1.4rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.4rem', opacity: 0.5,
      }}>
        <div style={{ fontSize: '1.5rem', opacity: 0.4 }}>{badge.icon}</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: C.muted }}>{badge.label}</div>
        <div style={{ fontSize: '0.72rem', color: C.faint, textAlign: 'center' }}>
          Awaiting votes…
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: badge.dim,
        border: `1px solid ${hovered ? badge.color : badge.border}`,
        borderRadius: 12, padding: '1.4rem',
        transition: 'all 0.3s',
        boxShadow: hovered ? badge.glow : 'none',
        cursor: 'default',
      }}
    >
      {/* Badge icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
        <span style={{ fontSize: '1.4rem' }}>{badge.icon}</span>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: badge.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {badge.label}
          </div>
          <div style={{ fontSize: '0.65rem', color: C.muted }}>{badge.sub}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `${badge.color}22`, marginBottom: '0.9rem' }} />

      {/* Poet name */}
      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: badge.color, marginBottom: '0.3rem' }}>
        {poet.name}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: C.text }}>
            <AnimatedNumber value={poet.voteCount} />
          </div>
          <div style={{ fontSize: '0.65rem', color: C.faint }}>votes</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: C.text }}>
            {poet.poemCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: C.faint }}>poems</div>
        </div>
      </div>
    </div>
  )
}

// ── Countdown ──────────────────────────────────────────────────────────────

function Countdown() {
  const days = getDaysLeftInMonth()
  const pct  = Math.round((days / 30) * 100)

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '1.2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.78rem', color: C.muted }}>Voting closes in</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: C.accent }}>{days}d</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${C.accent}, #f5c842)`,
          borderRadius: 2, transition: 'width 1s ease',
        }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: C.faint, marginTop: '0.5rem' }}>
        {getMonthName()} · resets on 1st of next month
      </div>
    </div>
  )
}

// ── EmptyNominees ──────────────────────────────────────────────────────────

function EmptyNominees() {
  return (
    <div style={{
      border: `1px dashed ${C.border}`, borderRadius: 12,
      padding: '2.5rem 1.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.8rem', opacity: 0.5 }}>✍️</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: C.muted, marginBottom: '0.4rem' }}>
        No nominees yet
      </div>
      <div style={{ fontSize: '0.8rem', color: C.faint, lineHeight: 1.6 }}>
        Writers who post 3 or more poems get nominated automatically.
        Be the first to get nominated!
      </div>
    </div>
  )
}

// ── StarPoet (default export) ──────────────────────────────────────────────

export default function StarPoet({
  poems,
  currentUserName,
}: {
  poems: CommunityPoem[]
  currentUserName: string
}) {
  const {
    nominees, myVote, voting, castVote,
    starPoet, risingVoice, devotedPen,
  } = useStarPoet(poems, currentUserName)

  return (
    <div style={{ marginBottom: '3rem' }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.8rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          height: 1, flex: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))',
        }} />
        <div style={{
          fontSize: '0.72rem', fontWeight: 600, color: C.accent,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⭐</span>
          <span>Star Poet of the Month</span>
        </div>
        <div style={{
          height: 1, flex: 1,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)',
        }} />
      </div>

      {/* Two column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}
        className="starpoet-grid"
      >

        {/* LEFT — Nominees + Voting */}
        <div>
          <div style={{
            fontSize: '0.78rem', color: C.muted,
            marginBottom: '1rem', letterSpacing: '0.04em',
          }}>
            Nominees · {nominees.length} this month
            {myVote && (
              <span style={{ marginLeft: '0.6rem', color: C.accent, fontSize: '0.7rem' }}>
                · You voted for {myVote}
              </span>
            )}
          </div>

          {nominees.length === 0 ? (
            <EmptyNominees />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {nominees.map((nominee, i) => (
                <NomineeCard
                  key={nominee.name}
                  nominee={nominee}
                  rank={i}
                  isVoted={myVote === nominee.name}
                  isSelf={nominee.name === currentUserName}
                  onVote={castVote}
                  voting={voting}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Results + Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

          {/* Countdown */}
          <Countdown />

          {/* Badge cards */}
          <BadgeCard badge={BADGES.star}    poet={starPoet} />
          <BadgeCard badge={BADGES.rising}  poet={risingVoice} />
          <BadgeCard badge={BADGES.devoted} poet={devotedPen} />
        </div>
      </div>

      {/* Bottom divider */}
      <div style={{
        height: 1,
        background: 'rgba(255,255,255,0.05)',
        marginTop: '2.5rem',
      }} />
    </div>
  )
}
