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

type GlobalDialogType = "task" | "client" | null;
const GlobalDialogContext = React.createContext<{
  openDialog: GlobalDialogType;
  setOpenDialog: (d: GlobalDialogType) => void;
}>({ openDialog: null, setOpenDialog: () => {} });

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState<GlobalDialogType>(null);
  return (
    <MobileMenuContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <GlobalDialogContext.Provider value={{ openDialog, setOpenDialog }}>
          {children}
        </GlobalDialogContext.Provider>
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

export function useGlobalDialog() {
  return React.useContext(GlobalDialogContext);
}
