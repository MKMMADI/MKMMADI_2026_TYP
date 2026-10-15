



\## Current starting point



\- The `Room model` has no image field.

\- Manager-only room create and edit API routes already exist in `roomRoutes.ts`, but the `room service` doesn’t save image information.

\- Managers can add a room in the web app, but the `add-space form` has no photo selection/upload.



\## Suggested sprints



\### Sprint 1 — Image data and API contract

\- Add an optional image object-key field to the room model and create a database migration.

\- Update room create, edit, and read responses so room images work consistently throughout the API.

\- Keep the field optional so existing rooms and bookings still work without photos.

\- Add API tests for rooms with and without images.



\*\*Done when:\*\* a manager can update a room’s image reference through the authorized API, and employees receive a usable image URL when loading room data.



\### Sprint 2 — Secure S3 upload and replacement

\- Create/configure the S3 bucket and API credentials with limited permissions.

\- Add manager-only API endpoints to request an upload and attach the uploaded image to a room.

\- Restrict uploads by file type and size; generate unpredictable object keys rather than using user-provided filenames.

\- Have the API confirm the uploaded object exists before saving its key.

\- Decide how to remove or clean up the replaced photo and incomplete uploads.



\*\*Done when:\*\* unauthorized users cannot get upload authorization, and a manager can upload and replace an image without entering any URL.



\### Sprint 3 — Manager web interface

\- Add image selection and preview to the add-space and edit-space screens.

\- Upload through the API-authorized S3 flow, with progress and clear error/retry states.

\- Let a manager replace or remove a photo.

\- Handle partial failure clearly—for example, if the room is created but its photo upload fails, allow the manager to retry without creating a duplicate room.



\*\*Done when:\*\* managers can add a room with a photo and change its photo from the web frontend.



\### Sprint 4 — Existing demo rooms and end-to-end checks

\- Put licensed images in S3 and add their object keys to the seed data.

\- Make sure reseeding demo data doesn’t accidentally become the way to update an already-running RDS database.

\- Test the full flow on the actual demo deployment: manager upload, room list, room details, and photo replacement.



\*\*Done when:\*\* seeded rooms and manager-added rooms display images through the same mechanism, including in the deployed demo.



|||||
|-|-|-|-|
|||||



