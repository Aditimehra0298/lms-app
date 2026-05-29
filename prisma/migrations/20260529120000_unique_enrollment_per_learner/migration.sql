-- Normalize common email typos before deduplication.
UPDATE `lms_purchase` SET `learnerEmail` = REPLACE(`learnerEmail`, ',com', '.com') WHERE `learnerEmail` LIKE '%,com';
UPDATE `lms_purchase` SET `learnerEmail` = REPLACE(`learnerEmail`, ',co.uk', '.co.uk') WHERE `learnerEmail` LIKE '%,co.uk';
UPDATE `lms_purchase` SET `learnerEmail` = LOWER(TRIM(`learnerEmail`));

-- Remove duplicate enrollments (same course + same email, case-insensitive). Keep oldest row.
DELETE p1 FROM `lms_purchase` p1
INNER JOIN `lms_purchase` p2
  ON p1.`courseSlug` = p2.`courseSlug`
  AND LOWER(TRIM(p1.`learnerEmail`)) = LOWER(TRIM(p2.`learnerEmail`))
  AND p1.`createdAt` > p2.`createdAt`;

-- Remove duplicate enrollments for the same user id on the same course. Keep oldest row.
DELETE p1 FROM `lms_purchase` p1
INNER JOIN `lms_purchase` p2
  ON p1.`courseSlug` = p2.`courseSlug`
  AND p1.`userId` IS NOT NULL
  AND p1.`userId` = p2.`userId`
  AND p1.`createdAt` > p2.`createdAt`;

-- One enrollment per email per course (database enforces on future inserts).
CREATE UNIQUE INDEX `lms_purchase_learner_course_unique` ON `lms_purchase`(`learnerEmail`, `courseSlug`);

-- Faster lookup when matching by account id.
CREATE INDEX `lms_purchase_userId_courseSlug_idx` ON `lms_purchase`(`userId`, `courseSlug`);
