-- Remove pre-seeded tags (users can create their own)
DELETE FROM task_tags WHERE tag_id IN (
  SELECT id FROM tags WHERE name IN ('אסטרטגיה', 'דיווח', 'דיזיין', 'קמפיין', 'תוכן')
);
DELETE FROM tags WHERE name IN ('אסטרטגיה', 'דיווח', 'דיזיין', 'קמפיין', 'תוכן');
