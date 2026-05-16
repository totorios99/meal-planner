'use client'
import { WeeklyPlan, WeeklyPlanDay } from '@/types'
import { DayCard } from './DayCard'
import { MacroTargets } from '@/lib/useMacroTargets'

interface Props {
  plan: WeeklyPlan
  targets: MacroTargets
  onPlanUpdate: (plan: WeeklyPlan) => void
}

export function WeekBoard({ plan, targets, onPlanUpdate }: Props) {
  function handleDayUpdate(updatedDay: WeeklyPlanDay) {
    const updated = {
      ...plan,
      days: plan.days.map(d => d.id === updatedDay.id ? updatedDay : d)
    }
    onPlanUpdate(updated)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {plan.days.map(day => (
        <DayCard
          key={day.id}
          day={day}
          planId={plan.id}
          targets={targets}
          onDayUpdate={handleDayUpdate}
        />
      ))}
    </div>
  )
}
