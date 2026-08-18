import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { DownloadArchiveButton } from "./archive-actions";

describe("DownloadArchiveButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads the generated archive with the server-provided filename", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:archive");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: {
            "Content-Disposition":
              'attachment; filename="rallly-archive-2026-08-17.json"',
            "Content-Type": "application/json",
          },
        }),
      ),
    );

    let downloadedFileName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function captureDownload(this: HTMLAnchorElement) {
        downloadedFileName = this.download;
      },
    );

    render(<DownloadArchiveButton />);
    await user.click(screen.getByRole("button", { name: /download archive/i }));

    await waitFor(() => {
      expect(downloadedFileName).toBe("rallly-archive-2026-08-17.json");
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/archive", {
      credentials: "same-origin",
      cache: "no-store",
    });
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
  });
});
