import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { roomImageValidationMessage, uploadRoomImage } from "@/lib/roomImages";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

describe("roomImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requests a signed URL, uploads only the content type header, then attaches the object", async () => {
    const file = new File(["jpeg-data"], "room.jpg", { type: "image/jpeg" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mockedApiFetch
      .mockResolvedValueOnce({
        objectKey: "pending-room-images/48/example.jpg",
        uploadUrl: "https://s3.example.test/signed",
        headers: {
          "Content-Type": "image/jpeg",
          "x-amz-meta-room-id": "48",
          "x-amz-meta-expected-size": String(file.size),
        },
      } as never)
      .mockResolvedValueOnce({ imageUrl: "https://s3.example.test/display" } as never);

    await expect(uploadRoomImage(48, file)).resolves.toEqual({
      imageUrl: "https://s3.example.test/display",
    });

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, "/rooms/48/image-upload", {
      method: "POST",
      body: JSON.stringify({ contentType: "image/jpeg", contentLength: file.size }),
    });
    expect(fetchMock).toHaveBeenCalledWith("https://s3.example.test/signed", {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: file,
    });
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, "/rooms/48/image", {
      method: "POST",
      body: JSON.stringify({ objectKey: "pending-room-images/48/example.jpg" }),
    });
  });

  it("rejects unsupported types and oversized files before requesting an upload URL", async () => {
    const unsupported = new File(["data"], "room.gif", { type: "image/gif" });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });

    expect(roomImageValidationMessage(unsupported)).toMatch(/JPEG, PNG, or WebP/);
    expect(roomImageValidationMessage(oversized)).toMatch(/5 MiB/);
    await expect(uploadRoomImage(48, unsupported)).rejects.toThrow(/JPEG, PNG, or WebP/);
    await expect(uploadRoomImage(48, oversized)).rejects.toThrow(/5 MiB/);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("surfaces an S3 upload failure and does not attach the image", async () => {
    const file = new File(["jpeg-data"], "room.jpg", { type: "image/jpeg" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      "<Error><Message>SignatureDoesNotMatch</Message></Error>",
      { status: 403 },
    ));
    vi.stubGlobal("fetch", fetchMock);
    mockedApiFetch.mockResolvedValueOnce({
      objectKey: "pending-room-images/48/example.jpg",
      uploadUrl: "https://s3.example.test/signed",
      headers: { "Content-Type": "image/jpeg" },
    } as never);

    await expect(uploadRoomImage(48, file)).rejects.toThrow("SignatureDoesNotMatch");
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });
});
