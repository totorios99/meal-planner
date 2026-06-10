/* global React */
// Print page — weekly fridge reference.

const PrintPage = ({ plan, setRoute }) => {
  return (
    <div className="print-shell">
      <div className="print-toolbar">
        <div className="print-toolbar-info">
          <span className="title">Weekly Reference</span>
          <span className="dates">May 18 – May 24, 2026</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setRoute("planner")}>
            <Icon name="edit" size={14} /> Edit plan
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="printer" size={14} /> Print
          </button>
        </div>
      </div>

      <div className="print-paper">
        <div className="print-paper-head">
          <h1>Weekly <em>Meal</em> Reference</h1>
          <div className="meta">
            <b>Week of May 18</b>
            May 18 – May 24, 2026<br/>
            Printed Thu, May 21
          </div>
        </div>

        <div className="print-table">
          {window.DAY_KEYS.map(k => {
            const d = plan[k];
            const totals = window.dayTotals(d);
            return (
              <div className="print-day" key={k}>
                <div className="print-day-head">
                  <span>{window.DAY_FULL[k]}</span>
                  {d.off ? <span className="off">off</span> : <span className="date">May {d.date}</span>}
                </div>

                {d.off ? (
                  <>
                    <div className="print-day-off-body">
                      {d.note || "Off day"}
                    </div>
                  </>
                ) : (
                  <>
                    {d.items.map((it, idx) => {
                      const m = window.getMeal(it.mealId);
                      if (!m) return null;
                      return (
                        <div className="print-meal" key={idx}>
                          <div className="print-meal-name">
                            {m.name}{it.qty > 1 && <span style={{ color: "#6B6357", fontWeight: 400 }}> × {it.qty}</span>}
                          </div>
                          <div className="print-meal-macros">
                            {m.kcal * it.qty} kcal · P {m.protein * it.qty}g · C {m.carbs * it.qty}g · F {m.fats * it.qty}g
                          </div>
                        </div>
                      );
                    })}
                    <div className="print-day-totals">
                      <div className="kcal">
                        <small>Total</small>
                        <span className="num">{Math.round(totals.kcal)}</span>
                      </div>
                      <div className="pcf num">P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fats)}g</div>
                    </div>
                    {d.note && <div className="print-day-note">{d.note}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="print-foot">
          <em>Mise · Meal planner</em>
          <span>For ingredients & cooking instructions, see the app.</span>
        </div>
      </div>
    </div>
  );
};

window.PrintPage = PrintPage;
