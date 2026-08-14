import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없습니다.');

createRoot(root).render(<App />);
