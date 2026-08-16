import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UNSUBMITTED_RESPONSE_WARNING,
  useUnsubmittedResponseWarning,
} from "./unsubmitted-response-warning/utils";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("useUnsubmittedResponseWarning", () => {
  it("requests native confirmation before the page unloads", () => {
    renderHook(() => useUnsubmittedResponseWarning(true));
    const event = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("blocks link navigation when the response has not been submitted", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => useUnsubmittedResponseWarning(true));
    const link = document.createElement("a");
    link.href = "/another-page";
    link.addEventListener("click", (event) => event.preventDefault());
    document.body.append(link);

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    link.dispatchEvent(event);

    expect(confirm).toHaveBeenCalledWith(UNSUBMITTED_RESPONSE_WARNING);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not warn after the response is submitted", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => useUnsubmittedResponseWarning(false));
    const link = document.createElement("a");
    link.href = "/another-page";
    link.addEventListener("click", (event) => event.preventDefault());
    document.body.append(link);

    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );

    expect(confirm).not.toHaveBeenCalled();
  });
});
