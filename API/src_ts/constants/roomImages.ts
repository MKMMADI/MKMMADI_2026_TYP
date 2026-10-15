/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines room images constants and related validation data.
 */

export const MAX_ROOM_IMAGE_BYTES = 5 * 1024 * 1024;
export const ROOM_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type RoomImageContentType = (typeof ROOM_IMAGE_CONTENT_TYPES)[number];
