import React, { useState } from 'react';
import AuthPage from './pages/AuthPage';
import DocumentPage from './pages/DocumentPage';
import type { User } from './types/User';

import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'auth' | 'document' | 'fractional'>('auth');
  const { currentUser, signIn, signOut, isAuthenticated } = useAuth();

  // Set initial page based on authentication status
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

  const handleNavigateToFractional = () => {
    setCurrentPage('fractional');
  };



  return (
    <div className="App">
      {currentPage === 'auth' ? (
        <AuthPage
          onNavigateToDocument={handleNavigateToDocument}
          onNavigateToFractional={handleNavigateToFractional}
        />
      ) : currentPage === 'document' ? (
        <DocumentPage
          onNavigateToAuth={handleNavigateToAuth}
          currentUser={currentUser}
        />
      ) : (
        <div>
          <div className="bg-gray-100 p-4 border-b">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Slate - Collaborative Editor</h1>
              <div className="space-x-4">
                <button
                  onClick={handleNavigateToAuth}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Back to Auth
                </button>
                <button
                  onClick={() => setCurrentPage('document')}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Go to Document Editor
                </button>
              </div>
            </div>
          </div>
          {/* <FractionalDemo /> */}
        </div>
      )}
    </div>
  );
};

export default App;