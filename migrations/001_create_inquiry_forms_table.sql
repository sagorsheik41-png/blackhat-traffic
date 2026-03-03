-- ================================================================
-- Supabase Migration: Create inquiry_forms Table
-- ================================================================
-- Run this SQL in your Supabase SQL Editor at:
-- https://app.supabase.com/project/dcxgaitrmktdfhynkqwd/sql/new
--
-- Instructions:
-- 1. Go to Supabase Dashboard
-- 2. Click "SQL Editor" on the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run"
--
-- ================================================================

-- Create inquiry_forms table
CREATE TABLE IF NOT EXISTS inquiry_forms (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create indexes for better query performance
CREATE INDEX idx_inquiry_user_id ON inquiry_forms(user_id);
CREATE INDEX idx_inquiry_status ON inquiry_forms(status);
CREATE INDEX idx_inquiry_created_at ON inquiry_forms(created_at DESC);
CREATE INDEX idx_inquiry_email ON inquiry_forms(email);

-- Enable RLS (Row Level Security)
ALTER TABLE inquiry_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can view their own inquiries
CREATE POLICY "Users can view their own inquiries"
ON inquiry_forms
FOR SELECT
USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.users WHERE id = user_id) = 'admin'
);

-- Create RLS policy: Users can insert their own inquiries
CREATE POLICY "Users can insert their own inquiries"
ON inquiry_forms
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create RLS policy: Admins can update inquiries
CREATE POLICY "Admins can update inquiries"
ON inquiry_forms
FOR UPDATE
USING (
    (SELECT role FROM public.users WHERE id = user_id) = 'admin'
    OR (SELECT role FROM auth.users WHERE id = user_id) = 'admin'
);

-- ================================================================
-- OPTIONAL: If you want public (non-authenticated) submissions:
-- Uncomment the policy below
-- ================================================================

-- This allows anyone to submit inquiries without being logged in
-- CREATE POLICY "Anyone can insert inquiries"
-- ON inquiry_forms
-- FOR INSERT
-- WITH CHECK (true);

-- ================================================================
-- Test the table creation
-- ================================================================

-- Show table structure
-- \d inquiry_forms

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'inquiry_forms';

-- ================================================================
-- Sample Data (for testing - optional)
-- ================================================================

-- Insert test inquiry (replace with real user_id from auth.users)
-- INSERT INTO inquiry_forms (user_id, name, email, phone, subject, message, category, status, priority)
-- VALUES (
--     'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
--     'John Doe',
--     'john@example.com',
--     '+1234567890',
--     'Account Issue',
--     'I am having trouble accessing my account',
--     'account',
--     'pending',
--     'normal'
-- );

-- ================================================================
-- Cleanup (if needed - WARNING: Deletes all data)
-- ================================================================

-- DROP TABLE IF EXISTS inquiry_forms CASCADE;
