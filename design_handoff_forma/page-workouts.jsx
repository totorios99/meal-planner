// === Page: Workouts (/workouts) ===
// Generate workout plans via AI + view saved workouts with exercise details.
//
// Production notes:
//   - POST /api/workouts/generate { goal, daysPerWeek, equipment } → SSE stream
//   - AI generates structured JSON: WorkoutPlan with days + exercises
//   - Save to Workout table in DB; auto-set isActive = true, deactivate previous
//   - GET /api/workouts → list all saved workouts

import { Icon } from './components.jsx';
import { mockWorkout } from './data.jsx';

export const PageWorkouts = () => {
  const [goal,        setGoal]        = React.useState('fat-loss');
  const [days,        setDays]        = React.useState('4');
  const [equip,       setEquip]       = React.useState('full-gym');
  const [expanded,    setExpanded]    = React.useState('w-1');
  const [expandedDay, setExpandedDay] = React.useState('0');

  const workout = mockWorkout;

  return (
    <div className="page-inner">
      <h1 className="t-title">Workouts</h1>

      {/* ── Generate form ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Generate New Plan</span>
        </div>
        <div className="generate-form">

          <div className="form-row">
            <label className="form-label">Goal</label>
            <div className="segmented">
              {[
                { v: 'fat-loss', l: 'Fat Loss'  },
                { v: 'muscle',   l: 'Build'     },
                { v: 'maintain', l: 'Maintain'  },
              ].map(o => (
                <button
                  key={o.v}
                  className={`seg-btn${goal === o.v ? ' active' : ''}`}
                  onClick={() => setGoal(o.v)}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-row">
              <label className="form-label">Days / week</label>
              <select className="form-select" value={days} onChange={e => setDays(e.target.value)}>
                {[2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} days</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Equipment</label>
              <select className="form-select" value={equip} onChange={e => setEquip(e.target.value)}>
                <option value="full-gym">Full gym</option>
                <option value="home-basic">Home / basic</option>
                <option value="bodyweight">Bodyweight only</option>
              </select>
            </div>
          </div>

          <button className="btn btn-energy btn-full">
            <Icon name="bolt" size={16} />
            Generate Workout Plan
          </button>
        </div>
      </div>

      {/* ── Saved workouts ── */}
      <div>
        <div className="section-head">
          <span className="section-label">Saved Workouts</span>
        </div>

        <div className="workout-card">
          <div className="workout-card-head">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{workout.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                {workout.daysPerWeek} days/week · Fat loss · Full gym
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span className="chip chip-success">Active</span>
              <div
                style={{ color: 'var(--ink-3)', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded ? null : 'w-1')}
              >
                <Icon name="chevron" size={18} />
              </div>
            </div>
          </div>

          {expanded && workout.days.map((d, i) => {
            const isOpen = expandedDay === String(i);
            return (
              <div key={i} className="workout-day">
                <div
                  className="workout-day-label"
                  onClick={() => setExpandedDay(isOpen ? null : String(i))}
                >
                  <span>{d.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    {d.focus}
                  </span>
                </div>
                {isOpen && d.exercises.map(e => (
                  <div key={e.name} className="exercise-row">
                    <span className="exercise-name">{e.name}</span>
                    <span className="exercise-sets">
                      {e.sets}×{e.reps}
                      {e.notes && <span style={{ color: 'var(--ink-4)', fontSize: 11 }}> · {e.notes}</span>}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
