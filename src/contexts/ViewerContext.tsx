import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { buildViewer, type Viewer } from '../lib/visibility';

interface ViewerContextType {
  viewer: Viewer | null;
}

const ViewerContext = createContext<ViewerContextType>({ viewer: null });

export function ViewerProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const viewer = useMemo(() => buildViewer(profile), [profile]);
  return (
    <ViewerContext.Provider value={{ viewer }}>
      {children}
    </ViewerContext.Provider>
  );
}

/**
 * Get the current viewer's context.
 * Returns null if no user is logged in or profile hasn't loaded yet.
 */
export function useViewer(): Viewer | null {
  return useContext(ViewerContext).viewer;
}