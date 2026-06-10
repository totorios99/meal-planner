// === Forma App Root ===
// Client-side routing via useState; mirrors Next.js App Router pages.
// Production: replace with Next.js Link + usePathname.

import { TopNav, TabBar } from './components.jsx';
import { PageHome }     from './page-home.jsx';
import { PageCoach }    from './page-coach.jsx';
import { PagePlans }    from './page-plans.jsx';
import { PageWorkouts } from './page-workouts.jsx';

const PAGE_TITLES = {
  home:     'Forma',
  coach:    'AI Coach',
  plans:    'My Plans',
  workouts: 'Workouts',
};

const PAGES = {
  home:     PageHome,
  coach:    PageCoach,
  plans:    PagePlans,
  workouts: PageWorkouts,
};

export const App = () => {
  const [page, setPage] = React.useState('home');
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const PageComponent = PAGES[page];

  return (
    <div className="app-shell">
      <TopNav
        title={PAGE_TITLES[page]}
        dark={dark}
        toggleDark={() => setDark(d => !d)}
      />
      <main className="page-content">
        <PageComponent setPage={setPage} />
      </main>
      <TabBar active={page} setPage={setPage} />
    </div>
  );
};

// Mount (prototype only — Next.js handles this in production)
// ReactDOM.createRoot(document.getElementById('root')).render(<App />);
