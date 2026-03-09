# Supabase Email Confirmation Setup Guide

## Step 1: Configure Supabase Email Settings

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **dcxgaitrmktdfhynkqwd**
3. Navigate to **Authentication → Email Templates**

## Step 2: Enable Email Confirmation

1. Go to **Authentication → Providers**
2. Click on **Email** provider
3. Enable **Confirm email** toggle
4. Set **Email confirmation expiry** to 24 hours (or your preference)

## Step 3: Customize Confirmation Email Template

1. Go to **Authentication → Email Templates**
2. Click on **Confirm signup** template
3. Replace the default template with:

```html
<h2>Confirm Your Email</h2>
<p>Hi {{ .ConfirmationLink }}</p>
<p>Please click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationLink }}">Confirm Email</a></p>
<p>This link expires in 24 hours.</p>
<p>If you didn't sign up for this account, you can safely ignore this email.</p>
```

## Step 4: Update Application Settings

In Supabase Dashboard:
1. Go to **Project Settings → General**
2. Copy your **Project URL**: `https://dcxgaitrmktdfhynkqwd.supabase.co`
3. Go to **Project Settings → API Keys**
4. Copy the **anon public key**: YOUR_ANON_KEY

### Verify These Are in Your .env File:
```env
SUPABASE_URL=https://dcxgaitrmktdfhynkqwd.supabase.co
SUPABASE_ANON_KEY=sb_publishable_SKx6bQJnCRnUKIUBMAdtEA_PG9HeuPq
SITE_URL=http://localhost:3000
ADMIN_EMAIL=sayemapon1213@gmail.com
```

## Step 5: Configure SMTP (Optional but Recommended)

For production, configure your own SMTP:

1. In Supabase Dashboard → **Authentication → Email Templates**
2. Click **Settings**
3. Choose **Custom SMTP** instead of "Supabase"
4. Enter your email provider details:
   - **Sender Email**: noreply@yourdomain.com
   - **SMTP Host**: smtp.gmail.com
   - **SMTP Port**: 587
   - **SMTP Username**: your_email@gmail.com
   - **SMTP Password**: Your Gmail App Password (not regular password)

## Step 6: Create Gmail App Password

If using Gmail SMTP:

1. Go to [Google Account Settings](https://myaccount.google.com)
2. Enable **2-Factor Authentication**
3. Go to **Security → App Passwords**
4. Select **Mail** and **Windows Computer**
5. Generate and copy the password
6. Use this in Supabase SMTP configuration

## Step 7: Test the Flow

### Local Testing:
1. Start your server: `npm run dev`
2. Go to http://localhost:3000/auth/register
3. Fill in the form with:
   - **Name**: Test User
   - **Email**: sayemapon1213@gmail.com
   - **Phone**: +1234567890
   - **Password**: TestPassword123
4. Click **Register**
5. Check your Gmail inbox for the confirmation email
6. Click the confirmation link in the email
7. You should be logged in automatically
8. Access admin panel at http://localhost:3000/admin

## Troubleshooting

### Email Not Arriving?
- Check Spam/Junk folder
- Verify SUPABASE_URL is correct in .env
- Check Supabase logs: Dashboard → Logs → Auth

### Confirmation Link Not Working?
- Verify SITE_URL matches your access point (http://localhost:3000 for local)
- For production, change SITE_URL to your production domain
- Link expiry might be exceeded (24 hours default)

### Can't Log In After Confirmation?
- Ensure MongoDB is running: `mongod`
- Check that the user exists in both Supabase AND MongoDB
- View application logs for errors

## Production Deployment

When deploying to production (e.g., Vercel, Render):

1. Update environment variables in your hosting platform:
   ```
   SITE_URL=https://your-production-domain.com
   SUPABASE_URL=https://dcxgaitrmktdfhynkqwd.supabase.co
   SUPABASE_ANON_KEY=your_key_here
   ```

2. Update Supabase OAuth settings:
   - Go to **Authentication → URL Configuration**
   - Add your production domain to **Redirect URLs**
   - Example: `https://your-domain.com/auth/callback`

## Database Schema

The system automatically creates:

### Supabase `auth.users` table:
- email: `sayemapon1213@gmail.com`
- email_confirmed_at: timestamp (set after confirmation)
- password: hashed

### MongoDB `users` collection:
```javascript
{
  name: "Your Name",
  email: "sayemapon1213@gmail.com",
  phone: "+1234567890",
  role: "admin" (if ADMIN_EMAIL matches),
  isActive: true,
  createdAt: timestamp,
  lastLogin: timestamp
}
```

## Admin Privileges

When you sign up with the email that matches `ADMIN_EMAIL` in your .env:
- You automatically get **admin** role
- You can access the admin dashboard at `/admin`
- You have full control over the system

## Security Notes

✅ Passwords are hashed and stored only in Supabase  
✅ Email confirmation prevents fake email registrations  
✅ Tokens are httpOnly cookies (not accessible to JavaScript)  
✅ Session tokens expire after 7 days  
✅ Refresh tokens allow automatic re-authentication  

## Next Steps

1. ✅ Configure Supabase email in dashboard
2. ✅ Test registration and email confirmation locally
3. ✅ Deploy to production
4. ✅ Update SITE_URL for your production domain
5. ✅ Configure custom SMTP for production emails
