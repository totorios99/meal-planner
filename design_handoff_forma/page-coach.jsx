// === Page: Coach (/coach) ===
// AI chat interface — section-by-section questionnaire → plan generation.
//
// Production implementation notes:
//   - POST /api/coach/message  → { role, content, section, sessionId }
//   - GET  /api/coach/stream   → SSE stream for AI response (use ReadableStream)
//   - After section 4, trigger full plan generation with Anthropic SDK (server-side)
//   - Stream the plan response; parse structured JSON when done
//   - Save plan to DB; return planId; render <PlanResultCard plan={...} />
//   - ANTHROPIC_API_KEY must be in server env (never expose to client)

import { Icon, CoachProgress, PlanResultCard, TypingIndicator } from './components.jsx';
import { mockNutritionPlan } from './data.jsx';

export const PageCoach = () => {
  const [showPlan, setShowPlan] = React.useState(false);
  const [expandedDay, setExpandedDay] = React.useState(null);
  const messagesEndRef = React.useRef(null);

  return (
    <>
      {/* Section progress: 4 segments, all done = section 5 */}
      <CoachProgress section={5} />

      <div className="chat-container">
        <div className="chat-messages">

          {/* ── Section 1 ── */}
          <div className="msg-section-tag">Section 1 — Your Stats</div>

          <div className="msg-row">
            <div className="ai-avatar">🤖</div>
            <div className="msg-bubble msg-ai">
              Hey! I'm your AI nutrition coach. Let's build your personalised fat-loss plan.<br /><br />
              First — tell me about yourself:<br />
              • Age · Biological sex · Height · Current weight<br />
              • Goal weight (or goal look/feel)<br />
              • How fast you want to lose it
            </div>
          </div>

          <div className="msg-row user">
            <div className="user-avatar">A</div>
            <div className="msg-bubble msg-user">
              32 / male / 180cm / 82kg. Goal is 75kg — about a year, steady and sustainable.
            </div>
          </div>

          {/* ── Section 2 ── */}
          <div className="msg-section-tag">Section 2 — Lifestyle</div>

          <div className="msg-row">
            <div className="ai-avatar">🤖</div>
            <div className="msg-bubble msg-ai">
              7 kg at a steady pace is very achievable. Now lifestyle:<br /><br />
              • Job type · Exercise days + type<br />
              • Sleep hours · Stress level<br />
              • Alcohol — drink? How much/week?
            </div>
          </div>

          <div className="msg-row user">
            <div className="user-avatar">A</div>
            <div className="msg-bubble msg-user">
              Desk job. Gym 3×/week, mostly weights. 7hrs sleep. Moderate stress. ~8 drinks/week.
            </div>
          </div>

          {/* ── Section 3 ── */}
          <div className="msg-section-tag">Section 3 — Food Preferences</div>

          <div className="msg-row">
            <div className="ai-avatar">🤖</div>
            <div className="msg-bubble msg-ai">
              Gym 3× + desk job = lightly active. Now the fun part — food!<br /><br />
              • Top 5 favourite meals/cuisines<br />
              • Foods you'd never eat<br />
              • Dietary restrictions or allergies<br />
              • Cooking style (scratch / quick / batch prep)<br />
              • Adventurousness 1–10
            </div>
          </div>

          <div className="msg-row user">
            <div className="user-avatar">A</div>
            <div className="msg-bubble msg-user">
              Love tacos, sushi, pasta, BBQ, steak. Never liver or anchovies. No restrictions. Quick meals mostly. Adventurousness 7/10.
            </div>
          </div>

          {/* ── Section 4 ── */}
          <div className="msg-section-tag">Section 4 — Snack Habits</div>

          <div className="msg-row">
            <div className="ai-avatar">🤖</div>
            <div className="msg-bubble msg-ai">
              Great variety — this plan is going to be good. Last section:<br /><br />
              • What snacks do you reach for?<br />
              • Hunger / boredom / habit?<br />
              • Sweet or savoury preference?<br />
              • Late-night snacking?
            </div>
          </div>

          <div className="msg-row user">
            <div className="user-avatar">A</div>
            <div className="msg-bubble msg-user">
              Usually chips, chocolate, granola bars. Boredom mostly. Both sweet and savoury. Yeah, sometimes late-night — cereal or biscuits.
            </div>
          </div>

          {/* ── Generating / Show plan button ── */}
          {!showPlan && (
            <>
              <div className="msg-row">
                <div className="ai-avatar">🤖</div>
                <div className="msg-bubble msg-ai">
                  <div style={{ marginBottom: 'var(--sp-2)' }}>
                    Perfect — I have everything I need. Crunching your numbers now...
                  </div>
                  <TypingIndicator />
                </div>
              </div>
              <button
                className="btn btn-energy btn-full"
                style={{ marginTop: 'var(--sp-2)' }}
                onClick={() => setShowPlan(true)}
              >
                <Icon name="sparkle" size={16} />
                See Generated Plan (demo)
              </button>
            </>
          )}

          {/* ── Plan result ── */}
          {showPlan && (
            <div className="msg-row">
              <div className="ai-avatar">🤖</div>
              <div style={{ flex: 1 }}>
                <div className="msg-bubble msg-ai" style={{ maxWidth: '100%', width: '100%', marginBottom: 'var(--sp-2)' }}>
                  Here's your personalised plan. Everything is calculated specifically for you — save it and you're good to go.
                </div>
                <PlanResultCard
                  plan={mockNutritionPlan}
                  onSave={() => alert('Plan saved!')}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="chat-input-area">
          <textarea
            className="chat-input"
            placeholder="Reply to coach..."
            rows={1}
          />
          <button className="chat-send">
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </>
  );
};
