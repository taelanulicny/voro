import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SideMenuContextType {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

const SideMenuContext = createContext<SideMenuContextType | undefined>(undefined);

export function SideMenuProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <SideMenuContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </SideMenuContext.Provider>
  );
}

export function useSideMenu() {
  const context = useContext(SideMenuContext);
  if (context === undefined) {
    throw new Error('useSideMenu must be used within a SideMenuProvider');
  }
  return context;
}

