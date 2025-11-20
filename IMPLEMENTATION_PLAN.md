# Implementation Plan: Unverified Student Averages Feature

## Overview
This plan outlines the steps needed to implement a feature where students can submit unverified course averages on course detail pages, while maintaining the existing verified average display system.

---

## Database Schema Changes

### 1. Create New Table: `student_averages`

Create a new table to store student-submitted (unverified) averages:

```sql
CREATE TABLE student_averages (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  average DECIMAL(5,2) NOT NULL CHECK (average >= 0 AND average <= 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET, -- Optional: for basic spam prevention
  user_agent TEXT, -- Optional: for tracking/analytics
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional: Add unique constraint to prevent duplicate submissions from same IP
  -- UNIQUE(course_id, ip_address) -- Uncomment if you want to prevent same IP from submitting multiple times
);

-- Add indexes for performance
CREATE INDEX idx_student_averages_course_id ON student_averages(course_id);
CREATE INDEX idx_student_averages_submitted_at ON student_averages(submitted_at DESC);
CREATE INDEX idx_student_averages_course_submitted ON student_averages(course_id, submitted_at DESC);
```

**Field Explanations:**
- `id`: Primary key
- `course_id`: Foreign key to `courses` table
- `average`: The grade average submitted (0-100, with 2 decimal places)
- `submitted_at`: When the average was submitted (allows filtering by date)
- `ip_address`: Optional - can help prevent spam/duplicate submissions
- `user_agent`: Optional - for analytics
- `created_at`: Timestamp for record creation

---

### 2. Optional: Add Metadata Fields to `courses` Table

If you want to track statistics about unverified submissions:

```sql
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS unverified_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_unverified_submission TIMESTAMPTZ;

-- Create a function to update these stats (see Functions section)
```

---

## Row Level Security (RLS) Policies

### 3. Enable RLS on `student_averages` Table

```sql
ALTER TABLE student_averages ENABLE ROW LEVEL SECURITY;
```

### 4. Create RLS Policies

**Policy 1: Allow anyone to read (SELECT) unverified averages**
```sql
CREATE POLICY "Anyone can view student averages"
ON student_averages
FOR SELECT
USING (true);
```

**Policy 2: Allow anyone to insert (INSERT) new averages**
```sql
CREATE POLICY "Anyone can submit student averages"
ON student_averages
FOR INSERT
WITH CHECK (true);
```

**Policy 3: Optional - Restrict UPDATE/DELETE to admins only**
```sql
-- If you have an admin role or auth system:
-- CREATE POLICY "Only admins can update student averages"
-- ON student_averages
-- FOR UPDATE
-- USING (auth.role() = 'admin');

-- CREATE POLICY "Only admins can delete student averages"
-- ON student_averages
-- FOR DELETE
-- USING (auth.role() = 'admin');
```

---

## Database Functions (Optional but Recommended)

### 5. Create Function to Calculate Statistics

Create a function to get aggregated statistics for a course:

```sql
CREATE OR REPLACE FUNCTION get_course_average_stats(course_id_param BIGINT)
RETURNS TABLE (
  verified_average DECIMAL,
  unverified_count BIGINT,
  unverified_average DECIMAL,
  unverified_min DECIMAL,
  unverified_max DECIMAL,
  unverified_median DECIMAL,
  last_submission TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.avg_grade as verified_average,
    COUNT(sa.id) as unverified_count,
    AVG(sa.average)::DECIMAL(5,2) as unverified_average,
    MIN(sa.average) as unverified_min,
    MAX(sa.average) as unverified_max,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sa.average)::DECIMAL(5,2) as unverified_median,
    MAX(sa.submitted_at) as last_submission
  FROM courses c
  LEFT JOIN student_averages sa ON sa.course_id = c.id
  WHERE c.id = course_id_param
  GROUP BY c.id, c.avg_grade;
END;
$$ LANGUAGE plpgsql;
```

### 6. Optional: Create Trigger to Update Course Statistics

If you added metadata fields to `courses` table:

```sql
CREATE OR REPLACE FUNCTION update_course_unverified_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET 
    unverified_count = (
      SELECT COUNT(*) 
      FROM student_averages 
      WHERE course_id = NEW.course_id
    ),
    last_unverified_submission = (
      SELECT MAX(submitted_at) 
      FROM student_averages 
      WHERE course_id = NEW.course_id
    )
  WHERE id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_stats
AFTER INSERT OR DELETE ON student_averages
FOR EACH ROW
EXECUTE FUNCTION update_course_unverified_stats();
```

---

## Validation & Constraints

### 7. Add Check Constraints

Ensure data quality:

```sql
-- Already included in table creation, but ensure:
ALTER TABLE student_averages 
ADD CONSTRAINT check_average_range 
CHECK (average >= 0 AND average <= 100);

-- Optional: Prevent submissions older than a certain date
-- ALTER TABLE student_averages
-- ADD CONSTRAINT check_recent_submission
-- CHECK (submitted_at >= NOW() - INTERVAL '1 year');
```

