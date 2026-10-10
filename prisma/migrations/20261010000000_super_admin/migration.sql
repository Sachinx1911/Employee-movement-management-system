-- AlterTable: add the SUPER_ADMIN role
ALTER TABLE `User` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF';

-- The original "admin" account becomes the super admin.
UPDATE `User` SET `role` = 'SUPER_ADMIN' WHERE `username` = 'admin' AND `role` = 'ADMIN';

-- If there was no "admin" account, promote the oldest active admin instead.
UPDATE `User` SET `role` = 'SUPER_ADMIN'
WHERE `id` = (SELECT `id` FROM (SELECT `id` FROM `User` WHERE `role` = 'ADMIN' AND `active` = 1 ORDER BY `createdAt` LIMIT 1) AS `first_admin`)
  AND NOT EXISTS (SELECT 1 FROM (SELECT `id` FROM `User` WHERE `role` = 'SUPER_ADMIN') AS `existing_super`);
