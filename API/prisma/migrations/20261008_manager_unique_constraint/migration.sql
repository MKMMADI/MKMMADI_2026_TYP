-- Enforce a single manager account at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS "User_manager_role_unique"
ON "User"("role")
WHERE "role" = 'MANAGER';
