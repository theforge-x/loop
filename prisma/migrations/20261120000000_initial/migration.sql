-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` CHAR(64) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `admin_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wedding_settings` (
    `id` INTEGER NOT NULL,
    `draft` JSON NOT NULL,
    `published` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitations` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `guestLimit` INTEGER NOT NULL,
    `deadline` DATETIME(3) NULL,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invitations_codeHash_key`(`codeHash`),
    INDEX `invitations_label_idx`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guests` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `guests_invitationId_position_idx`(`invitationId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rsvps` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `status` ENUM('ACCEPTED', 'PARTIAL', 'DECLINED') NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `message` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rsvps_invitationId_key`(`invitationId`),
    UNIQUE INDEX `rsvps_reference_key`(`reference`),
    INDEX `rsvps_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rsvp_attendees` (
    `rsvpId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `attending` BOOLEAN NOT NULL,

    PRIMARY KEY (`rsvpId`, `guestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rsvp_history` (
    `id` VARCHAR(191) NOT NULL,
    `rsvpId` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rsvp_history_rsvpId_createdAt_idx`(`rsvpId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wishlist_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `price` VARCHAR(60) NOT NULL,
    `status` ENUM('AVAILABLE', 'RESERVED', 'RECEIVED') NOT NULL DEFAULT 'AVAILABLE',
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wishlist_items_archived_hidden_createdAt_idx`(`archived`, `hidden`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gift_reservations` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `activeItemId` VARCHAR(191) NULL,
    `guestName` VARCHAR(120) NOT NULL,
    `contact` VARCHAR(120) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('RESERVED', 'CONFIRMED', 'CANCELLED', 'RECEIVED') NOT NULL DEFAULT 'RESERVED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `gift_reservations_reference_key`(`reference`),
    UNIQUE INDEX `gift_reservations_activeItemId_key`(`activeItemId`),
    INDEX `gift_reservations_itemId_createdAt_idx`(`itemId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limits` (
    `key` CHAR(64) NOT NULL,
    `hits` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `rate_limits_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `invitations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rsvps` ADD CONSTRAINT `rsvps_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `invitations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rsvp_attendees` ADD CONSTRAINT `rsvp_attendees_rsvpId_fkey` FOREIGN KEY (`rsvpId`) REFERENCES `rsvps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rsvp_attendees` ADD CONSTRAINT `rsvp_attendees_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `guests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rsvp_history` ADD CONSTRAINT `rsvp_history_rsvpId_fkey` FOREIGN KEY (`rsvpId`) REFERENCES `rsvps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gift_reservations` ADD CONSTRAINT `gift_reservations_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `wishlist_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Each non-cancelled reservation must occupy its own item's unique claim key.
ALTER TABLE `gift_reservations` ADD CONSTRAINT `gift_reservations_valid_claim` CHECK (
    (`status` = 'CANCELLED' AND `activeItemId` IS NULL)
    OR (`status` <> 'CANCELLED' AND `activeItemId` IS NOT NULL AND `activeItemId` = `itemId`)
);
