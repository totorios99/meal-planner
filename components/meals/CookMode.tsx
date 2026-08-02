'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  convertUnit, formatQuantityWithUnit, slotCount as countSlots, slotSeconds as secondsInSlot,
  slotOfIngredient, type Stage,
} from '@/lib/recipe'
import { useSettings } from '@/lib/SettingsContext'
import { Segmented } from '@/components/Segmented'

// One ingredient row of the chart, already resolved from refs + foods by the server page.
export type CookIngredient = { quantity: number; unit: string; name: string }

interface Props {
  stages: Stage[]
  ingredients: CookIngredient[]
  servings: number
  vessel?: string
}

// Serves options: the recipe's own yield plus the halvings/doublings that land on whole
// servings. Deduped and sorted, so a 1-serving meal offers 1/2/3 rather than 0.5/1/1.5/2.
function servesOptions(base: number): number[] {
  const raw = [base * 0.5, base, base * 1.5, base * 2].map(Math.round)
  return [...new Set(raw)].filter(n => n >= 1).sort((a, b) => a - b)
}

export function CookMode({ stages, ingredients, servings: baseServings, vessel }: Props) {
  // Units come straight from the saved preference — edited only in /settings, no in-flow switch.
  // ("Serves" below is local state, it's a per-cook quantity and not a preference.)
  const { settings } = useSettings()
  const units = settings.units
  const [servings, setServings] = useState(baseServings)
  const [cooking, setCooking] = useState(false)
  const [slot, setSlot] = useState(0)
  const [hover, setHover] = useState(-1) // slot being previewed; -1 = none
  const [peek, setPeek] = useState(-1) // stage index whose instruction is showing
  const [openCard, setOpenCard] = useState(-1) // mobile: which companion stage of the live band is opened
  const [finished, setFinished] = useState(false)

  // The countdown runs off the wall-clock instant the slot ends, not a counter ticked down once a
  // second: an interval is throttled to ~1/minute in a backgrounded tab, so a 25-minute simmer
  // timed that way finishes late. Every clock read happens in an effect; the handlers below only
  // move discrete state (`runId` re-arms the current slot, `paused` stops the clock).
  const [deadline, setDeadline] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const resumeFrom = useRef<number | null>(null)

  const slotCount = countSlots(stages)
  const stagesInSlot = (n: number) => stages.filter(s => s.slot === n)
  const slotSeconds = (n: number) => secondsInSlot(stages, n)
  const inSlot = stagesInSlot(slot)
  const lead = inSlot.find(s => !s.meanwhile) ?? inSlot[0]
  const side = inSlot.filter(s => s.meanwhile)
  const secs = slotSeconds(slot)
  const running = !paused
  const timeUp = secs > 0 && remaining === 0

  const start = useCallback((n: number) => {
    setCooking(true)
    setFinished(false)
    setSlot(n)
    setHover(-1)
    setPeek(-1)
    setOpenCard(-1)
    setPaused(false)
    resumeFrom.current = null
    setRunId(r => r + 1)
  }, [])

  function exit() {
    setCooking(false)
    setHover(-1)
    setPeek(-1)
    setPaused(false)
    resumeFrom.current = null
  }

  function goTo(n: number) {
    if (n < 0) return
    if (n >= slotCount) {
      setCooking(false)
      setFinished(true)
      setPaused(false)
      resumeFrom.current = null
      return
    }
    setSlot(n)
    setOpenCard(-1)
    setPaused(false)
    resumeFrom.current = null
    setRunId(r => r + 1)
  }

  function toggleTimer() {
    if (secs === 0) return
    if (paused) {
      setPaused(false)
      setRunId(r => r + 1) // re-arms from resumeFrom, so the pause doesn't cost time
    } else {
      resumeFrom.current = remaining
      setPaused(true)
    }
  }

  // Arm (or re-arm) the current slot's deadline. Resuming picks up the seconds banked at pause.
  useEffect(() => {
    if (!cooking) {
      setDeadline(null)
      setRemaining(0)
      return
    }
    const seconds = resumeFrom.current ?? secondsInSlot(stages, slot)
    resumeFrom.current = null
    setRemaining(seconds)
    setDeadline(seconds > 0 ? Date.now() + seconds * 1000 : null)
  }, [cooking, slot, runId, stages])

  // Twice a second: enough that the displayed second never looks stuck, and the chart itself is
  // memoised below so a tick only re-renders the bar.
  useEffect(() => {
    if (!cooking || paused || deadline === null) return
    const id = setInterval(
      () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      500
    )
    return () => clearInterval(id)
  }, [cooking, paused, deadline])

  useEffect(() => {
    if (!cooking) return
    function onKey(e: KeyboardEvent) {
      // Space is the activation key for whatever button has focus; only claim it as pause/resume
      // when focus isn't sitting on a control of our own.
      const onControl = e.target instanceof HTMLElement && !!e.target.closest('button, input, textarea, select, [contenteditable]')
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(slot + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(slot - 1) }
      else if (e.key === 'Escape') { e.preventDefault(); exit() }
      else if (e.key === ' ' && !onControl) { e.preventDefault(); toggleTimer() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // No dep array: the handler closes over the current slot, so it is rebound every render on
    // purpose — otherwise ← → would step from a stale slot.
  })

  // The phone is propped against a canister with the cook's hands in a pan — a screen that
  // sleeps mid-simmer loses the timer. Best-effort: unsupported browsers just sleep as usual.
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!cooking || !('wakeLock' in navigator)) return
    let released = false
    navigator.wakeLock.request('screen').then(
      s => { if (released) s.release(); else wakeLock.current = s },
      () => {} // denied (background tab, battery saver) — not worth surfacing
    )
    return () => {
      released = true
      wakeLock.current?.release()
      wakeLock.current = null
    }
  }, [cooking])

  // Stepping slots on a phone should bring the live card to the middle of the screen — the cook
  // isn't holding the phone, so nothing scrolls unless we do it. No-ops on desktop, where the
  // slot list is display:none.
  const liveCard = useRef<HTMLLIElement | null>(null)
  useEffect(() => {
    if (!cooking || !liveCard.current) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    liveCard.current.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [cooking, slot])

  // The cooking bar is fixed above the tab bar on mobile, so the page has to reserve its height
  // or the last slot card hides underneath it.
  useEffect(() => {
    document.body.dataset.cooking = cooking ? '1' : ''
    return () => { document.body.dataset.cooking = '' }
  }, [cooking])

  // A colour change is no use to someone watching the pan, not the screen.
  useEffect(() => {
    if (timeUp && typeof navigator.vibrate === 'function') navigator.vibrate([180, 90, 180])
  }, [timeUp])

  const factor = baseServings > 0 ? servings / baseServings : 1
  const rows = useMemo(() => ingredients.map((ing, i) => {
    const owner = slotOfIngredient(stages, i)
    const used = cooking && owner > -1 && owner < slot
    const now = owner > -1 && (cooking ? owner === slot : hover >= 0 && hover === owner)
    const later = cooking && (owner === -1 || owner > slot)
    // Cans don't come in arbitrary fractions — snap them to the half tin you'd actually open.
    const scaled = ing.unit.trim().toLowerCase() === 'cans'
      ? Math.round(ing.quantity * factor * 2) / 2
      : ing.quantity * factor
    const c = convertUnit(scaled, ing.unit, units)
    // Quantity and name are separate cells: the quantity column is mono and tabular so the
    // numbers line up down the chart, which is the whole point of reading it as a grid.
    return { index: i, qty: formatQuantityWithUnit(c.quantity, c.unit, ing.name), name: ing.name, owner, used, now, later }
  }), [ingredients, stages, cooking, slot, hover, factor, units])

  // Swipe to step slots while cooking — the same job as ← → on a keyboard, for a hand that's
  // holding a spoon. Vertical drags are scrolls and must pass through untouched.
  const touch = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const from = touch.current
    touch.current = null
    if (!from || !cooking) return
    const t = e.changedTouches[0]
    const dx = t.clientX - from.x
    const dy = t.clientY - from.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    goTo(dx < 0 ? slot + 1 : slot - 1)
  }

  // One home for an instruction at a time. While cooking the stage bar owns the current step's
  // text, so the rail only speaks when the cook is previewing a DIFFERENT stage — otherwise the
  // same paragraph sat in both places at once.
  const previewed = peek >= 0 ? stages[peek] : undefined
  const railStage = previewed && !(cooking && previewed.slot === slot) ? previewed : undefined

  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')

  // Row range each stage falls back to when it consumes no new ingredient: the span of the most
  // recent stage (in cooking order) that did. Walked once here instead of inside the render.
  const carryRows = useMemo(() => {
    const order = stages.map((_, i) => i).sort((a, b) => stages[a].slot - stages[b].slot)
    const fallback: [number, number][] = stages.map(() => [1, 2])
    let last: [number, number] = [1, Math.max(2, ingredients.length + 1)]
    for (const i of order) {
      const st = stages[i]
      if (st.to >= st.from) last = [st.from + 1, st.to + 2]
      else fallback[i] = last
    }
    return fallback
  }, [stages, ingredients.length])

  // Memoised so a timer tick re-renders only the stage bar: the chart sits on a
  // backdrop-filter surface, and re-blurring it twice a second buys nothing.
  const chart = useMemo(() => (
    // Preview state is cleared at the outer boundary as well as the grid's: the grid's own
    // mouseleave misses exits that don't cross its edge under the cursor — leaving through the
    // scroll clip, or the grid scrolling out from under a still pointer — which left the
    // ingredient column lit with no card hovered.
    <div className="cook-frame" onMouseLeave={() => { setHover(-1); setPeek(-1) }}>
      {vessel && <div className="cook-vessel">{vessel}</div>}
      <div className="cook-scroll" tabIndex={0} role="group" aria-label="Cooking chart, scrolls sideways">
        <div
          className="cook-grid"
          style={{ ['--cook-slots' as string]: slotCount }}
          onMouseLeave={() => { setHover(-1); setPeek(-1) }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              className={`cook-ing${r.now ? ' is-now' : ''}${r.used ? ' is-used' : ''}${r.later ? ' is-later' : ''}`}
            >
              <span className="cook-ing-qty">{r.qty}</span>
              <span className="cook-ing-name">{r.name}</span>
            </div>
          ))}

          {stages.map((st, i) => {
            const done = cooking && st.slot < slot
            const active = cooking && st.slot === slot
            const soft = active && st.meanwhile
            const hasSpan = st.to >= st.from
            // A stage that adds nothing new ("simmer", "bake", "assemble") still needs rows. Park
            // it beside whatever went in most recently — the pot's contents haven't changed — which
            // reads as the recipe continuing rather than as a block dropped at an arbitrary row.
            const [fbStart, fbEnd] = carryRows[i]
            const rowStart = hasSpan ? st.from + 1 : fbStart
            const rowEnd = hasSpan ? st.to + 2 : fbEnd
            return (
              <div
                key={i}
                className="cook-cell"
                style={{ gridRow: `${rowStart} / ${rowEnd}`, gridColumn: st.slot + 2 }}
              >
                <button
                  type="button"
                  className={
                    'cook-stage' +
                    (st.meanwhile ? ' is-side' : '') +
                    (active && !soft ? ' is-active' : '') +
                    (soft ? ' is-active-side' : '') +
                    (done ? ' is-done' : '')
                  }
                  aria-current={active ? 'step' : undefined}
                  onMouseEnter={() => { setPeek(i); if (!cooking) setHover(st.slot) }}
                  onFocus={() => { setPeek(i); if (!cooking) setHover(st.slot) }}
                  onBlur={() => { setPeek(p => (p === i ? -1 : p)); if (!cooking) setHover(-1) }}
                  // Mouse click: hand focus back. Cook mode drives on ← → and Space, so the browser
                  // sits in keyboard modality and a clicked card keeps matching :focus-visible —
                  // the preview highlight then outlives the pointer. detail === 0 is keyboard
                  // activation, which must keep its ring.
                  onClick={e => { if (e.detail > 0) e.currentTarget.blur(); start(st.slot) }}
                >
                  {st.meanwhile && <span className="cook-stage-kicker">Meanwhile</span>}
                  <span className="cook-stage-name">{st.name}</span>
                  {/* The card shows the label; the instruction is read from the rail below (and
                      from the stage bar once cooking), so it goes to assistive tech only here. */}
                  {st.detail && <span className="cook-outline">{st.detail}</span>}
                  {st.timing && <span className="cook-stage-timing">{st.timing}</span>}
                  {st.hint && <span className="cook-stage-hint">{st.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  ), [rows, stages, slotCount, cooking, slot, hover, vessel, start, carryRows])


  // Mobile form of the same chart. A seven-column gantt inside a 358px content box is a
  // horizontal-scroll puzzle, so on a phone the columns become cards in cooking order: each slot
  // carries its own stages, its instruction, and the ingredients that go in at that point. Same
  // information, same order, no panning — and instructions are inline because touch has no hover.
  const unassigned = rows.filter(r => r.owner === -1)

  // Cumulative clock: when each slot starts, if the recipe states enough durations to make that
  // meaningful. Used to label the timeline's spine.
  const timeline = useMemo(() => {
    const bands: { slot: number; startsAt: number; seconds: number }[] = []
    let clock = 0
    for (let n = 0; n < slotCount; n++) {
      if (!stages.some(st => st.slot === n)) continue
      const seconds = secondsInSlot(stages, n)
      bands.push({ slot: n, startsAt: clock, seconds })
      clock += seconds
    }
    return { bands, total: clock }
  }, [stages, slotCount])

  const clockLabel = (secs: number) => {
    const m = Math.round(secs / 60)
    if (m < 60) return `${m} min`
    const h = Math.floor(m / 60)
    return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60}`
  }

  // Mobile is the same chart with the axes swapped: time runs DOWN the page instead of across it,
  // so a band's height shows how long it lasts and stages that share a slot sit side by side —
  // the two things a step list can never say. A 20-minute band is visibly taller than a 2-minute
  // one, and "these two happen at once" is a fact of the layout rather than a label.
  const slotList = (
    <div className="cook-tl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {unassigned.length > 0 && (
        <details className="cook-tl-loose" open={!cooking}>
          <summary>
            Everything you need
            <span>{unassigned.length} items</span>
          </summary>
          <ul className="cook-tl-chips">
            {unassigned.map((r, i) => (
              <li key={i}><b>{r.qty}</b> {r.name}</li>
            ))}
          </ul>
        </details>
      )}

      <ol className="cook-tl-track">
        {timeline.bands.map(({ slot: n, startsAt, seconds }, bandIndex) => {
          // Untimed slots don't advance the clock, so several bands can share a mark — show it
          // once, where it changes.
          const showClock = startsAt > 0 && startsAt !== timeline.bands[bandIndex - 1]?.startsAt
          const group = stagesInSlot(n)
          const active = cooking && n === slot
          const done = cooking && n < slot
          // Height carries the duration: a floor so short steps stay legible, then a minute of
          // cooking per 7px, capped so a one-hour braise doesn't become a scrolling void.
          const minHeight = Math.min(96 + (seconds / 60) * 7, 260)
          return (
            <li
              key={n}
              ref={active ? liveCard : undefined}
              className={`cook-band${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
              style={{ minHeight: `${Math.round(minHeight)}px` }}
              aria-current={active ? 'step' : undefined}
            >
              <div className="cook-band-spine">
                <span className="cook-band-no">{String(n + 1).padStart(2, '0')}</span>
                {showClock && <span className="cook-band-clock">+{clockLabel(startsAt)}</span>}
                {/* Simultaneity is stated once, for the band, instead of on every card in it. */}
                {group.length > 1 && <span className="cook-band-at-once">{group.length} at once</span>}
                {seconds > 0 && <span className="cook-band-dur">{clockLabel(seconds)}</span>}
              </div>

              <div className={`cook-band-stages${group.length > 1 ? ' is-shared' : ''}`}>
                {group.map((st, i) => {
                  const mine = rows.filter(r => r.owner === n && st.to >= st.from && r.index >= st.from && r.index <= st.to)
                  // On the live band the stage you're actually working is open; its unattended
                  // companions stay clamped until asked for, so four concurrent tasks don't turn
                  // one step into a page of scrolling.
                  const companion = active && !!st.meanwhile
                  const open = active && (!st.meanwhile || openCard === i)
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`cook-band-stage${st.meanwhile ? ' is-side' : ''}${open ? ' is-open' : ''}${companion ? ' is-toggle' : ''}`}
                      aria-expanded={companion ? openCard === i : undefined}
                      // Tapping the stage already on the heat must not re-arm its timer.
                      onClick={() => {
                        if (companion) setOpenCard(c => (c === i ? -1 : i))
                        else if (!active) start(n)
                      }}
                    >
                      {st.meanwhile && <span className="cook-stage-kicker">Meanwhile</span>}
                      <span className="cook-band-name">{st.name}</span>
                      {st.timing && <span className="cook-band-timing">{st.timing}</span>}
                      {mine.length > 0 && (
                        <ul className="cook-tl-chips">
                          {mine.map((r, j) => (
                            <li key={j}><b>{r.qty}</b> {r.name}</li>
                          ))}
                        </ul>
                      )}
                      {st.detail && <p className="cook-band-detail">{st.detail}</p>}
                      {companion && (
                        <span className="cook-band-more">{openCard === i ? 'Less' : 'How'}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )

  if (stages.length === 0) {
    return <p className="recipe-empty">No cook stages yet — add them from the meal editor.</p>
  }

  return (
    <div className="cook">
      <div className="cook-controls">
        <div className="cook-seg-group">
          <span className="cook-seg-label" aria-hidden="true">Serves</span>
          <Segmented
            label="Servings"
            value={servings}
            options={servesOptions(baseServings).map(n => ({
              value: n,
              label: String(n),
              ariaLabel: `${n} ${n === 1 ? 'serving' : 'servings'}`,
            }))}
            onPick={setServings}
          />
        </div>

        <button
          type="button"
          className={`cook-start${cooking ? ' is-cooking' : ''}`}
          disabled={cooking}
          onClick={() => start(0)}
        >
          {cooking ? 'Cooking…' : 'Start cooking'}
        </button>
      </div>

      {cooking && (
        <div className="cook-bar">
          <span className="cook-bar-count">Step {slot + 1} of {slotCount}</span>
          <div className="cook-bar-name">
            <strong>{lead?.name}</strong>
            {lead?.detail && <span className="cook-bar-detail">{lead.detail}</span>}
            {side.length > 0 && (
              <span className="cook-bar-side">meanwhile · {side.map(s => s.name).join(' · ')}</span>
            )}
          </div>
          <button
            type="button"
            className={`cook-nav is-back${slot === 0 ? ' is-dim' : ''}`}
            disabled={slot === 0}
            onClick={() => goTo(slot - 1)}
          >
            Back
          </button>
          <button type="button" className="cook-nav is-next" onClick={() => goTo(slot + 1)}>
            {slot === slotCount - 1 ? 'Finish' : 'Next'}
          </button>
          <button type="button" className="cook-nav is-exit" onClick={exit}>Exit</button>
          {/* role=timer + aria-live: the countdown is the one thing on this surface that changes
              without the cook touching anything, so it has to announce itself. */}
          <button
            type="button"
            role="timer"
            aria-live={timeUp ? 'assertive' : 'off'}
            aria-label={
              secs === 0 ? 'No timer for this step'
                : timeUp ? "Time's up"
                : `${mm} minutes ${Number(ss)} seconds left, ${running ? 'running' : 'paused'} — activate to ${running ? 'pause' : 'resume'}`
            }
            className={`cook-timer${secs > 0 ? '' : ' is-none'}${timeUp ? ' is-up' : ''}${secs > 0 && !running ? ' is-paused' : ''}`}
            disabled={secs === 0}
            onClick={toggleTimer}
          >
            {secs > 0 ? (timeUp ? "time's up" : `${mm}:${ss}`) : 'no timer'}
          </button>
        </div>
      )}

      {finished && (
        <div className="cook-done" role="status">
          <span>Done — {servings} {servings === 1 ? 'serving' : 'servings'}.</span>
          <button type="button" className="cook-nav" onClick={() => setFinished(false)}>Dismiss</button>
        </div>
      )}

      {/* Always rendered at a fixed height, filled or not. Growing it on hover pushed the very
          card being hovered downwards — a cursor near a card's top edge fell outside it, which
          ended the hover, which shrank this box, which slid the card back under the cursor, many
          times a second. A preview must never move the thing being previewed. */}
      <div className={`cook-rail${railStage ? ' is-filled' : ''}`}>
        {railStage ? (
          <>
            <span className="cook-rail-label">
              {/* While cooking, say plainly that this is not the step on the heat. */}
              {cooking && <b>Step {railStage.slot + 1}</b>}
              {railStage.name}
              {railStage.timing ? <em>{railStage.timing}</em> : null}
            </span>
            <p className="cook-rail-text">{railStage.detail || 'No further detail for this stage.'}</p>
          </>
        ) : (
          <p className="cook-rail-text">
            {cooking
              ? 'Hover a stage to look ahead without leaving this step.'
              : 'Hover or focus a stage to read its instruction.'}
          </p>
        )}
      </div>

      {chart}
      {slotList}

      {/* A stage card is a few words wide, so the instruction lives here instead of inside the
          cell — one strip above the grid that fills on hover/focus, rather than a tooltip that
          would reflow the grid it sits in, or a footer the cook has to scroll a tall chart to
          reach. While cooking the stage bar owns the current step and this shows previews only. */}

      {/* The grid above is geometry: which stage consumes which ingredients lives in the row
          spans, and none of that survives linearisation. Visually hidden, in cooking order. */}
      <ol className="cook-outline">
        {Array.from({ length: slotCount }, (_, n) => {
          const group = stagesInSlot(n)
          if (group.length === 0) return null
          return (
            <li key={n} aria-current={cooking && n === slot ? 'step' : undefined}>
              {group.map((st, i) => (
                <span key={i}>
                  {i > 0 ? ' — at the same time: ' : ''}
                  {st.name}
                  {st.timing ? ` (${st.timing})` : ''}
                  {st.to >= st.from
                    ? `. Uses ${rows.slice(st.from, st.to + 1).map(r => `${r.qty} ${r.name}`).join(', ')}.`
                    : '.'}
                </span>
              ))}
            </li>
          )
        })}
      </ol>

      {cooking && (
        <p className="cook-foot">
          ← → step · space pauses the timer · esc exits
        </p>
      )}
      {!cooking && (
        <p className="cook-foot">
          Blocks sharing a column run at the same time · tap any block to cook from there
        </p>
      )}
    </div>
  )
}
