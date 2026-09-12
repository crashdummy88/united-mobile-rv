-- Adds an optional credentials line shown next to an author's name on
-- thread/reply pages (E-E-A-T signal: certified-installer answers should
-- visibly carry the certification, not just the site-wide footer).
ALTER TABLE users ADD COLUMN credentials TEXT;

UPDATE users
SET credentials = 'Victron Certified Installer · weBoost Authorized Installer · Peplink Certified Associate · Dometic Professional Certified'
WHERE email = 'mattc2896@gmail.com';
