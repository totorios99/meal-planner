/* global React, ReactDOM */
// Main app — router + sheets + tweaks integration.

const { useState, useEffect } = React;

/* ============ Meal picker sheet ============ */
const MealPickerSheet = ({ open, onClose, onPick }) => {
  const [q, setQ] = useState("");
  if (!open) return null;
  const meals = window.MEALS.filter(m =>
    !q || `${m.name} ${m.description}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3 className="sheet-title">Add a meal</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="sheet-body">
          <div className="search" style={{ maxWidth: "none", marginBottom: 12 }}>
            <Icon name="search" size={16} className="search-icon" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Find a meal…" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {meals.map(m => (
              <button key={m.id} className="sheet-meal-row" onClick={() => onPick(m.id)}>
                <div className="sheet-meal-thumb"><img src={m.photo} alt="" /></div>
                <div className="sheet-meal-info">
                  <div className="sheet-meal-name">{m.name}</div>
                  <div className="sheet-meal-meta">{m.kcal} kcal · P {m.protein}g · C {m.carbs}g · F {m.fats}g</div>
                </div>
                <Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ New meal sheet (mock) ============ */
const NewMealSheet = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3 className="sheet-title">New meal</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Name</label>
            <input placeholder="e.g. Salmon & Sweet Potato" />
          </div>
          <div className="field">
            <label>Description</label>
            <input placeholder="A one-line note" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            <div className="field"><label>kcal</label><input type="number" placeholder="620" /></div>
            <div className="field"><label>Protein</label><input type="number" placeholder="48" /></div>
            <div className="field"><label>Carbs</label><input type="number" placeholder="55" /></div>
            <div className="field"><label>Fats</label><input type="number" placeholder="22" /></div>
          </div>
          <div className="field">
            <label>Photo URL</label>
            <input placeholder="https://…" />
          </div>
        </div>
        <div className="sheet-foot">
          <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onClose}>Save meal</button>
        </div>
      </div>
    </div>
  );
};

/* ============ Tweaks defaults ============ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2F5237",
  "density": "standard",
  "theme": "system"
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  "#2F5237": "olive",
  "#B5563A": "terracotta",
  "#2A3343": "slate",
  "#14110D": "ink",
};

/* ============ App root ============ */
const App = () => {
  const [route, setRoute] = useState("home");
  const [plan, setPlan] = useState(window.INITIAL_PLAN);
  const [picker, setPicker] = useState({ open: false, dayKey: null });
  const [newMeal, setNewMeal] = useState(false);

  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Track the OS color scheme so "system" can follow it live.
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  const themePref = tweaks.theme || "system";
  const resolvedTheme = themePref === "system" ? (systemDark ? "dark" : "light") : themePref;

  // Apply tweaks to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.setAttribute("data-accent", ACCENT_MAP[tweaks.accent] || "olive");
    document.documentElement.setAttribute("data-density", tweaks.density || "standard");
  }, [resolvedTheme, tweaks.accent, tweaks.density]);

  // Nav toggle sets an explicit override opposite to what's currently showing.
  const setTheme = () => setTweak("theme", resolvedTheme === "dark" ? "light" : "dark");

  const openMealPicker = (dayKey) => setPicker({ open: true, dayKey });
  const closePicker = () => setPicker({ open: false, dayKey: null });
  const pickMeal = (mealId) => {
    setPlan(p => ({
      ...p,
      [picker.dayKey]: {
        ...p[picker.dayKey],
        items: [...p[picker.dayKey].items, { mealId, qty: 1 }],
      },
    }));
    closePicker();
  };

  return (
    <div className="app">
      <Nav route={route} setRoute={setRoute} resolvedTheme={resolvedTheme} themePref={themePref} setTheme={setTheme} />
      {route === "home" && <window.HomePage plan={plan} setRoute={setRoute} />}
      {route === "cookbook" && <window.CookbookPage onAdd={() => setNewMeal(true)} />}
      {route === "planner" && <window.PlannerPage plan={plan} setPlan={setPlan} openMealPicker={openMealPicker} />}
      {route === "print" && <window.PrintPage plan={plan} setRoute={setRoute} />}

      <MealPickerSheet open={picker.open} onClose={closePicker} onPick={pickMeal} />
      <NewMealSheet open={newMeal} onClose={() => setNewMeal(false)} />

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Theme">
          <window.TweakRadio
            label="Mode"
            value={themePref}
            options={[
              { value: "system", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={v => setTweak("theme", v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Accent">
          <window.TweakColor
            label="Color"
            value={tweaks.accent}
            options={["#2F5237", "#B5563A", "#2A3343", "#14110D"]}
            onChange={v => setTweak("accent", v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Density">
          <window.TweakRadio
            label="Spacing"
            value={tweaks.density}
            options={[
              { value: "compact", label: "Compact" },
              { value: "standard", label: "Standard" },
              { value: "cozy", label: "Cozy" },
            ]}
            onChange={v => setTweak("density", v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
