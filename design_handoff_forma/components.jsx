// === Forma Shared Components ===
// All components are production-ready shapes.
// Uses: React, CSS custom properties from tokens.css.
// No Tailwind — pure CSS classes.

// ─── Icons ────────────────────────────────────────────────────────────────────
export const Icon = ({ name, size = 22, stroke = 1.8, style: extraStyle }) => {
  const s = {
    width: size, height: size,
    fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    ...extraStyle,
  };
  const icons = {
    home:      <svg viewBox="0 0 24 24" style={s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    coach:     <svg viewBox="0 0 24 24" style={s}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    plans:     <svg viewBox="0 0 24 24" style={s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    workouts:  <svg viewBox="0 0 24 24" style={s}><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    sun:       <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon:      <svg viewBox="0 0 24 24" style={s}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    send:      <svg viewBox="0 0 24 24" style={s}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    chevron:   <svg viewBox="0 0 24 24" style={s}><polyline points="6 9 12 15 18 9"/></svg>,
    plus:      <svg viewBox="0 0 24 24" style={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check:     <svg viewBox="0 0 24 24" style={s}><polyline points="20 6 9 17 4 12"/></svg>,
    bolt:      <svg viewBox="0 0 24 24" style={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    sparkle:   <svg viewBox="0 0 24 24" style={s}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>,
    target:    <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    water:     <svg viewBox="0 0 24 24" style={s}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
    arrow:     <svg viewBox="0 0 24 24" style={s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    calendar:  <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  };
  return icons[name] || null;
};

// ─── Macro Ring (SVG donut) ────────────────────────────────────────────────────
// protein/carbs/fats in grams; size in px
export const MacroRing = ({ protein, carbs, fats, totalKcal, size = 110 }) => {
  const r = (size - 16) / 2;
  const circumference = Math.PI * 2 * r;
  const gap = 3;
  const proteinCal = protein * 4;
  const carbsCal   = carbs   * 4;
  const fatsCal    = fats    * 9;
  const total = proteinCal + carbsCal + fatsCal || 1;

  let offset = 0;
  const segment = (cal, color) => {
    const pct  = cal / total;
    const dash = Math.max(0, pct * circumference - gap);
    const el = (
      <circle
        key={color}
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s' }}
      />
    );
    offset += pct * circumference;
    return el;
  };

  return (
    <div className="ring-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={8} />
        {segment(proteinCal, 'var(--protein)')}
        {segment(carbsCal,   'var(--carbs)')}
        {segment(fatsCal,    'var(--fats)')}
      </svg>
      <div className="ring-center-text">
        <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{totalKcal.toLocaleString()}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>kcal</span>
      </div>
    </div>
  );
};

// ─── Top Nav ──────────────────────────────────────────────────────────────────
export const TopNav = ({ title, dark, toggleDark, right }) => (
  <nav className="top-nav">
    <div className="nav-brand">
      <div className="brand-icon">F</div>
      <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
        {title || 'Forma'}
      </span>
    </div>
    <div className="nav-actions">
      {right}
      <button className="icon-btn" onClick={toggleDark} title="Toggle theme">
        <Icon name={dark ? 'sun' : 'moon'} size={18} />
      </button>
    </div>
  </nav>
);

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
export const TabBar = ({ active, setPage }) => {
  const tabs = [
    { id: 'home',     label: 'Home',     icon: 'home' },
    { id: 'coach',    label: 'Coach',    icon: 'coach' },
    { id: 'plans',    label: 'Plans',    icon: 'plans' },
    { id: 'workouts', label: 'Workouts', icon: 'workouts' },
  ];
  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-item${active === t.id ? ' active' : ''}`}
          onClick={() => setPage(t.id)}
        >
          {active === t.id && <span className="tab-dot" />}
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ─── Typing Indicator (used in chat while AI "thinks") ────────────────────────
export const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
  </div>
);

// ─── Coach Progress Bar ───────────────────────────────────────────────────────
// section: 1–4, 5 = complete
export const CoachProgress = ({ section }) => (
  <div className="coach-progress">
    {[1, 2, 3, 4].map(i => (
      <div
        key={i}
        className={`progress-dot${i < section ? ' done' : ''}${i === section ? ' active' : ''}`}
      />
    ))}
  </div>
);

// ─── Plan Result Card (rendered inside chat after AI finishes) ────────────────
// Receives a full NutritionPlan object
export const PlanResultCard = ({ plan, onSave }) => {
  const [expandedDay, setExpandedDay] = React.useState(null);
  const [expandedSection, setExpandedSection] = React.useState(null);

  const sections = [
    {
      id: 'snacks', label: '🍫 Snack Swaps',
      content: (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          {plan.snackSwaps.map((s, i) => (
            <div key={i} className="snack-swap-row">
              <span className="snack-before">{s.before}</span>
              <span className="snack-arrow">→</span>
              <span className="snack-after">{s.after}</span>
              <span className="snack-kcal">{s.kcal} kcal</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'rules', label: '⚡ Your 5 Rules',
      content: (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          {plan.rules.map((r, i) => (
            <div key={i} className="rule-item">
              <div className="rule-num">{i + 1}</div>
              <div className="rule-text">{r}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'timeline', label: '📅 Timeline',
      content: (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          {plan.timeline.map((t, i) => (
            <div key={i} className="rule-item">
              <span className="chip chip-accent" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{t.period}</span>
              <div className="rule-text" style={{ fontSize: 13 }}>{t.text}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'hydration', label: '💧 Hydration',
      content: (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>{plan.hydration.targetL} L / day</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 'var(--sp-3)' }}>
            Based on weight + activity level
          </div>
          {plan.hydration.tips.map((t, i) => (
            <div key={i} className="rule-item">
              <div className="rule-num" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 16 }}>💧</div>
              <div className="rule-text">{t}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'supplements', label: '💊 Supplements',
      content: (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          {plan.supplements.map((s, i) => (
            <div key={i} className="supplement-row">
              <div className="supp-icon">{s.icon}</div>
              <div>
                <div className="supp-name">{s.name}</div>
                <div className="supp-detail">{s.dose} · {s.timing}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.why}</div>
              </div>
            </div>
          ))}
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', fontSize: 13, color: 'var(--ink-3)', marginTop: 'var(--sp-2)', fontStyle: 'italic' }}>
            Supplements are the 1%. Food, training, sleep, and consistency are the 99%.
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="plan-result-card">
      <div className="plan-result-header">
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 4 }}>
          Your Fat Loss Plan
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          BMR {plan.bmr.toLocaleString()} · TDEE {plan.tdee.toLocaleString()} · −{plan.deficit} kcal deficit
        </div>
      </div>

      {/* Daily targets */}
      <div className="plan-result-targets">
        {[
          { v: plan.targetKcal.toLocaleString(), l: 'kcal' },
          { v: `${plan.targetProtein}g`, l: 'protein' },
          { v: `${plan.targetCarbs}g`,   l: 'carbs' },
          { v: `${plan.targetFats}g`,    l: 'fats' },
        ].map(t => (
          <div key={t.l} className="target-stat">
            <div className="val">{t.v}</div>
            <div className="lbl">{t.l}</div>
          </div>
        ))}
      </div>

      {/* 7-day accordion */}
      <div>
        <div style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          7-Day Meal Plan
        </div>
        {plan.days.map((d, i) => (
          <React.Fragment key={d.day}>
            <div className="plan-day-row" onClick={() => setExpandedDay(expandedDay === i ? null : i)}>
              <div>
                <div className="plan-day-name">{d.day}</div>
                <div className="plan-day-theme">{d.theme}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <span className="plan-day-kcal">{d.totalKcal} kcal</span>
                <div style={{ transform: expandedDay === i ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: 'var(--ink-3)' }}>
                  <Icon name="chevron" size={16} />
                </div>
              </div>
            </div>
            {expandedDay === i && d.meals.length > 0 && (
              <div className="day-meals">
                {d.meals.map(m => (
                  <div key={m.name} className="meal-row">
                    <span className="meal-type">{m.type}</span>
                    <span className="meal-name">{m.name}</span>
                    <span className="meal-kcal">{m.kcal}</span>
                  </div>
                ))}
                <div className="day-total">
                  <span style={{ color: 'var(--protein)' }}>P {d.totalProtein}g</span>
                  <span style={{ color: 'var(--carbs)' }}>C {d.totalCarbs}g</span>
                  <span style={{ color: 'var(--fats)' }}>F {d.totalFats}g</span>
                  <span style={{ fontWeight: 700 }}>{d.totalKcal} kcal</span>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Collapsible sections */}
      {sections.map(sec => (
        <React.Fragment key={sec.id}>
          <div
            style={{ padding: '10px var(--sp-4)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg)' }}
            onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{sec.label}</span>
            <div style={{ transform: expandedSection === sec.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: 'var(--ink-3)' }}>
              <Icon name="chevron" size={16} />
            </div>
          </div>
          {expandedSection === sec.id && sec.content}
        </React.Fragment>
      ))}

      <div style={{ padding: 'var(--sp-4)' }}>
        <button className="btn btn-primary btn-full btn-lg" onClick={onSave}>
          <Icon name="check" size={18} />
          Save This Plan
        </button>
      </div>
    </div>
  );
};
