import { createContext, useContext, useState } from 'react';

// Lightweight global store (React Context) holding the player's name and the
// current game code so they can be shared across routes (Home, Room, Draw)
// without prop-drilling.
const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const value = { name, setName, code, setCode };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
