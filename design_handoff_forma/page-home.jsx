// === Page: Home (/) ===
// Dashboard — greeting, quick actions, current targets, recent plan preview, hydration.

import { Icon, MacroRing } from './components.jsx';
import { mockNutritionPlan } from './data.jsx';

export const PageHome = ({ setPage }) => {
  const plan = mockNutritionPlan;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page-inner">

      {/* ── Greeting ── */}
      <div>
        <p className="t-caption" style={{ marginBottom: 2 }}>{today}</p>
        <h1 className="t-display">Morning, Antonio</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>7.0 kg to goal · On track</p>
      </div>

      {/* ── Quick Generate ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Quick Generate</span>
        </div>
        <div className="quick-tiles">
          <div className="quick-tile accent" onClick={() => setPage('coach')}>
            <div className="tile-icon">🥗</div>
            <div className="tile-label">Weekend</div>
            <div className="tile-title">Diet Plan</div>
          </div>
          <div className="quick-tile energy" onClick={() => setPage('workouts')}>
            <div className="tile-icon">🏋️</div>
            <div className="tile-label">Generate</div>
            <div className="tile-title">Workout</div>
          </div>
        </div>
      </div>

      {/* ── Current Targets ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Current Targets</span>
        </div>
        <div className="card">
          <div className="card-body">
            {/* Ring + macro breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
              <MacroRing
                protein={plan.targetProtein}
                carbs={plan.targetCarbs}
                fats={plan.targetFats}
                totalKcal={plan.targetKcal}
              />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                    {plan.targetKcal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>kcal / day</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {[
                    { label: 'Protein', g: plan.targetProtein, color: 'var(--protein)' },
                    { label: 'Carbs',   g: plan.targetCarbs,   color: 'var(--carbs)'   },
                    { label: 'Fats',    g: plan.targetFats,    color: 'var(--fats)'    },
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1 }}>{m.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.g}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Goal progress bar */}
            <div style={{ background: 'var(--bg-sunken)', borderRadius: 'var(--r-lg)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <Icon name="target" size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>82 kg → 75 kg</span>
                  <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>−3 kg done</span>
                </div>
                <div className="stat-bar">
                  <div style={{ height: '100%', width: '43%', background: 'var(--success)', borderRadius: 'var(--r-full)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Last Plan Preview ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Last Plan</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('plans')}>
            All plans
          </button>
        </div>
        <div className="card">
          <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{plan.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                2 days · {plan.targetKcal.toLocaleString()} kcal/day
              </div>
            </div>
            <span className="chip chip-success">✓ Saved</span>
          </div>
          <div style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-3)' }}>
            {[
              { l: 'Protein', v: `${plan.targetProtein}g`, c: 'var(--protein)' },
              { l: 'Carbs',   v: `${plan.targetCarbs}g`,   c: 'var(--carbs)'   },
              { l: 'Fats',    v: `${plan.targetFats}g`,    c: 'var(--fats)'    },
            ].map(m => (
              <div key={m.l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hydration ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Hydration Today</span>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ width: 56, height: 56, background: 'var(--accent-soft)', borderRadius: 'var(--r-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
              <Icon name="water" size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                {plan.hydration.targetL} L
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 'var(--sp-2)' }}>daily target</div>
              <div className="stat-bar">
                <div style={{ height: '100%', width: '65%', background: 'var(--accent)', borderRadius: 'var(--r-full)' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>2.1 L tracked today</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
