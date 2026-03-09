-- Add ben_phu_trach (assigned station) column to users table
-- This allows tracking which station/location each user is responsible for

-- Add column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ben_phu_trach UUID REFERENCES locations(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS users_ben_phu_trach_idx ON users(ben_phu_trach);

-- Add comment
COMMENT ON COLUMN users.ben_phu_trach IS 'Bến phụ trách - Station/Location assigned to this user';
