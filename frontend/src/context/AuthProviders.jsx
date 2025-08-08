import React, { useMemo, useState } from 'react';
import { AuthContext } from './auth-context';

export default function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const login = () => setLoggedIn(true);
  const logout = () => setLoggedIn(false);

  const value = useMemo(() => ({ loggedIn, login, logout }), [loggedIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
