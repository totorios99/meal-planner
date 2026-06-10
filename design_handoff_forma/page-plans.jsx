// === Page: Plans (/plans) ===
// Saved nutrition + workout plans list with expand/collapse day view.

import { Icon } from './components.jsx';
import { mockNutritionPlan } from './data.jsx';

export const PagePlans = () => {
  const [expandedPlan, setExpandedPlan] = React.useState(null);
  const [expandedDay, setExpandedDay]   = React.useState(null);
  const [activeTab, setActiveTab]       = React.useState('all');

  // In production: fetch from /api/plans
  const plans = [
    { id: 'p1', type: 'nutrition', label: 'Jun 7–8 Weekend Plan', date: 'Jun 7, 2026',  data: mockNutritionPlan },
    { id: 'p2', type: 'nutrition', label: 'May 31–Jun 1 Weekend',  date: 'May 31, 2026', data: mockNutritionPlan },
    { id: 'p3', type: 'nutrition', label: 'May 24–25 Weekend',     date: 'May 24, 2026', data: mockNutritionPlan },
  ];

  const tabs = [
    { id: 'all',       label: 'All' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'workout',   label: 'Workout' },
  ];

  const filtered = activeTab === 'all' ? plans : plans.filter(p => p.type === activeTab);

  return (
    <div className="page-inner">
      <h1 className="t-title">My Plans</h1>

      {/* ── Filter tabs ── */}
      <div className="segmented">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`seg-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plan list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="icon">📋</div>
            <div>No {activeTab} plans yet.</div>
          </div>
        )}

        {filtered.map(p => {
          const plan = p.data;
          return (
            <div key={p.id} className="plan-item">
              {/* Plan header */}
              <div
                className="plan-item-head"
                onClick={() => setExpandedPlan(expandedPlan === p.id ? null : p.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.date}</span>
                    <span className="chip chip-accent">{plan.targetKcal.toLocaleString()} kcal</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
                    {[
                      { l: 'P', v: `${plan.targetProtein}g`, c: 'var(--protein)' },
                      { l: 'C', v: `${plan.targetCarbs}g`,   c: 'var(--carbs)'   },
                      { l: 'F', v: `${plan.targetFats}g`,    c: 'var(--fats)'    },
                    ].map(m => (
                      <span key={m.l} style={{ fontSize: 12, fontWeight: 700, color: m.c }}>
                        {m.l} {m.v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`plan-expand${expandedPlan === p.id ? ' open' : ''}`}>
                  <Icon name="chevron" size={18} />
                </div>
              </div>

              {/* Expanded: day list */}
              {expandedPlan === p.id && plan.days.map((d, i) => {
                const key = `${p.id}-${i}`;
                const isOpen = expandedDay === key;
                return (
                  <div key={d.day} className="day-meals">
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedDay(isOpen ? null : key)}
                    >
                      <div className="day-theme">{d.day} · {d.theme}</div>
                      <div style={{ color: 'var(--ink-3)', transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                        <Icon name="chevron" size={14} />
                      </div>
                    </div>

                    {isOpen && d.meals.length > 0 && (
                      <>
                        {d.meals.map(m => (
                          <div key={m.name} className="meal-row">
                            <span className="meal-type">{m.type}</span>
                            <span className="meal-name">{m.name}</span>
                            <span className="meal-kcal">{m.kcal} kcal</span>
                          </div>
                        ))}
                        <div className="day-total">
                          <span style={{ color: 'var(--protein)' }}>P {d.totalProtein}g</span>
                          <span style={{ color: 'var(--carbs)' }}>C {d.totalCarbs}g</span>
                          <span style={{ color: 'var(--fats)' }}>F {d.totalFats}g</span>
                          <span style={{ fontWeight: 700 }}>{d.totalKcal} kcal</span>
                        </div>
                      </>
                    )}

                    {isOpen && d.meals.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', paddingTop: 4, fontStyle: 'italic' }}>
                        Detailed meals not expanded in this view.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
