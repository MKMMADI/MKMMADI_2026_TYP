/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests roomValidation request middleware behavior.
 */

import {
  validateAttachRoomImage,
  validateCreateRoom,
  validateRoomImageUpload,
  validateUpdateRoom,
} from '../../src_ts/middleware/validation';

describe('room image URL validation', () => {
  it('accepts an HTTPS image URL when creating a room', () => {
    const next = jest.fn();

    validateCreateRoom(
      { body: { name: 'Boardroom', capacity: 8, imageUrl: 'https://images.example.com/room.jpg' } } as any,
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects non-HTTPS image URLs when creating a room', () => {
    const next = jest.fn();

    validateCreateRoom(
      { body: { name: 'Boardroom', capacity: 8, imageUrl: 'http://images.example.com/room.jpg' } } as any,
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('allows a manager to clear an image URL when updating a room', () => {
    const next = jest.fn();

    validateUpdateRoom({ body: { imageUrl: null } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects malformed image URLs when updating a room', () => {
    const next = jest.fn();

    validateUpdateRoom({ body: { imageUrl: 'not-a-url' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('validates upload content type and declared byte length', () => {
    const validNext = jest.fn();
    validateRoomImageUpload(
      { body: { contentType: 'image/webp', contentLength: 1024 } } as any,
      {} as any,
      validNext,
    );
    expect(validNext).toHaveBeenCalledWith();

    const invalidNext = jest.fn();
    validateRoomImageUpload(
      { body: { contentType: 'image/svg+xml', contentLength: 1024 } } as any,
      {} as any,
      invalidNext,
    );
    expect(invalidNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejects upload lengths above the limit and missing image keys', () => {
    const tooLargeNext = jest.fn();
    validateRoomImageUpload(
      { body: { contentType: 'image/jpeg', contentLength: 5 * 1024 * 1024 + 1 } } as any,
      {} as any,
      tooLargeNext,
    );
    expect(tooLargeNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const missingKeyNext = jest.fn();
    validateAttachRoomImage({ body: {} } as any, {} as any, missingKeyNext);
    expect(missingKeyNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
