import { createRoot } from 'react-dom/client';
import App from './App.jsx';

try {
  if (localStorage.getItem('saju-theme') === 'dark') {
    document.documentElement.classList.add('theme-dark');
  }
} catch {
  /* ignore */
}

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없습니다.');

createRoot(root).render(<App />);
