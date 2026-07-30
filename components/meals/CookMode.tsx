'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  convertUnit, formatQuantityWithUnit, slotCount as countSlots, slotSeconds as secondsInSlot,
  slotOfIngredient, type Stage,
} from '@/lib/recipe'

// One ingredient row of the chart, already resolved from refs + foods by the server page.
export type CookIngredient = { quantity: number; unit: string; name: string }

interface Props {
  stages: Stage[]
  ingredients: CookIngredient[]
  servings: number
  vessel?: string
}

const UNITS_KEY = 'meal-planner-units'
type System = 'US' | 'Metric'

// Serves options: the recipe's own yield plus the halvings/doublings that land on whole
// servings. Deduped and sorted, so a 1-serving meal offers 1/2/3 rather than 0.5/1/1.5/2.
function servesOptions(base: number): number[] {
  const raw = [base * 0.5, base, base * 1.5, base * 2].map(Math.round)
  return [...new Set(raw)].filter(n => n >= 1).sort((a, b) => a - b)
}

export function CookMode({ stages, ingredients, servings: baseServings, vessel }: Props) {
  const [servings, setServings] = useState(baseServings)
  const [units, setUnits] = useState<System>('US')
  const [cooking, setCooking] = useState(false)
  const [slot, setSlot] = useState(0)
  const [hover, setHover] = useState(-1) // slot being previewed; -1 = none
  const [peek, setPeek] = useState(-1) // stage index whose instruction is showing
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

  // Defaults-first, hydrate once — same reason as lib/useMacroTargets.ts: the server render
  // must not depend on localStorage.
  useEffect(() => {
    const stored = localStorage.getItem(UNITS_KEY)
    if (stored === 'US' || stored === 'Metric') setUnits(stored)
  }, [])

  function pickUnits(next: System) {
    setUnits(next)
    localStorage.setItem(UNITS_KEY, next)
  }

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
    return { qty: formatQuantityWithUnit(c.quantity, c.unit, ing.name), name: ing.name, owner, used, now, later }
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
  const railOpen = !cooking || !!railStage

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
    <div className="cook-frame">
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
            const hovered = !cooking && hover === st.slot
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
                onMouseEnter={() => { setPeek(i); if (!cooking) setHover(st.slot) }}
                onMouseLeave={() => setPeek(p => (p === i ? -1 : p))}
              >
                <button
                  type="button"
                  className={
                    'cook-stage' +
                    (st.meanwhile ? ' is-side' : '') +
                    (active && !soft ? ' is-active' : '') +
                    (soft ? ' is-active-side' : '') +
                    (done ? ' is-done' : '') +
                    (hovered ? ' is-hover' : '')
                  }
                  aria-current={active ? 'step' : undefined}
                  onFocus={() => { setPeek(i); if (!cooking) setHover(st.slot) }}
                  onBlur={() => setPeek(p => (p === i ? -1 : p))}
                  onClick={() => start(st.slot)}
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
  ), [rows, stages, slotCount, cooking, slot, hover, vessel, start])


  // Mobile form of the same chart. A seven-column gantt inside a 358px content box is a
  // horizontal-scroll puzzle, so on a phone the columns become cards in cooking order: each slot
  // carries its own stages, its instruction, and the ingredients that go in at that point. Same
  // information, same order, no panning — and instructions are inline because touch has no hover.
  const unassigned = rows.filter(r => r.owner === -1)
  const slotList = (
    <ol
      className="cook-slots"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Ingredients no stage claims — every ingredient of a step-backfilled meal, which knows the
          instructions but not which of them consumes what. Without this the phone's Cook view
          would list method and no quantities. */}
      {unassigned.length > 0 && (
        <li className="cook-slot is-loose">
          {/* Collapsible, and closed once cooking starts: eighteen quantities standing between the
              cook and step 01 is the wrong thing to scroll past mid-recipe. */}
          <details open={!cooking}>
            <summary className="cook-slot-head as-heading">
              Everything you need
              <span>{unassigned.length} items</span>
            </summary>
            <div className="cook-slot-body">
              <ul className="cook-slot-ings">
                {unassigned.map((r, i) => (
                  <li key={i}>
                    <span className="cook-ing-qty">{r.qty}</span>
                    <span className="cook-ing-name">{r.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </li>
      )}
      {Array.from({ length: slotCount }, (_, n) => {
        const group = stagesInSlot(n)
        if (group.length === 0) return null
        const slotLead = group.find(st => !st.meanwhile) ?? group[0]
        const slotSide = group.filter(st => st.meanwhile)
        const active = cooking && n === slot
        const done = cooking && n < slot
        const mine = rows.filter(r => r.owner === n)
        const seconds = slotSeconds(n)
        return (
          <li
            key={n}
            ref={active ? liveCard : undefined}
            className={`cook-slot${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <button type="button" className="cook-slot-head" onClick={() => start(n)}>
              <span className="cook-slot-no">{String(n + 1).padStart(2, '0')}</span>
              <span className="cook-slot-name">{slotLead.name}</span>
              {slotLead.timing
                ? <span className="cook-slot-timing">{slotLead.timing}</span>
                : seconds > 0 ? <span className="cook-slot-timing">{Math.round(seconds / 60)} min</span> : null}
            </button>

            <div className="cook-slot-body">
              {slotLead.detail && <p className="cook-slot-detail">{slotLead.detail}</p>}

              {slotSide.map((st, i) => (
                <div key={i} className="cook-slot-side">
                  <span className="cook-stage-kicker">Meanwhile</span>
                  <p className="cook-slot-side-name">{st.name}</p>
                  {st.detail && <p className="cook-slot-detail">{st.detail}</p>}
                </div>
              ))}

              {mine.length > 0 && (
                <ul className="cook-slot-ings">
                  {mine.map((r, i) => (
                    <li key={i}>
                      <span className="cook-ing-qty">{r.qty}</span>
                      <span className="cook-ing-name">{r.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )

  if (stages.length === 0) {
    return <p className="recipe-empty">No cook stages yet — add them from the meal editor.</p>
  }

  return (
    <div className="cook">
      <div className="cook-controls">
        <div className="cook-seg-group" role="radiogroup" aria-label="Servings">
          <span className="cook-seg-label" aria-hidden="true">Serves</span>
          <div className="cook-seg-pills">
            {servesOptions(baseServings).map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={n === servings}
                aria-label={`${n} ${n === 1 ? 'serving' : 'servings'}`}
                className={`cook-seg${n === servings ? ' is-on' : ''}`}
                onClick={() => setServings(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="cook-seg-group" role="radiogroup" aria-label="Measurement units">
          <span className="cook-seg-label" aria-hidden="true">Units</span>
          <div className="cook-seg-pills">
            {(['US', 'Metric'] as System[]).map(u => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={u === units}
                className={`cook-seg${u === units ? ' is-on' : ''}`}
                onClick={() => pickUnits(u)}
              >
                {u}
              </button>
            ))}
          </div>
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

      {railOpen && (
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
            <p className="cook-rail-text">Hover or focus a stage to read its instruction.</p>
          )}
        </div>
      )}
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
