# Supabase Setup Guide for BlackHat Traffic SaaS

## Overview
This guide covers all three requirements:
1. ✅ Supabase Connection
2. ✅ Login & Signup Authentication  
3. ✅ Inquiry Form Database

---

## 1. Supabase Connection Status

### ✅ Already Configured
Your Supabase project is already connected:
- **Project URL**: https://dcxgaitrmktdfhynkqwd.supabase.co
- **Project ID**: dcxgaitrmktdfhynkqwd
- **Public API Key**: sb_publishable_SKx6bQJnCRnUKIUBMAdtEA_PG9HeuPq

### Config File
Location: `/config/supabase.js`
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = createClient(supabaseUrl, supabaseKey);
```

### Environment Variables
Your `.env` file already contains:
```
SUPABASE_URL=https://dcxgaitrmktdfhynkqwd.supabase.co
SUPABASE_ANON_KEY=sb_publishable_SKx6bQJnCRnUKIUBMAdtEA_PG9HeuPq
```

---

## 2. Login & Signup Authentication

### ✅ Already Implemented

#### Registration (`/auth/register`)
- **File**: `/routes/auth.js`
- **Features**:
  - Form validation (name, email, phone, password)
  - Supabase auth integration
  - User profile sync to MongoDB
  - Automatic session creation
  - Error handling with flash messages

#### Login (`/auth/login`)
- **File**: `/routes/auth.js`
- **Features**:
  - Supabase email/password authentication
  - Fallback MongoDB authentication
  - Session management with secure cookies
  - Activity logging
  - Admin role detection

#### View Files
- **Login**: `/views/auth/login.ejs`
- **Registration**: `/views/auth/register.ejs`

Both views include:
- Modern dark theme UI
- Form validation
- Error message display
- Responsive design
- Tailwind CSS styling

---

## 3. Inquiry Form Database Setup

### Step 1: Create Table in Supabase

Execute this SQL in your Supabase SQL Editor:

```sql
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
USING ((SELECT role FROM public.users WHERE id = user_id) = 'admin');
```

### Step 2: Run the SQL
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the SQL above
4. Click "Run"

---

## 4. Backend Implementation

### Model: InquiryForm.js
Create `/models/InquiryForm.js` (MongoDB mirror for sync)

### Routes: /inquiry
Create endpoints for:
- `GET /inquiry` - View all inquiries (admin)
- `GET /inquiry/:id` - View specific inquiry
- `POST /inquiry` - Submit new inquiry
- `PUT /inquiry/:id` - Update inquiry (admin only)
- `DELETE /inquiry/:id` - Delete inquiry (admin only)

### Frontend Integration
- Create `/views/tools/inquiryForm.ejs` for the form
- Add to dashboard/tools menu
- Integrate with existing navigation

---

## 5. Testing Checklist

### ✅ Connection Test
```bash
npm start
# Check console for: "✅ Supabase client initialized."
```

### ✅ Authentication Test
1. Navigate to http://localhost:3000/auth/register
2. Create account with test data
3. Check Supabase Auth → Users
4. Login with created credentials
5. Should redirect to /dashboard

### ✅ Inquiry Form Test
1. Submit inquiry form
2. Check Supabase Table Editor → inquiry_forms
3. Verify data is stored
4. Test filtering and admin features

---

## 6. Important Notes

### Security
- RLS is enabled to protect user data
- Only authenticated users can submit inquiries
- Admin role has special permissions
- Passwords are hashed in Supabase Auth

### Database Sync
- MongoDB stores user profiles for app functionality
- Supabase stores inquiries and authentication
- Hybrid approach allows flexibility

### API Keys
- **Public Key**: Safe to expose (used here)
- **Service Role Key**: Keep secret (use on server only)
- Store all keys in `.env` file

---

## 7. Next Steps

1. **Test Current Setup**
   ```bash
   npm install  # Install dependencies
   npm start    # Start server
   ```

2. **Create the Inquiry Form**
   - Run the SQL script in Supabase
   - Implement the backend routes
   - Create the frontend view

3. **Monitor & Debug**
   - Use Supabase Dashboard
   - Check MongoDB Atlas
   - Monitor server logs

---

## Support

For issues:
1. Check `.env` has correct credentials
2. Verify Supabase project is active
3. Check MongoDB connection
4. Review server logs for errors
