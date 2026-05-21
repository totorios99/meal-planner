import { prisma } from '@/lib/prisma'
import { PrintButton } from '@/components/print/PrintButton'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString('en-US', opts)
}

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

  const dateRange =
    fmtDate(weekStart, { month: 'short', day: 'numeric' }) +
    ' – ' +
    fmtDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })

  const days = plan.days.map((day) => {
    const totals = day.meals.reduce(
      (acc, wpm) => ({
        calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
        protein:  acc.protein  + wpm.meal.protein  * wpm.portionMultiplier,
        carbs:    acc.carbs    + wpm.meal.carbs    * wpm.portionMultiplier,
        fats:     acc.fats     + wpm.meal.fats     * wpm.portionMultiplier,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
    return { day, totals, isEmpty: day.meals.length === 0 }
  })

  return (
    <>
      {/* Screen toolbar */}
      <div className="print:hidden" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>Weekly Meal Reference</strong>
            <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: '#888' }}>{dateRange}</span>
          </div>
          <PrintButton />
        </div>
      </div>

      <div className="print-wrapper">
        <div className="page-header">
          <h1>Weekly Meal Reference</h1>
          <p>{dateRange}</p>
        </div>

        {/*
          Grid: 7 columns × 4 explicit rows
            row 1 = headings   (auto)
            row 2 = meals      (1fr — fills equally across all 7 cols)
            row 3 = totals     (auto — same grid row = same baseline ✓)
            row 4 = notes      (auto)
          Each section rendered in its own pass so grid row assignment is per-section, not per-day.
        */}
        <div className="week-grid">

          {/* ── Row 1: headings ── */}
          {days.map(({ day }) => (
            <div
              key={`h-${day.id}`}
              className="cell heading"
              style={{ gridColumn: day.dayIndex + 1, gridRow: 1 }}
            >
              {DAY_NAMES[day.dayIndex]}
              {day.isDismissed && <span className="off-badge"> off</span>}
            </div>
          ))}

          {/* ── Row 2: meals ── */}
          {days.map(({ day, isEmpty }) => (
            <div
              key={`m-${day.id}`}
              className="cell meals"
              style={{ gridColumn: day.dayIndex + 1, gridRow: 2 }}
            >
              {day.isDismissed || isEmpty ? (
                <span className="empty-label">
                  {day.isDismissed ? (day.justification || 'Day off') : 'No meals planned'}
                </span>
              ) : (
                day.meals.map((wpm) => {
                  const mult = wpm.portionMultiplier
                  return (
                    <div key={wpm.id} className="meal-item">
                      <div className="meal-name">
                        {wpm.meal.title}
                        {mult !== 1 && <span className="mult"> ×{mult}</span>}
                      </div>
                      <div className="meal-macros">
                        <span>{Math.round(wpm.meal.calories * mult)} kcal</span>
                        <span>P {Math.round(wpm.meal.protein * mult)}g</span>
                        <span>C {Math.round(wpm.meal.carbs * mult)}g</span>
                        <span>F {Math.round(wpm.meal.fats * mult)}g</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ))}

          {/* ── Row 3: totals (all same grid row → perfect alignment) ── */}
          {days.map(({ day, totals, isEmpty }) => (
            <div
              key={`t-${day.id}`}
              className="cell totals"
              style={{ gridColumn: day.dayIndex + 1, gridRow: 3 }}
            >
              {!day.isDismissed && !isEmpty && (
                <>
                  <div className="totals-row">
                    <span className="totals-label">Total</span>
                    <span>{Math.round(totals.calories)} kcal</span>
                  </div>
                  <div className="totals-macros">
                    <span>P {Math.round(totals.protein)}g</span>
                    <span>C {Math.round(totals.carbs)}g</span>
                    <span>F {Math.round(totals.fats)}g</span>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* ── Row 4: notes ── */}
          {days.map(({ day, isEmpty }) => (
            <div
              key={`n-${day.id}`}
              className="cell notes"
              style={{ gridColumn: day.dayIndex + 1, gridRow: 4 }}
            >
              {!day.isDismissed && !isEmpty && day.justification && (
                <span>📝 {day.justification}</span>
              )}
            </div>
          ))}

        </div>

        <p className="footer">
          Printed {fmtDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <style>{`
        .print-wrapper {
          font-family: Georgia, serif;
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header { margin-bottom: 0.75rem; }
        .page-header h1 { font-size: 1.1rem; font-weight: bold; color: #111; margin: 0 0 0.15rem; }
        .page-header p  { font-size: 0.8rem; color: #666; margin: 0; }

        /* Parent grid: 7 cols, 4 explicit rows */
        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: auto 1fr auto auto;
          border: 1.5px solid #111;
        }

        /* All cells share column borders */
        .cell {
          padding: 0.45rem 0.5rem;
          border-right: 1px solid #bbb;
          border-bottom: 1px solid #ddd;
          min-width: 0;
        }
        /* Last column: no right border */
        .cell[style*="gridColumn: 7"],
        .cell[style*="grid-column: 7"] { border-right: none; }

        /* Headings row */
        .cell.heading {
          font-size: 0.72rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #111;
          border-bottom: 1.5px solid #111;
        }
        .off-badge { font-weight: normal; color: #bbb; text-transform: none; letter-spacing: 0; font-size: 0.6rem; }

        /* Meals row */
        .cell.meals {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          align-content: start;
          border-bottom: none;
        }

        .empty-label { font-size: 0.65rem; color: #ccc; font-style: italic; display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; }

        .meal-item { border-bottom: 1px dotted #e5e5e5; padding-bottom: 0.2rem; }
        .meal-item:last-child { border-bottom: none; }
        .meal-name  { font-size: 0.7rem; color: #111; line-height: 1.3; }
        .mult       { font-size: 0.6rem; color: #aaa; }
        .meal-macros { display: flex; gap: 0.25rem; flex-wrap: wrap; font-size: 0.6rem; color: #888; margin-top: 0.1rem; }

        /* Totals row — strong top border anchors visual baseline */
        .cell.totals {
          border-top: 1.5px solid #111;
          border-bottom: none;
        }
        .totals-row    { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; color: #111; }
        .totals-label  { text-transform: uppercase; font-size: 0.6rem; letter-spacing: 0.04em; }
        .totals-macros { display: flex; gap: 0.3rem; font-size: 0.6rem; color: #555; margin-top: 0.1rem; }

        /* Notes row */
        .cell.notes {
          font-size: 0.6rem;
          color: #888;
          font-style: italic;
          border-top: 1px dashed #ddd;
          min-height: 0;
        }

        .footer { margin-top: 0.75rem; font-size: 0.65rem; color: #bbb; font-family: sans-serif; }

        /* ── Dark mode: force print-wrapper to light appearance ── */
        :where(.dark) .print-wrapper { background: #fff; }
        :where(.dark) .week-grid { border-color: #111; }
        :where(.dark) .cell { border-right-color: #bbb; border-bottom-color: #ddd; }
        :where(.dark) .cell.heading { color: #111; border-bottom-color: #111; }
        :where(.dark) .cell.totals  { border-top-color: #111; }
        :where(.dark) .cell.notes   { color: #888; border-top-color: #ddd; }
        :where(.dark) .page-header h1 { color: #111; }
        :where(.dark) .page-header p  { color: #666; }
        :where(.dark) .meal-name    { color: #111; }
        :where(.dark) .meal-macros  { color: #888; }
        :where(.dark) .meal-item    { border-bottom-color: #e5e5e5; }
        :where(.dark) .totals-row   { color: #111; }
        :where(.dark) .totals-macros { color: #555; }
        :where(.dark) .footer       { color: #bbb; }

        /* ── Print ── */
        @media print {
          .print\\:hidden { display: none !important; }
          @page { size: landscape; margin: 1cm; }
          body { margin: 0; }

          .print-wrapper { max-width: 100%; padding: 0; }
          .page-header h1 { font-size: 10pt; margin-bottom: 2pt; }
          .page-header p  { font-size: 7pt; margin-bottom: 5pt; }
          .week-grid      { border: 1pt solid #000; }
          .cell           { padding: 3pt 4pt; }
          .cell.heading   { font-size: 6.5pt; }
          .meal-name      { font-size: 6.5pt; }
          .meal-macros    { font-size: 5.5pt; }
          .totals-row     { font-size: 6.5pt; }
          .totals-macros  { font-size: 5.5pt; }
          .cell.notes     { font-size: 5.5pt; }
          .footer         { font-size: 5.5pt; margin-top: 4pt; }
        }
      `}</style>
    </>
  )
}
