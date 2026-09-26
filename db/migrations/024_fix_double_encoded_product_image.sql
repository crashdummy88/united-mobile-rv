-- Victron SmartSolar MPPT photo was stored with a second URL-encode
-- pass (%2520 / %2528 / %2529). That path 404s. The single-encoded
-- manufacturer file returns image/png.
-- Idempotent: only rewrites rows that still contain the double encoding.

UPDATE products
SET image_url = 'https://www.victronenergy.com/upload/products/SmartSolar%20MPPT%20100-50%20%28top%29.png'
WHERE id = 'victron-smartsolar-mppt'
  AND image_url LIKE '%2520%';
