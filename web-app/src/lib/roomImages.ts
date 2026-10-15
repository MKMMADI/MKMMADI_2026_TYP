import { apiFetch } from "@/lib/api";

export const MAX_ROOM_IMAGE_BYTES = 5 * 1024 * 1024;

const ROOM_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type RoomImageContentType = (typeof ROOM_IMAGE_CONTENT_TYPES)[number];

interface RoomImageUploadUrl {
  objectKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

interface RoomImageResult {
  imageUrl: string | null;
}

export function roomImageValidationMessage(file: File): string | null {
  if (!ROOM_IMAGE_CONTENT_TYPES.includes(file.type as RoomImageContentType)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0 || file.size > MAX_ROOM_IMAGE_BYTES) {
    return "The image must be between 1 byte and 5 MiB.";
  }
  return null;
}

export async function uploadRoomImage(roomId: number, file: File): Promise<RoomImageResult> {
  const validationMessage = roomImageValidationMessage(file);
  if (validationMessage) throw new Error(validationMessage);

  const upload = await apiFetch<RoomImageUploadUrl>(`/rooms/${roomId}/image-upload`, {
    method: "POST",
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
    }),
  });

  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    const responseText = await response.text();
    const s3Message = responseText.match(/<Message>([^<]+)<\/Message>/i)?.[1];
    throw new Error(s3Message || `Image upload failed (${response.status}).`);
  }

  return apiFetch<RoomImageResult>(`/rooms/${roomId}/image`, {
    method: "POST",
    body: JSON.stringify({ objectKey: upload.objectKey }),
  });
}
