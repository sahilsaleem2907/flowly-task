import React, { useState } from 'react';
import AuthPage from './pages/AuthPage';
import DocumentPage from './pages/DocumentPage';
import type { User } from './types/User';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'auth' | 'document'>('auth');
  const { currentUser, signIn, signOut, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('document');
    } else {
      setCurrentPage('auth');
    }
  }, [isAuthenticated]);

  const handleNavigateToDocument = (user: User) => {
    signIn(user);
    setCurrentPage('document');
  };

  const handleNavigateToAuth = () => {
    signOut();
    setCurrentPage('auth');
  };

  return (
    <div className="App">
      {currentPage === 'auth' ? (
        <AuthPage
          onNavigateToDocument={handleNavigateToDocument}
        />
      ) : (
        <DocumentPage
          onNavigateToAuth={handleNavigateToAuth}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;