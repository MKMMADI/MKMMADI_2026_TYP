import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerSpaces from "./ManagerSpaces";
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

const room = {
  id: 48,
  name: "Karoo Lounge",
  description: null,
  capacity: 10,
  status: "AVAILABLE" as const,
  isActive: true,
  amenities: [],
  imageUrl: null,
};

describe("ManagerSpaces room photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:room-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/rooms") return [{ ...room }] as never;
      if (path === "/amenities") return [] as never;
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uploads a replacement photo for an existing room", async () => {
    const file = new File(["jpeg-data"], "room.jpg", { type: "image/jpeg" });
    mockedUploadRoomImage.mockResolvedValue({ imageUrl: "https://s3.example.test/photo" });
    render(<MemoryRouter><ManagerSpaces /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Edit space" }));
    fireEvent.change(screen.getByLabelText("Room photo (optional)"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload photo" }));

    await waitFor(() => expect(mockedUploadRoomImage).toHaveBeenCalledWith(48, file));
    expect(await screen.findByRole("img", { name: "Karoo Lounge room" })).toBeTruthy();
  });

  it("removes an existing room photo through the manager API", async () => {
    mockedApiFetch.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === "/rooms") return [{ ...room, imageUrl: "https://s3.example.test/photo" }] as never;
      if (path === "/amenities") return [] as never;
      if (path === "/rooms/48/image" && options?.method === "DELETE") {
        return { ...room, imageUrl: null } as never;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter><ManagerSpaces /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Edit space" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/rooms/48/image",
      { method: "DELETE" },
    ));
  });
});
