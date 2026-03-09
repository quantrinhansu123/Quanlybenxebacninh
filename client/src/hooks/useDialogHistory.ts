import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to manage browser history for dialogs.
 * When dialog opens, pushes a history state.
 * When user presses browser back button, closes the dialog instead of navigating away.
 *
 * @param dialogOpen - Whether the dialog is currently open
 * @param setDialogOpen - Function to set the dialog open state
 * @param historyStateKey - Unique key for the history state (e.g., "driverDialogOpen")
 * @returns handleDialogOpenChange - Wrapper function to use for onOpenChange
 */
export function useDialogHistory(
  dialogOpen: boolean,
  setDialogOpen: (open: boolean) => void,
  historyStateKey: string
) {
  const historyPushedRef = useRef(false);
  const closedViaBackButtonRef = useRef(false);

  useEffect(() => {
    if (!dialogOpen) {
      historyPushedRef.current = false;
      return;
    }

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ [historyStateKey]: true }, "", window.location.href);

    const handlePopState = () => {
      // Back button pressed - close dialog
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      setDialogOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
      // The extra history entry will be cleaned up naturally on next navigation
    };
  }, [dialogOpen, setDialogOpen, historyStateKey]);

  // Memoized wrapper for onOpenChange
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
  }, [setDialogOpen]);

  return { handleDialogOpenChange };
}
