import { type ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';
import type {
  PermissionController,
  PermissionName,
  PermissionStatus,
  UsePermissionOptions,
} from '../types';

export interface RationaleControls {
  confirm: () => void;
  cancel: () => void;
  status: PermissionStatus;
}

export interface BlockedControls {
  openSettings: () => Promise<void>;
  status: PermissionStatus;
}

export interface PermissionGateProps {
  name: PermissionName;
  /** Forwarded to the underlying `usePermission`. `requestOnMount` defaults to true here. */
  options?: UsePermissionOptions;
  /**
   * Rendered once access is granted (or limited). Pass a function to take full
   * control and render for every state yourself.
   */
  children: ReactNode | ((controller: PermissionController) => ReactNode);
  /** Your pre-prompt UI, shown while `phase === 'rationale'`. */
  rationale?: (controls: RationaleControls) => ReactNode;
  /** Your "go to Settings" UI, shown while the permission is blocked. */
  blocked?: (controls: BlockedControls) => ReactNode;
  /** Shown while not yet granted and no rationale/blocked UI applies. */
  fallback?: ReactNode;
}

/**
 * Declarative convenience over {@link usePermission}. Gates its children behind
 * a granted permission and lets you plug in your own rationale / blocked UI.
 * Auto-runs the request flow on mount unless you override `requestOnMount`.
 */
export function PermissionGate({
  name,
  options,
  children,
  rationale,
  blocked,
  fallback = null,
}: PermissionGateProps) {
  const controller = usePermission(name, { requestOnMount: true, ...options });

  // Render-prop mode: hand over full control regardless of status.
  if (typeof children === 'function') {
    return <>{children(controller)}</>;
  }

  const { status, phase, isBlocked } = controller;

  if (status === 'granted' || status === 'limited') {
    return <>{children}</>;
  }

  if (phase === 'rationale' && rationale) {
    return (
      <>
        {rationale({
          confirm: controller.confirmRationale,
          cancel: controller.cancelRationale,
          status,
        })}
      </>
    );
  }

  if (isBlocked && blocked) {
    return <>{blocked({ openSettings: controller.openSettings, status })}</>;
  }

  return <>{fallback}</>;
}
