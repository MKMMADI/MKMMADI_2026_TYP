import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerSpaceCreate from "./ManagerSpaceCreate";
import { apiFetch } from "@/lib/api";
import { uploadRoomImage } from "@/lib/roomImages";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/roomImages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/roomImages")>()),
  uploadRoomImage: vi.fn(),
}));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedUploadRoomImage = vi.mocked(uploadRoomImage);

describe("ManagerSpaceCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:room-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/amenities") return [] as never;
      if (path === "/rooms") return { id: 48, name: "New Space" } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates the room before uploading its selected photo", async () => {
    const file = new File(["jpeg-data"], "room.jpg", { type: "image/jpeg" });
    render(<MemoryRouter><ManagerSpaceCreate /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "New Space" } });
    fireEvent.change(screen.getByLabelText("Room photo (optional)"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create space" }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/rooms", expect.objectContaining({ method: "POST" }));
      expect(mockedUploadRoomImage).toHaveBeenCalledWith(48, file);
    });
    expect(mockedApiFetch.mock.invocationCallOrder[0]).toBeLessThan(
      mockedUploadRoomImage.mock.invocationCallOrder[0],
    );
  });
});
