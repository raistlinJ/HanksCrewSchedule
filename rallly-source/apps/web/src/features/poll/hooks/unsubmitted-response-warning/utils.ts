"use client";

import { useEffect } from "react";

export const UNSUBMITTED_RESPONSE_WARNING =
  "You haven't submitted your responses. Leave this page anyway?";

export function useUnsubmittedResponseWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSUBMITTED_RESPONSE_WARNING;
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const link =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;

      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.href === window.location.href ||
        (link.hash &&
          link.origin === window.location.origin &&
          link.pathname === window.location.pathname &&
          link.search === window.location.search)
      ) {
        return;
      }

      if (!window.confirm(UNSUBMITTED_RESPONSE_WARNING)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [enabled]);
}
