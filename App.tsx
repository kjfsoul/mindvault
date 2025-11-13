
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ConsentModal from './components/ConsentModal';

const App: React.FC = () => {
  const [hasConsented, setHasConsented] = useState<boolean>(false);

  const handleConsent = () => {
    setHasConsented(true);
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      {!hasConsented && <ConsentModal onAccept={handleConsent} />}
      {hasConsented && <Dashboard />}
    </div>
  );
};

export default App;
