-- V9: Optional lot → pool linkage. When a lot's source fiber came from a pool,
-- this column points back so revenue can be traced per-lot into the pool.

ALTER TABLE lots ADD COLUMN pool_id UUID REFERENCES pools(id);
CREATE INDEX idx_lots_pool ON lots(pool_id) WHERE pool_id IS NOT NULL;
