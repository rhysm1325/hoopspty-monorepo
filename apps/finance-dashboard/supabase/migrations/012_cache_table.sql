-- Cache table for dashboard data caching strategy

-- Create cache entries table
CREATE TABLE cache_entries (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '1.0',
  size_bytes INTEGER DEFAULT 0
);

-- Create indexes for efficient cache operations
CREATE INDEX idx_cache_entries_expires_at ON cache_entries(expires_at);
CREATE INDEX idx_cache_entries_tags ON cache_entries USING GIN(tags);
CREATE INDEX idx_cache_entries_created_at ON cache_entries(created_at);
CREATE INDEX idx_cache_entries_size ON cache_entries(size_bytes);

-- Create composite index for tag-based queries with expiration
CREATE INDEX idx_cache_entries_tags_expires ON cache_entries USING GIN(tags) WHERE expires_at > NOW();

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_cache_entries_updated_at 
  BEFORE UPDATE ON cache_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache_entries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    'system',
    'cleanup_cache',
    'cache',
    'expired_entries',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleaned_at', NOW()
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  total_size_bytes BIGINT,
  avg_size_bytes NUMERIC,
  oldest_entry TIMESTAMPTZ,
  newest_entry TIMESTAMPTZ,
  most_common_tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
    COALESCE(SUM(size_bytes), 0) as total_size_bytes,
    COALESCE(AVG(size_bytes), 0) as avg_size_bytes,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry,
    (
      SELECT array_agg(tag ORDER BY tag_count DESC)
      FROM (
        SELECT unnest(tags) as tag, COUNT(*) as tag_count
        FROM cache_entries 
        WHERE expires_at > NOW()
        GROUP BY unnest(tags)
        ORDER BY tag_count DESC
        LIMIT 10
      ) t
    ) as most_common_tags
  FROM cache_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to invalidate cache by tags
CREATE OR REPLACE FUNCTION invalidate_cache_by_tags(tag_list TEXT[])
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE tags && tag_list;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log invalidation activity
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'system'),
    'invalidate_cache',
    'cache',
    'by_tags',
    jsonb_build_object(
      'tags', tag_list,
      'deleted_count', deleted_count,
      'invalidated_at', NOW()
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to invalidate cache by key pattern
CREATE OR REPLACE FUNCTION invalidate_cache_by_pattern(key_pattern TEXT)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE key LIKE key_pattern;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log invalidation activity
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'system'),
    'invalidate_cache',
    'cache',
    'by_pattern',
    jsonb_build_object(
      'pattern', key_pattern,
      'deleted_count', deleted_count,
      'invalidated_at', NOW()
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to warm up cache with commonly accessed data
CREATE OR REPLACE FUNCTION warmup_dashboard_cache()
RETURNS void AS $$
BEGIN
  -- This function would be called by the application layer
  -- to pre-populate cache with frequently accessed data
  
  -- Log warmup activity
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    'system',
    'warmup_cache',
    'cache',
    'dashboard',
    jsonb_build_object(
      'warmed_up_at', NOW(),
      'triggered_by', 'system'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

-- Cache entries are accessible to all authenticated users for read
CREATE POLICY "Users can read cache entries" 
  ON cache_entries FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Only system and admins can write to cache
CREATE POLICY "System and admins can write cache entries" 
  ON cache_entries FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
    OR current_setting('role') = 'service_role'
  );

-- Grant permissions
GRANT SELECT ON cache_entries TO authenticated;
GRANT ALL ON cache_entries TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_cache_entries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache_by_tags(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache_by_pattern(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION warmup_dashboard_cache() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE cache_entries IS 'Dashboard data cache with expiration and tagging support';
COMMENT ON COLUMN cache_entries.key IS 'Unique cache key identifier';
COMMENT ON COLUMN cache_entries.data IS 'Cached data stored as JSONB';
COMMENT ON COLUMN cache_entries.expires_at IS 'Cache entry expiration timestamp';
COMMENT ON COLUMN cache_entries.tags IS 'Array of tags for cache invalidation grouping';
COMMENT ON COLUMN cache_entries.version IS 'Cache entry version for cache busting';
COMMENT ON COLUMN cache_entries.size_bytes IS 'Approximate size of cached data in bytes';

COMMENT ON FUNCTION cleanup_expired_cache_entries() IS 'Remove expired cache entries and return count deleted';
COMMENT ON FUNCTION get_cache_statistics() IS 'Get comprehensive cache usage statistics';
COMMENT ON FUNCTION invalidate_cache_by_tags(TEXT[]) IS 'Invalidate cache entries matching any of the provided tags';
COMMENT ON FUNCTION invalidate_cache_by_pattern(TEXT) IS 'Invalidate cache entries with keys matching the pattern';
COMMENT ON FUNCTION warmup_dashboard_cache() IS 'Trigger cache warmup for frequently accessed dashboard data';
