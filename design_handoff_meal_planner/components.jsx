/* global React */
// Shared UI components for the Meal Planner prototype.

const { useState, useEffect, useRef, useMemo } = React;

/* ============ Icons (inline SVG, stroke-based) ============ */
const Icon = ({ name, size = 16, className = "" }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "moon": return <svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>;
    case "sun": return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "minus": return <svg {...props}><path d="M5 12h14"/></svg>;
    case "x": return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "edit": return <svg {...props}><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
    case "trash": return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    case "chev-left": return <svg {...props}><path d="m15 18-6-6 6-6"/></svg>;
    case "chev-right": return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>;
    case "chev-down": return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>;
    case "printer": return <svg {...props}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "book": return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>;
    case "home": return <svg {...props}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>;
    case "flame": return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a7 7 0 0 0 7-7c0-4-2-5-3-7-3 3-3 5-3 7a3 3 0 0 1-3 3 3 3 0 0 1-3-3c0-1 1-3 1-3-2 2-3 4-3 6.5A6.5 6.5 0 0 0 11 21a6.5 6.5 0 0 0 6.5-6.5"/></svg>;
    case "trip": return <svg {...props}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8l-8.2-1.8L3 8l8 5-3 3-3-1-1 1 4 2 2 4 1-1-1-3 3-3 5 8z"/></svg>;
    case "sparkle": return <svg {...props}><path d="M12 3v6m0 6v6M3 12h6m6 0h6"/></svg>;
    case "arrow-right": return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "more": return <svg {...props}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
    case "check": return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    default: return null;
  }
};

/* ============ Macro Ring (SVG donut) ============ */
const MacroRing = ({ totals, targets, size = 96, thickness = 10 }) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const order = ["protein", "carbs", "fats"];
  const colors = { protein: "var(--protein)", carbs: "var(--carbs)", fats: "var(--fats)" };
  // total kcal pct used as the overall ring; segments scaled to per-macro pct
  let offset = 0;
  const total = order.reduce((s, k) => s + Math.min(1, totals[k] / targets[k]), 0);
  // For visual purposes show each macro as an arc proportional to its pct (clamped 0..1)
  const kcalPct = Math.min(1, totals.kcal / targets.kcal);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--bg-sunken)" strokeWidth={thickness} fill="none" />
      {order.map((k, i) => {
        const pct = Math.min(1, totals[k] / targets[k]);
        const len = c * pct / 3;
        const startOffset = -c * (i / 3);
        const dash = `${len} ${c - len}`;
        return (
          <circle
            key={k}
            cx={size/2} cy={size/2} r={r}
            stroke={colors[k]} strokeWidth={thickness} fill="none"
            strokeDasharray={dash}
            strokeDashoffset={startOffset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray .4s ease" }}
          />
        );
      })}
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--serif)" fontSize={size*0.26} fill="var(--ink)" fontWeight="500">
        {Math.round(kcalPct * 100)}<tspan fontSize={size*0.13} fill="var(--ink-3)">%</tspan>
      </text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--sans)" fontSize={size*0.10} fill="var(--ink-3)"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
        kcal
      </text>
    </svg>
  );
};

/* ============ Macro rows (compact) ============ */
const MacroRows = ({ totals, targets, compact = false }) => {
  const items = [
    { key: "protein", label: "Protein", unit: "g", color: "var(--protein)" },
    { key: "carbs", label: "Carbs", unit: "g", color: "var(--carbs)" },
    { key: "fats", label: "Fats", unit: "g", color: "var(--fats)" },
  ];
  return (
    <div className="macros-rows">
      {items.map(it => {
        const v = totals[it.key];
        const t = targets[it.key];
        const pct = Math.min(100, Math.round((v / t) * 100));
        const over = v > t;
        return (
          <div className="macro-row-item" key={it.key}>
            <div className="macro-row-label">
              <span className="macro-dot" style={{ background: it.color, marginRight: 6 }} />
              {it.label}
            </div>
            <div className="macro-row-bar">
              <div className="macro-row-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: over ? "var(--warn)" : it.color }} />
            </div>
            <div className="macro-row-val">
              {Math.round(v)}<span style={{ color: "var(--ink-4)" }}>/{t}{it.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ============ Nav ============ */
const Nav = ({ route, setRoute, resolvedTheme, themePref, setTheme }) => {
  const links = [
    { id: "home", label: "Home", icon: "home" },
    { id: "cookbook", label: "Cookbook", icon: "book" },
    { id: "planner", label: "Planner", icon: "calendar" },
    { id: "print", label: "Print", icon: "printer" },
  ];
  const isDark = resolvedTheme === "dark";
  const themeTitle = themePref === "system" ? "Following system — tap to override" : `${themePref[0].toUpperCase()}${themePref.slice(1)} — tap to switch`;
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <button className="brand" onClick={() => setRoute("home")}>
            <span className="brand-mark">M</span>
            Mise
          </button>
          <div className="nav-links">
            {links.map(l => (
              <button key={l.id}
                      className={`nav-link ${route === l.id ? "active" : ""}`}
                      onClick={() => setRoute(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="nav-spacer" />
          <div className="nav-actions">
            <button className="icon-btn" title={themeTitle} onClick={setTheme}>
              <Icon name={isDark ? "sun" : "moon"} size={17} />
              {themePref === "system" && <span className="auto-dot" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar">
        {links.map(l => (
          <button key={l.id}
                  className={`tab ${route === l.id ? "active" : ""}`}
                  onClick={() => setRoute(l.id)}>
            <Icon name={l.icon} size={20} />
            <span>{l.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

Object.assign(window, { Icon, MacroRing, MacroRows, Nav });