### 8. Optional: Rate Limiting at Database Level

If you want to prevent spam, you could add a constraint or use a function:

```sql
-- Option A: One submission per IP per course (uncomment unique constraint in step 1)
-- Option B: Use a function to check rate limits before insert

CREATE OR REPLACE FUNCTION can_submit_average(
  course_id_param BIGINT,
  ip_address_param INET
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Check if same IP submitted in last 24 hours
  SELECT COUNT(*) INTO recent_count
  FROM student_averages
  WHERE course_id = course_id_param
    AND ip_address = ip_address_param
    AND submitted_at >= NOW() - INTERVAL '24 hours';
  
  RETURN recent_count = 0;
END;
$$ LANGUAGE plpgsql;
```

---

## Frontend Integration Points (For Reference)

While no code changes are requested now, here's what the frontend would need:

### 9. Frontend Components Needed

1. **Form Component** (`SubmitAverageForm.tsx`)
   - Input field for average (0-100)
   - Submit button
   - Validation (client-side)
   - Success/error messaging

2. **Display Component** (`UnverifiedAveragesSection.tsx`)
   - Show list of recent submissions
   - Display statistics (count, average, min, max, median)
   - Optional: Chart/graph visualization

3. **API Integration**
   - Insert new average: `supabase.from('student_averages').insert()`
   - Fetch averages: `supabase.from('student_averages').select().eq('course_id', id)`
   - Optional: Use the stats function: `supabase.rpc('get_course_average_stats', { course_id_param: id })`

---

## Implementation Steps Summary

### Phase 1: Database Setup
1. ✅ Create `student_averages` table
2. ✅ Add indexes for performance
3. ✅ Enable RLS on the table
4. ✅ Create RLS policies (SELECT, INSERT)

### Phase 2: Optional Enhancements
5. ✅ Create statistics function (`get_course_average_stats`)
6. ✅ Add metadata fields to `courses` table (optional)
7. ✅ Create trigger for auto-updating stats (optional)
8. ✅ Implement rate limiting function (optional)

### Phase 3: Testing
9. Test INSERT operations from Supabase dashboard
10. Test SELECT queries
11. Verify RLS policies work correctly
12. Test statistics function

### Phase 4: Frontend Integration (Future)
13. Create form component
14. Create display component
15. Integrate into course detail page
16. Add error handling and validation

---

## Security Considerations

1. **Input Validation**: Always validate on both client and server side
2. **Rate Limiting**: Consider implementing rate limiting to prevent spam
3. **Data Sanitization**: Ensure averages are within valid range (0-100)
4. **IP Tracking**: Consider privacy implications of storing IP addresses
5. **RLS Policies**: Review and adjust policies based on your authentication needs

---

## Migration Script Template

Here's a complete SQL script you can run in Supabase SQL Editor:

```sql
-- Step 1: Create table
CREATE TABLE IF NOT EXISTS student_averages (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  average DECIMAL(5,2) NOT NULL CHECK (average >= 0 AND average <= 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_student_averages_course_id ON student_averages(course_id);
CREATE INDEX IF NOT EXISTS idx_student_averages_submitted_at ON student_averages(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_averages_course_submitted ON student_averages(course_id, submitted_at DESC);

-- Step 3: Enable RLS
ALTER TABLE student_averages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
CREATE POLICY "Anyone can view student averages"
ON student_averages FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit student averages"
ON student_averages FOR INSERT
WITH CHECK (true);

-- Step 5: Create statistics function
CREATE OR REPLACE FUNCTION get_course_average_stats(course_id_param BIGINT)
RETURNS TABLE (
  verified_average DECIMAL,
  unverified_count BIGINT,
  unverified_average DECIMAL,
  unverified_min DECIMAL,
  unverified_max DECIMAL,
  unverified_median DECIMAL,
  last_submission TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.avg_grade as verified_average,
    COUNT(sa.id) as unverified_count,
    AVG(sa.average)::DECIMAL(5,2) as unverified_average,
    MIN(sa.average) as unverified_min,
    MAX(sa.average) as unverified_max,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sa.average)::DECIMAL(5,2) as unverified_median,
    MAX(sa.submitted_at) as last_submission
  FROM courses c
  LEFT JOIN student_averages sa ON sa.course_id = c.id
  WHERE c.id = course_id_param
  GROUP BY c.id, c.avg_grade;
END;
$$ LANGUAGE plpgsql;
```

---

## Notes

- The `courses.avg_grade` field remains unchanged - it continues to store verified averages
- Unverified averages are stored separately in `student_averages` table
- You can display both verified and unverified averages side-by-side
- Consider adding moderation/admin features later to verify and promote unverified averages to verified status
- The plan assumes anonymous submissions - if you add authentication later, you can modify RLS policies accordingly

