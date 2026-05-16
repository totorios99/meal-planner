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

  const days = plan.days.map((day) => {
    const totals = day.meals.reduce(
      (acc, wpm) => ({
        calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
        protein: acc.protein + wpm.meal.protein * wpm.portionMultiplier,
        carbs: acc.carbs + wpm.meal.carbs * wpm.portionMultiplier,
        fats: acc.fats + wpm.meal.fats * wpm.portionMultiplier,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
    return { day, totals }
  })

  return (
    <>
      {/* Screen-only print button */}
      <div
        style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end' }}
        className="print:hidden"
      >
        <PrintButton />
      </div>

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem',
          fontFamily: 'Georgia, serif',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.25rem',
            color: '#111',
          }}
        >
          Weekly Nutrition Summary
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '2rem' }}>
          {formatDate(weekStart)} &mdash; {formatDate(weekEnd)}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111' }}>
              {['Day', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Notes'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontWeight: 'bold',
                    color: '#111',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(({ day, totals }, i) => {
              const isEmpty = day.meals.length === 0
              const notes = day.isDismissed
                ? `Dismissed${day.justification ? ` — ${day.justification}` : ''}`
                : day.justification || (isEmpty ? '(no meals logged)' : '')

              return (
                <tr
                  key={day.id}
                  style={{
                    borderBottom: '1px solid #ddd',
                    background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                  }}
                >
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#111' }}>
                    {DAY_NAMES[day.dayIndex]}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: isEmpty ? '#aaa' : '#111' }}>
                    {isEmpty ? '—' : Math.round(totals.calories)}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: isEmpty ? '#aaa' : '#111' }}>
                    {isEmpty ? '—' : Math.round(totals.protein)}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: isEmpty ? '#aaa' : '#111' }}>
                    {isEmpty ? '—' : Math.round(totals.carbs)}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: isEmpty ? '#aaa' : '#111' }}>
                    {isEmpty ? '—' : Math.round(totals.fats)}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem 0.75rem',
                      color: '#555',
                      fontStyle: notes ? 'italic' : 'normal',
                    }}
                  >
                    {notes}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #111' }}>
              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#111' }}>
                TOTAL
              </td>
              {(['calories', 'protein', 'carbs', 'fats'] as const).map((key) => {
                const sum = days.reduce(
                  (s, { day, totals }) =>
                    s + (day.isDismissed || day.meals.length === 0 ? 0 : totals[key]),
                  0
                )
                return (
                  <td
                    key={key}
                    style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#111' }}
                  >
                    {Math.round(sum)}
                  </td>
                )
              })}
              <td style={{ padding: '0.5rem 0.75rem' }} />
            </tr>
          </tfoot>
        </table>

        <p style={{ marginTop: '3rem', fontSize: '0.75rem', color: '#888' }}>
          Generated{' '}
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
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
