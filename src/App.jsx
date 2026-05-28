import React, { useState } from 'react';
import TheoryEngine from './components/TheoryEngine';
import WorkspaceIDE from './components/WorkspaceIDE';

function App() {
  const [view, setView] = useState('theory'); // 'theory' or 'ide'

  return (
    <div className="w-screen h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased overflow-hidden flex items-center justify-center">
      {view === 'theory' ? (
        <TheoryEngine onComplete={() => setView('ide')} />
      ) : (
        <WorkspaceIDE onBackToDashboard={() => setView('theory')} />
      )}
    </div>
  );
}

export default App;
