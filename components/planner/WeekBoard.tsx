'use client'
import { WeeklyPlan, WeeklyPlanDay, FoodRow } from '@/types'
import { DayCard } from './DayCard'
import { MacroTargets } from '@/lib/useMacroTargets'

interface Props {
  plan: WeeklyPlan
  targets: MacroTargets
  foods: FoodRow[]
  onPlanUpdate: (plan: WeeklyPlan) => void
}

export function WeekBoard({ plan, targets, foods, onPlanUpdate }: Props) {
  function handleDayUpdate(updatedDay: WeeklyPlanDay) {
    onPlanUpdate({ ...plan, days: plan.days.map(d => d.id === updatedDay.id ? updatedDay : d) })
  }

  return (
    <div className="planner-grid">
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
