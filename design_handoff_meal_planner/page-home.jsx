/* global React */
// Home page — at-a-glance dashboard.

const HomePage = ({ plan, setRoute, setPlannerFocus }) => {
  const today = "Tue"; // Tuesday May 19, 2026 — a typical cooking day in the demo plan
  const todayPlan = plan[today];
  const todayMeals = todayPlan?.items.map(it => ({ ...window.getMeal(it.mealId), qty: it.qty })) || [];
  const todayTotals = window.dayTotals(todayPlan);

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
  const weekTargets = {
    kcal: window.TARGETS.kcal * daysOn,
    protein: window.TARGETS.protein * daysOn,
    carbs: window.TARGETS.carbs * daysOn,
    fats: window.TARGETS.fats * daysOn,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Tuesday · May 19, 2026</div>
          <h1 className="page-title">Good morning, <em>Toto.</em></h1>
          <p className="page-sub">Three meals on the plan today. You're on track for the week.</p>
        </div>
      </div>

      {/* Today + Macros */}
      <div className="home-grid">
        <div className="today-card">
          <div className="today-head">
            <h2>Today's meals</h2>
            <span className="today-date">{todayMeals.length > 0 ? `${todayMeals.length} meals · ${Math.round(todayTotals.kcal)} kcal` : "Off day"}</span>
          </div>

          {todayPlan?.off ? (
            <div className="empty" style={{ padding: "32px 0" }}>
              <div className="empty-title">Off day — <em>{todayPlan.note || "no meals planned"}</em></div>
              <p style={{ marginTop: 4, fontSize: 14 }}>Enjoy the trip. We'll pick it back up tomorrow.</p>
            </div>
          ) : todayMeals.length === 0 ? (
            <div className="empty" style={{ padding: "32px 0" }}>
              <div className="empty-title">Nothing planned yet</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setRoute("planner")}>
                <Icon name="plus" size={14} /> Plan today
              </button>
            </div>
          ) : (
            <div className="today-meals">
              {todayMeals.map((m, i) => (
                <div className="today-meal" key={i}>
                  <div className="today-meal-thumb">
                    {m.photo ? <img src={m.photo} alt="" /> : <div className="photo-ph">{m.name?.[0]}</div>}
                  </div>
                  <div className="today-meal-info">
                    <div className="today-meal-name">{m.name}</div>
                    <div className="today-meal-meta">
                      <span><span className="macro-dot" style={{ background: "var(--protein)", marginRight: 4 }} />P {m.protein}g</span>
                      <span><span className="macro-dot" style={{ background: "var(--carbs)", marginRight: 4 }} />C {m.carbs}g</span>
                      <span><span className="macro-dot" style={{ background: "var(--fats)", marginRight: 4 }} />F {m.fats}g</span>
                    </div>
                  </div>
                  <div className="today-meal-kcal">{m.kcal * m.qty} kcal{m.qty > 1 && <div style={{ fontSize: 11, color: "var(--ink-4)" }}>× {m.qty}</div>}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setRoute("planner")}>
              <Icon name="calendar" size={14} /> Open planner
            </button>
            <button className="btn btn-quiet btn-sm" onClick={() => setRoute("cookbook")}>
              <Icon name="book" size={14} /> Browse meals
            </button>
          </div>
        </div>

        <div className="macros-block">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2>Today's macros</h2>
            <button className="btn btn-quiet btn-sm" style={{ padding: "4px 8px" }}>
              <Icon name="settings" size={13} /> Targets
            </button>
          </div>
          {todayPlan?.off ? (
            <div className="empty" style={{ padding: "20px 0" }}>
              <div style={{ fontSize: 14 }}>No macros tracked on off days.</div>
            </div>
          ) : (
            <div className="macros-ring-wrap">
              <MacroRing totals={todayTotals} targets={window.TARGETS} size={120} thickness={12} />
              <MacroRows totals={todayTotals} targets={window.TARGETS} />
            </div>
          )}
        </div>
      </div>

      {/* Week strip */}
      <div className="week-strip">
        <div className="week-strip-head">
          <h2>This week</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
              May 18 – May 24, 2026 · {daysOn} days on · {Math.round(weekTotals.kcal).toLocaleString()} kcal
            </span>
            <button className="section-link" onClick={() => setRoute("planner")}>
              Open planner <Icon name="arrow-right" size={12} />
            </button>
          </div>
        </div>
        <div className="week-strip-days">
          {window.DAY_KEYS.map(k => {
            const d = plan[k];
            const totals = window.dayTotals(d);
            const isToday = k === today;
            return (
              <button key={k}
                      className={`week-day ${isToday ? "today" : ""} ${d.off ? "off" : ""}`}
                      onClick={() => { setRoute("planner"); }}>
                <div className="week-day-name">{window.DAY_FULL[k].slice(0,3)}</div>
                <div className="week-day-date">{d.date}</div>
                {d.off ? (
                  <div className="week-day-off-label">{d.note || "Off day"}</div>
                ) : (
                  <div className="week-day-meals">
                    {d.items.slice(0, 3).map((it, i) => (
                      <div className="week-day-meal" key={i}>{window.getMeal(it.mealId)?.name}</div>
                    ))}
                  </div>
                )}
                <div className="week-day-kcal">{d.off ? "—" : `${Math.round(totals.kcal)} kcal`}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2 className="section-title">Quick actions</h2>
      </div>
      <div className="quick-actions">
        <button className="qa-card" onClick={() => setRoute("planner")}>
          <div className="qa-icon"><Icon name="sparkle" size={20} /></div>
          <div className="qa-text">
            <div className="qa-title">Plan the weekend</div>
            <div className="qa-sub">Pull from a past week or freestyle Sat & Sun</div>
          </div>
        </button>
        <button className="qa-card" onClick={() => setRoute("cookbook")}>
          <div className="qa-icon"><Icon name="plus" size={20} /></div>
          <div className="qa-text">
            <div className="qa-title">Add a new meal</div>
            <div className="qa-sub">Save a recipe with macros to reuse anytime</div>
          </div>
        </button>
        <button className="qa-card" onClick={() => setRoute("print")}>
          <div className="qa-icon"><Icon name="printer" size={20} /></div>
          <div className="qa-text">
            <div className="qa-title">Print this week</div>
            <div className="qa-sub">A clean reference for the fridge — no ingredients</div>
          </div>
        </button>
      </div>

      {/* Recent meals */}
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2 className="section-title">Recently added</h2>
        <button className="section-link" onClick={() => setRoute("cookbook")}>
          View cookbook <Icon name="arrow-right" size={12} />
        </button>
      </div>
      <div className="meal-grid">
        {window.MEALS.slice(0, 3).map(m => (
          <button key={m.id} className="meal-card" style={{ textAlign: "left" }} onClick={() => setRoute("cookbook")}>
            <div className="meal-card-img">
              <img src={m.photo} alt={m.name} />
              <span className="meal-tag">{m.tag}</span>
            </div>
            <div className="meal-card-body">
              <h3 className="meal-name">{m.name}</h3>
              <p className="meal-desc">{m.description}</p>
              <div className="macro-row">
                <div className="macro-chip kcal">
                  <span className="macro-chip-label">kcal</span>
                  <span className="macro-chip-value">{m.kcal}</span>
                </div>
                <div className="macro-chip protein">
                  <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--protein)", marginRight: 4 }} />Protein</span>
                  <span className="macro-chip-value">{m.protein}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                </div>
                <div className="macro-chip carbs">
                  <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--carbs)", marginRight: 4 }} />Carbs</span>
                  <span className="macro-chip-value">{m.carbs}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                </div>
                <div className="macro-chip fats">
                  <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--fats)", marginRight: 4 }} />Fats</span>
                  <span className="macro-chip-value">{m.fats}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

window.HomePage = HomePage;
