-- Operator-uploaded menu-item photos. When set, points at a file under
-- /app/uploads/dishes/<photo_filename>. <DishPhoto> resolves to the
-- operator upload first, falling back to PDF seed photos, then a flame
-- tile.
ALTER TABLE "menu_items" ADD COLUMN "photo_filename" TEXT;
