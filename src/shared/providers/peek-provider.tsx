"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Shape of the peek context value.
 */
export interface PeekContextValue {
  /** The ID of the issue currently being peeked, or null if none */
  peekIssueId: string | null;
  /** Open the peek panel for the given issue ID */
  openPeek: (issueId: string) => void;
  /** Close the peek panel */
  closePeek: () => void;
}

const PeekContext = createContext<PeekContextValue | null>(null);

/**
 * usePeek returns the peek context value.
 *
 * @description Provides access to the peek panel state and actions.
 * Must be used within a PeekProvider.
 * @returns The PeekContextValue
 * @throws Error if used outside of PeekProvider
 *
 * @example
 * const { openPeek, closePeek, peekIssueId } = usePeek();
 */
export function usePeek(): PeekContextValue {
  const context = useContext(PeekContext);
  if (!context) {
    throw new Error("usePeek must be used within a PeekProvider");
  }
  return context;
}

interface PeekProviderProps {
  children: ReactNode;
}

/**
 * PeekProvider manages which issue is being previewed in the slide-over panel.
 *
 * @description Wraps the app layout so any component can open/close the
 * issue peek panel via the usePeek() hook.
 * @param props - PeekProviderProps
 * @returns Provider component wrapping children
 *
 * @example
 * <PeekProvider>
 *   <AppContent />
 * </PeekProvider>
 */
export function PeekProvider({ children }: PeekProviderProps) {
  const [peekIssueId, setPeekIssueId] = useState<string | null>(null);

  const openPeek = useCallback((issueId: string) => {
    setPeekIssueId(issueId);
  }, []);

  const closePeek = useCallback(() => {
    setPeekIssueId(null);
  }, []);

  return (
    <PeekContext.Provider value={{ peekIssueId, openPeek, closePeek }}>
      {children}
    </PeekContext.Provider>
  );
}
