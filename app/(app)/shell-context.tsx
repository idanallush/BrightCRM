"use client";

import * as React from "react";

const MobileMenuContext = React.createContext({
  mobileOpen: false,
  setMobileOpen: (_: boolean) => {},
});

const SidebarContext = React.createContext<{
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  collapsed: false,
  setCollapsed: () => {},
});

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <MobileMenuContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        {children}
      </SidebarContext.Provider>
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  return React.useContext(MobileMenuContext);
}

export function useSidebarCollapsed() {
  return React.useContext(SidebarContext);
}
