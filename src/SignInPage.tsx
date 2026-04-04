import { useState } from 'react'

// ── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  ink:    '#1a1410',
  paper:  '#f5f0e8',
  aged:   '#e8dfc8',
  candle: '#c8a45a',
  dim:    '#7a6e5f',
  surface:'#1e1810',
  card:   '#231c16',
} as const

// ── Props ──────────────────────────────────────────────────────────────────

interface SignInPageProps {
  onSignIn:     () => void
  onSavePenName:(name: string) => Promise<{ success: boolean; error?: string }>
  needsPenName: boolean
  loading:      boolean
}

// ── PenNameForm ────────────────────────────────────────────────────────────

function PenNameForm({ onSave }: { onSave: (name: string) => Promise<{ success: boolean; error?: string }> }) {
  const [penName, setPenName] = useState('')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [focused, setFocused] = useState(false)

  const handleSave = async () => {
    if (!penName.trim()) return
    setSaving(true)
    setError('')
    const result = await onSave(penName)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: COLORS.card,
      border: '1px solid rgba(200,164,90,0.2)',
      borderRadius: 16,
      padding: '2.5rem',
      maxWidth: 420, width: '100%',
      textAlign: 'center',
      animation: 'fadeUp 0.4s ease',
    }}>
      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(200,164,90,0.1)',
        border: '1px solid rgba(200,164,90,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem', fontSize: '1.5rem',
      }}>
        ✍️
      </div>

      <div style={{
        fontFamily: "'IM Fell English', serif",
        fontSize: '1.4rem', fontStyle: 'italic',
        color: COLORS.paper, marginBottom: '0.4rem',
      }}>
        One last thing
      </div>

      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '0.95rem', color: COLORS.dim,
        lineHeight: 1.7, marginBottom: '2rem',
      }}>
        Choose your pen name. This is how you'll appear
        publicly across the site. It cannot be changed later.
      </p>

      {/* Input */}
      <div style={{ marginBottom: '0.5rem' }}>
        <input
          type="text"
          placeholder="Your pen name"
          value={penName}
          onChange={e => setPenName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={30}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? 'rgba(200,164,90,0.5)' : 'rgba(200,164,90,0.18)'}`,
            borderRadius: 8,
            color: COLORS.paper,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.1rem',
            padding: '0.85rem 1rem',
            outline: 'none',
            textAlign: 'center',
            transition: 'border-color 0.2s',
            letterSpacing: '0.02em',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: '0.35rem', padding: '0 0.2rem',
        }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(139,58,58,0.9)' }}>
            {error}
          </span>
          <span style={{ fontSize: '0.68rem', color: COLORS.dim }}>
            {penName.length}/30
          </span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !penName.trim()}
        style={{
          width: '100%',
          padding: '0.85rem',
          borderRadius: 8,
          background: saving || !penName.trim()
            ? 'transparent'
            : COLORS.candle,
          border: `1px solid ${saving || !penName.trim() ? 'rgba(200,164,90,0.15)' : COLORS.candle}`,
          color: saving || !penName.trim() ? COLORS.dim : COLORS.ink,
          fontSize: '0.88rem',
          fontWeight: 500,
          fontFamily: "'Inconsolata', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: saving || !penName.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s',
          marginTop: '0.5rem',
        }}
      >
        {saving ? 'Saving…' : 'Confirm Pen Name →'}
      </button>

      <p style={{
        marginTop: '1.2rem',
        fontFamily: "'Inconsolata', monospace",
        fontSize: '0.65rem',
        color: COLORS.dim,
        letterSpacing: '0.08em',
        opacity: 0.7,
      }}>
        This name will be shown on all your public poems
      </p>
    </div>
  )
}

// ── SignInPage (default export) ────────────────────────────────────────────

export default function SignInPage({
  onSignIn,
  onSavePenName,
  needsPenName,
  loading,
}: SignInPageProps) {
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = async () => {
    setSigningIn(true)
    await onSignIn()
    setSigningIn(false)
  }

  if (loading) {
    return (
      <section style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: '0.75rem', color: COLORS.dim,
          letterSpacing: '0.15em',
        }}>
          Loading…
        </p>
      </section>
    )
  }

  // Show pen name form after Google sign-in
  if (needsPenName) {
    return (
      <section style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '6rem 2rem 4rem',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(139,58,58,0.06) 0%, transparent 65%)',
      }}>
        <PenNameForm onSave={onSavePenName} />
      </section>
    )
  }

  // Main sign-in page
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6rem 2rem 4rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(139,58,58,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: COLORS.card,
        border: '1px solid rgba(200,164,90,0.18)',
        borderRadius: 16,
        padding: '3rem 2.5rem',
        maxWidth: 440, width: '100%',
        textAlign: 'center',
        position: 'relative',
        animation: 'fadeUp 0.5s ease',
      }}>

        {/* Candle ornament */}
        <div style={{
          width: 2, height: 40,
          background: 'linear-gradient(to top, #c8a45a, rgba(200,164,90,0.2), transparent)',
          margin: '0 auto 1.8rem',
          borderRadius: '50%',
          animation: 'flicker 2.5s ease-in-out infinite alternate',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: 5, height: 5,
            background: '#c8a45a', borderRadius: '50%',
          }} />
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '1.8rem', fontStyle: 'italic',
          color: COLORS.paper, marginBottom: '0.5rem',
          lineHeight: 1.2,
        }}>
          Your Private Space<br />to Write
        </h2>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1rem', color: COLORS.dim,
          lineHeight: 1.8, marginBottom: '2.5rem',
          fontStyle: 'italic',
        }}>
          A personal diary for your poems.<br />
          Public or private — always your choice.
        </p>

        {/* Feature list */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.7rem',
          marginBottom: '2.5rem', textAlign: 'left',
        }}>
          {[
            ['🔒', 'Private poems only you can see'],
            ['🌐', 'Share poems publicly with one toggle'],
            ['✍️', 'Write, edit and delete anytime'],
            ['👑', 'Get nominated as Star Poet'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: '0.8rem',
            }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '0.92rem', color: COLORS.aged,
              }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Google sign-in button */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.9rem 1.5rem',
            borderRadius: 10,
            background: signingIn ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${signingIn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)'}`,
            color: signingIn ? COLORS.dim : COLORS.paper,
            fontSize: '0.92rem',
            fontFamily: "'Inconsolata', monospace",
            letterSpacing: '0.08em',
            cursor: signingIn ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {/* Google G icon */}
          {!signingIn && (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p style={{
          marginTop: '1.5rem',
          fontFamily: "'Inconsolata', monospace",
          fontSize: '0.62rem',
          color: COLORS.dim,
          letterSpacing: '0.08em',
          lineHeight: 1.6,
          opacity: 0.7,
        }}>
          You'll be asked to choose a pen name after signing in.
          Your Google account name is never shown publicly.
        </p>
      </div>
    </section>
  )
}
