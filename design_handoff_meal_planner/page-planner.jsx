/* global React */
// Planner page — weekly meal plan grid.

const { useState } = React;

const PlannerPage = ({ plan, setPlan, openMealPicker }) => {
  const today = "Tue";

  const updateDay = (dayKey, patch) => {
    setPlan(p => ({ ...p, [dayKey]: { ...p[dayKey], ...patch } }));
  };

  const updateItem = (dayKey, idx, patch) => {
    setPlan(p => ({
      ...p,
      [dayKey]: {
        ...p[dayKey],
        items: p[dayKey].items.map((it, i) => i === idx ? { ...it, ...patch } : it),
      },
    }));
  };

  const removeItem = (dayKey, idx) => {
    setPlan(p => ({
      ...p,
      [dayKey]: { ...p[dayKey], items: p[dayKey].items.filter((_, i) => i !== idx) },
    }));
  };

  const toggleOff = (dayKey) => {
    setPlan(p => {
      const d = p[dayKey];
      const next = { ...d, off: !d.off };
      if (next.off && !d.note) next.note = "Off day";
      return { ...p, [dayKey]: next };
    });
  };

  // Week aggregate
  const weekTotals = window.DAY_KEYS.reduce((acc, k) => {
    const t = window.dayTotals(plan[k]);
    acc.kcal += t.kcal;
    acc.protein += t.protein;
    acc.carbs += t.carbs;
    acc.fats += t.fats;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fats: 0 });
  const daysOn = window.DAY_KEYS.filter(k => !plan[k].off).length;

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Weekly planner</div>
          <h1 className="page-title">Week of <em>May 18.</em></h1>
          <p className="page-sub">{daysOn} days planned · {Math.round(weekTotals.kcal).toLocaleString()} kcal · {Math.round(weekTotals.protein)}g protein</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="week-nav">
            <button title="Previous week"><Icon name="chev-left" size={16} /></button>
            <span className="label num">May 18 – 24</span>
            <button title="Next week"><Icon name="chev-right" size={16} /></button>
          </div>
          <button className="btn btn-ghost">
            <Icon name="settings" size={14} /> Targets
          </button>
        </div>
      </div>

      <div className="quick-fill">
        <span className="quick-fill-label">
          <Icon name="sparkle" size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          Quick-fill from past week
        </span>
        <select defaultValue="">
          <option value="" disabled>— pick a week to copy from —</option>
          <option>May 11 – May 17 (3 days)</option>
          <option>May 4 – May 10 (5 days)</option>
          <option>Apr 27 – May 3 (7 days)</option>
        </select>
        <button className="btn btn-primary btn-sm">Apply</button>
      </div>

      <div className="planner-grid">
        {window.DAY_KEYS.map(k => {
          const d = plan[k];
          const totals = window.dayTotals(d);
          const isToday = k === today;
          return (
            <div key={k} className={`day-col ${isToday ? "today" : ""} ${d.off ? "off" : ""}`}>
              <div className="day-head">
                <div className="day-head-text">
                  <div className="day-name">{window.DAY_FULL[k]}</div>
                  <div className="day-date num">May {d.date}</div>
                </div>
                <button className="off-toggle" title={d.off ? "Mark as on" : "Mark as off"}
                        onClick={() => toggleOff(k)}>
                  <Icon name={d.off ? "trip" : "plus"} size={14} />
                </button>
              </div>

              {d.off ? (
                <div className="day-body" style={{ flex: 1 }}>
                  <div className="off-placeholder">
                    <Icon name="trip" size={28} />
                    <input className="off-placeholder-input"
                           value={d.note}
                           onChange={e => updateDay(k, { note: e.target.value })}
                           placeholder="Why off? (e.g. Trip, eating out)" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="day-body">
                    {d.items.map((it, idx) => {
                      const m = window.getMeal(it.mealId);
                      if (!m) return null;
                      return (
                        <div className="plan-meal" key={idx}>
                          <button className="plan-meal-remove" title="Remove" onClick={() => removeItem(k, idx)}>
                            <Icon name="x" size={11} />
                          </button>
                          <div className="plan-meal-name">{m.name}</div>
                          <div className="plan-meal-row">
                            <span className="plan-meal-kcal num">{m.kcal * it.qty} kcal</span>
                            <span className="qty-stepper">
                              <button onClick={() => updateItem(k, idx, { qty: Math.max(1, it.qty - 1) })}>
                                <Icon name="minus" size={10} />
                              </button>
                              <span className="qty-val">{it.qty}</span>
                              <button onClick={() => updateItem(k, idx, { qty: it.qty + 1 })}>
                                <Icon name="plus" size={10} />
                              </button>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <button className="add-meal-btn" onClick={() => openMealPicker(k)}>
                      <Icon name="plus" size={12} /> Add meal
                    </button>
                  </div>

                  <div className="day-foot">
                    <div className="day-totals">
                      <div className="day-total">
                        <span className="macro-dot" style={{ background: "var(--ink)" }} />
                        <span className="day-total-label">kcal</span>
                        <span className={`day-total-val num ${totals.kcal > window.TARGETS.kcal ? "over" : ""}`}>
                          {Math.round(totals.kcal)}<span style={{ color: "var(--ink-4)" }}>/{window.TARGETS.kcal}</span>
                        </span>
                      </div>
                      <div className="day-total">
                        <span className="macro-dot" style={{ background: "var(--protein)" }} />
                        <span className="day-total-label">P</span>
                        <span className={`day-total-val num ${totals.protein > window.TARGETS.protein ? "over" : ""}`}>
                          {Math.round(totals.protein)}<span style={{ color: "var(--ink-4)" }}>g</span>
                        </span>
                      </div>
                      <div className="day-total">
                        <span className="macro-dot" style={{ background: "var(--carbs)" }} />
                        <span className="day-total-label">C</span>
                        <span className={`day-total-val num ${totals.carbs > window.TARGETS.carbs ? "over" : ""}`}>
                          {Math.round(totals.carbs)}<span style={{ color: "var(--ink-4)" }}>g</span>
                        </span>
                      </div>
                      <div className="day-total">
                        <span className="macro-dot" style={{ background: "var(--fats)" }} />
                        <span className="day-total-label">F</span>
                        <span className={`day-total-val num ${totals.fats > window.TARGETS.fats ? "over" : ""}`}>
                          {Math.round(totals.fats)}<span style={{ color: "var(--ink-4)" }}>g</span>
                        </span>
                      </div>
                    </div>
                    <input className="day-note-input"
                           value={d.note}
                           onChange={e => updateDay(k, { note: e.target.value })}
                           placeholder="+ Add note" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

window.PlannerPage = PlannerPage;
