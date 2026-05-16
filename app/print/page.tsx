import { prisma } from '@/lib/prisma'
import { PrintButton } from '@/components/print/PrintButton'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function PrintPage() {
  const plan = await prisma.weeklyPlan.findFirst({
    where: { isActive: true },
    include: {
      days: {
        orderBy: { dayIndex: 'asc' },
        include: {
          meals: {
            orderBy: { slotIndex: 'asc' },
            include: { meal: true },
          },
        },
      },
    },
  })

  if (!plan) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'serif' }}>
        <p>No active plan found.</p>
      </div>
    )
  }

  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end' }} className="print:hidden">
        <PrintButton />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#111' }}>
          Weekly Meal Reference
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '2.5rem' }}>
          {formatDate(weekStart)} — {formatDate(weekEnd)}
        </p>

        {plan.days.map((day) => {
          const totals = day.meals.reduce(
            (acc, wpm) => ({
              calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
              protein: acc.protein + wpm.meal.protein * wpm.portionMultiplier,
              carbs: acc.carbs + wpm.meal.carbs * wpm.portionMultiplier,
              fats: acc.fats + wpm.meal.fats * wpm.portionMultiplier,
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
          )

          const isEmpty = day.meals.length === 0

          return (
            <div key={day.id} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
              {/* Day header */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', borderBottom: '2px solid #111', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', margin: 0 }}>
                  {DAY_NAMES[day.dayIndex]}
                </h2>
                {day.isDismissed && (
                  <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>Dismissed</span>
                )}
              </div>

              {day.isDismissed || isEmpty ? (
                <p style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic', margin: '0.25rem 0 0' }}>
                  {day.justification || (day.isDismissed ? 'Day dismissed' : 'No meals planned')}
                </p>
              ) : (
                <>
                  {/* Meal rows */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <thead>
                      <tr style={{ color: '#888' }}>
                        <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem 0.2rem 0', fontWeight: 'normal', width: '40%' }}>Meal</th>
                        <th style={{ textAlign: 'right', padding: '0.2rem 0.5rem', fontWeight: 'normal' }}>Cal</th>
                        <th style={{ textAlign: 'right', padding: '0.2rem 0.5rem', fontWeight: 'normal' }}>P&nbsp;(g)</th>
                        <th style={{ textAlign: 'right', padding: '0.2rem 0.5rem', fontWeight: 'normal' }}>C&nbsp;(g)</th>
                        <th style={{ textAlign: 'right', padding: '0.2rem 0.5rem', fontWeight: 'normal' }}>F&nbsp;(g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.meals.map((wpm) => {
                        const mult = wpm.portionMultiplier
                        return (
                          <tr key={wpm.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.3rem 0.5rem 0.3rem 0', color: '#111' }}>
                              {wpm.meal.title}
                              {mult !== 1 && (
                                <span style={{ color: '#888', fontSize: '0.7rem', marginLeft: '0.3rem' }}>×{mult}</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: '#333' }}>{Math.round(wpm.meal.calories * mult)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: '#333' }}>{Math.round(wpm.meal.protein * mult)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: '#333' }}>{Math.round(wpm.meal.carbs * mult)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: '#333' }}>{Math.round(wpm.meal.fats * mult)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1.5px solid #333' }}>
                        <td style={{ padding: '0.3rem 0.5rem 0 0', fontWeight: 'bold', color: '#111', fontSize: '0.8rem' }}>Day total</td>
                        <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem 0', fontWeight: 'bold', color: '#111' }}>{Math.round(totals.calories)}</td>
                        <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem 0', fontWeight: 'bold', color: '#111' }}>{Math.round(totals.protein)}</td>
                        <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem 0', fontWeight: 'bold', color: '#111' }}>{Math.round(totals.carbs)}</td>
                        <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem 0', fontWeight: 'bold', color: '#111' }}>{Math.round(totals.fats)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Day notes */}
                  {day.justification && (
                    <p style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', margin: '0.25rem 0 0' }}>
                      Note: {day.justification}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}

        <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#aaa' }}>
          Printed {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { margin: 0; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </>
  )
}
