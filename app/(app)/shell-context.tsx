"use client";

import * as React from "react";

const ShellContext = React.createContext({
  mobileOpen: false,
  setMobileOpen: (_: boolean) => {},
});

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <ShellContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useMobileMenu() {
  return React.useContext(ShellContext);
}
