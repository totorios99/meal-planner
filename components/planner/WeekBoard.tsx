'use client'
import { useEffect, useRef } from 'react'
import { WeeklyPlan, WeeklyPlanDay, FoodRow } from '@/types'
import { DayCard } from './DayCard'
import { MacroTargets } from '@/lib/useMacroTargets'

interface Props {
  plan: WeeklyPlan
  targets: MacroTargets
  foods: FoodRow[]
  fullTitles: boolean
  onPlanUpdate: (plan: WeeklyPlan) => void
}

export function WeekBoard({ plan, targets, foods, fullTitles, onPlanUpdate }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const landedOnToday = useRef(false)

  // On desktop the whole week is a 7-column grid, so today is already on screen. On a phone
  // the same week is a tall single column and today can sit a screen and a half down — you
  // open the planner to see what you're eating *today* and have to scroll to find it.
  // Jump straight there, once, on the current week only. `behavior: 'auto'` is deliberate:
  // the page should simply *start* at today rather than visibly animate past the other days
  // (which would also fight prefers-reduced-motion).
  useEffect(() => {
    // Arrival behaviour only. Flipping weeks with the < > nav is a deliberate act with the
    // header in view, so re-running this later would yank the page under the user's thumb.
    if (landedOnToday.current) return
    landedOnToday.current = true
    if (!window.matchMedia('(max-width: 768px)').matches) return
    const today = gridRef.current?.querySelector('.day-col.today')
    if (!today) return // a past/future week has no today — leave the view at the top
    const top = today.getBoundingClientRect().top + window.scrollY
    // Clear the floating nav pill (~94px) so the day header isn't tucked under it.
    window.scrollTo({ top: Math.max(0, top - 94), behavior: 'auto' })
  }, [plan.id])

  function handleDayUpdate(updatedDay: WeeklyPlanDay) {
    onPlanUpdate({ ...plan, days: plan.days.map(d => d.id === updatedDay.id ? updatedDay : d) })
  }

  return (
    <div className={`planner-grid${fullTitles ? ' full-titles' : ''}`} ref={gridRef}>
      {plan.days.map(day => (
        <DayCard
          key={day.id}
          day={day}
          planId={plan.id}
          targets={targets}
          foods={foods}
          weekStart={plan.weekStart}
          onDayUpdate={handleDayUpdate}
        />
      ))}
    </div>
  )
}
