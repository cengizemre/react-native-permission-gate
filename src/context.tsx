import { createContext, type ReactNode } from 'react';
import { reactNativePermissionsAdapter } from './adapters/reactNativePermissions';
import type { PermissionAdapter, UsePermissionOptions } from './types';

/** Options that can be defaulted for every hook/component under a provider. */
export type PermissionDefaults = Pick<
  UsePermissionOptions,
  'rationale' | 'revalidateOnFocus' | 'requestOnMount'
>;

export interface PermissionContextValue {
  adapter: PermissionAdapter;
  defaults: PermissionDefaults;
}

export const PermissionContext = createContext<PermissionContextValue>({
  adapter: reactNativePermissionsAdapter,
  defaults: {},
});

export interface PermissionProviderProps {
  /** Override the backend for the whole tree. */
  adapter?: PermissionAdapter;
  /** Default options applied to every `usePermission` / `PermissionGate`. */
  defaults?: PermissionDefaults;
  children: ReactNode;
}

/**
 * Optional. Sets a shared adapter and default options for the subtree so you
 * don't repeat them at every call site. `usePermission` works without it.
 */
export function PermissionProvider({
  adapter = reactNativePermissionsAdapter,
  defaults = {},
  children,
}: PermissionProviderProps) {
  return (
    <PermissionContext.Provider value={{ adapter, defaults }}>
      {children}
    </PermissionContext.Provider>
  );
}
