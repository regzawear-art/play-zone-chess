import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import MatchPage from './pages/MatchPage';
import './index.css';

const container = document.getElementById('root')!;
const root = createRoot(container);
const params = new URLSearchParams(window.location.search);
if (params.get('match') === '1' || window.location.pathname.startsWith('/match')) {
  root.render(
    <StrictMode>
      <MatchPage />
    </StrictMode>
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
