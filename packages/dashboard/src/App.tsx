import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Registry } from './pages/Registry.js';
import { MessageFlow } from './pages/MessageFlow.js';
import { Workflows } from './pages/Workflows.js';
import { Health } from './pages/Health.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/registry" replace />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/messages" element={<MessageFlow />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/health" element={<Health />} />
      </Route>
    </Routes>
  );
}
