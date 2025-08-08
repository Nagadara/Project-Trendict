import React from 'react';
import Header from './components/Header'; // Header.jsx 불러오기
import Sidebar from './components/Sidebar';

function App() {
  return (
   <AuthProvider>
      <Header />
      <Sidebar />
    </AuthProvider>
  );
}

export default App;
