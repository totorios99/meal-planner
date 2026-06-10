/* global React */
// Cookbook page — meal library grid.

const CookbookPage = ({ onAdd }) => {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("All");

  const tags = React.useMemo(() => {
    const s = new Set();
    window.MEALS.forEach(m => s.add(m.tag));
    return ["All", ...Array.from(s)];
  }, []);

  const meals = window.MEALS.filter(m => {
    if (filter !== "All" && m.tag !== filter) return false;
    if (q && !`${m.name} ${m.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Cookbook · {window.MEALS.length} meals</div>
          <h1 className="page-title">Your <em>recipes,</em> with macros.</h1>
          <p className="page-sub">Tap any card to edit. New ideas slot straight into next week's plan.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost">
            <Icon name="sparkle" size={14} /> Generate ideas
          </button>
          <button className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" size={14} /> New meal
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} className="search-icon" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search meals, ingredients, tags…" />
        </div>
        <div className="chips">
          {tags.map(t => (
            <button key={t}
                    className={`chip ${filter === t ? "active" : ""}`}
                    onClick={() => setFilter(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No meals match that.</div>
          <p style={{ fontSize: 14 }}>Try clearing the filter or search.</p>
        </div>
      ) : (
        <div className="meal-grid">
          {meals.map(m => (
            <div key={m.id} className="meal-card">
              <div className="meal-card-img">
                <img src={m.photo} alt={m.name} />
                <span className="meal-tag">{m.tag}</span>
                <div className="meal-card-img-overlay">
                  <button className="icon-btn" title="Edit"><Icon name="edit" size={15} /></button>
                  <button className="icon-btn" title="Delete"><Icon name="trash" size={15} /></button>
                </div>
              </div>
              <div className="meal-card-body">
                <h3 className="meal-name">{m.name}</h3>
                <p className="meal-desc">{m.description}</p>
                <div className="macro-row">
                  <div className="macro-chip kcal">
                    <span className="macro-chip-label">kcal</span>
                    <span className="macro-chip-value num">{m.kcal}</span>
                  </div>
                  <div className="macro-chip protein">
                    <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--protein)", marginRight: 4 }} />Protein</span>
                    <span className="macro-chip-value num">{m.protein}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                  </div>
                  <div className="macro-chip carbs">
                    <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--carbs)", marginRight: 4 }} />Carbs</span>
                    <span className="macro-chip-value num">{m.carbs}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                  </div>
                  <div className="macro-chip fats">
                    <span className="macro-chip-label"><span className="macro-dot" style={{ background: "var(--fats)", marginRight: 4 }} />Fats</span>
                    <span className="macro-chip-value num">{m.fats}<span style={{ color: "var(--ink-4)", fontSize: 11, marginLeft: 1 }}>g</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

window.CookbookPage = CookbookPage;
