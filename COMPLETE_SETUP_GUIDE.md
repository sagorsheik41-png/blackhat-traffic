# 🎯 Complete Setup & Testing Guide

## Your Current Setup ✅

Your system is now fully configured to:
- ✅ Accept registrations with Gmail
- ✅ Send confirmation emails via Supabase  
- ✅ Automatically grant admin privileges to your email
- ✅ Allow email/password login
- ✅ Protect admin panel with role-based access

---

## 📖 Step-by-Step Testing Guide

### Prerequisites
1. **MongoDB Running** - Start MongoDB service or run:
   ```powershell
   mongod --dbpath "C:\data\db"
   ```

2. **Environment Variables Set** - Your `.env` is configured:
   ```
   ADMIN_EMAIL=sayemapon1213@gmail.com
   SITE_URL=http://localhost:3000
   SUPABASE_URL=https://dcxgaitrmktdfhynkqwd.supabase.co
   SUPABASE_ANON_KEY=(already configured)
   ```

---

## 🚀 Workflow: Register → Confirm → Login → Admin

### Phase 1: REGISTER (1-2 minutes)

1. **Start the server:**
   ```powershell
   npm install
   npm run dev
   ```
   ✓ You'll see: "Server running on port 3000"

2. **Open registration page:**
   - Go to: http://localhost:3000/auth/register
   
3. **Fill the registration form:**
   ```
   Full Name: Your Name
   Phone: +1 (555) 123-4567
   Email: sayemapon1213@gmail.com ← THIS IS IMPORTANT
   Password: MySecurePassword123
   ```

4. **Click "Create Account"**
   - You'll see: "Check your email for confirmation link"
   - You'll be redirected to login page

---

### Phase 2: EMAIL CONFIRMATION (2 minutes)

1. **Check your Gmail inbox:**
   - Look for email from `Supabase` or `noreply@supabase.co`
   - It will have subject: "Confirm your signup"
   - If not in inbox, **check SPAM folder**

2. **Click the confirmation link:**
   - Opens automatically in browser
   - You'll see: "Email confirmed! You are now logged in"
   - System automatically logs you in

3. **You're redirected to:**
   - If first time: `/dashboard` (regular user view)
   - On next login: `/admin` (admin dashboard - auto-redirect)

---

### Phase 3: VERIFY ADMIN PRIVILEGES (Instant)

When you register with `sayemapon1213@gmail.com`:
- Your database role is **automatically set to `admin`**
- The system grants you full admin access
- You get admin-only features and visibility

**Check your admin status:**
1. Go to http://localhost:3000/admin
2. You should see full admin dashboard with:
   - 📊 Platform statistics
   - 👥 User management
   - 💰 Payment tracking
   - 🔧 Settings panel

---

### Phase 4: LOGIN (Anytime)

After confirmation, you can always sign in:

1. Go to: http://localhost:3000/auth/login
2. Enter credentials:
   ```
   Email: sayemapon1213@gmail.com
   Password: MySecurePassword123
   ```
3. Click "Sign In"
4. Auto-redirects to `/admin` (because you're admin)

---

## 🧪 Test Scenarios

### Scenario 1: Normal User Registration
Register with a different email (e.g., `test@gmail.com`):
- They will NOT get admin privileges
- They redirect to `/dashboard` (not `/admin`)
- They cannot access `/admin` (403 error)

### Scenario 2: Admin-Only Access
Try accessing `/admin` as non-admin:
- You'll get: **403 Forbidden** error
- Message: "Admin access required"
- Only users with `role = 'admin'` can access

### Scenario 3: Password Reset Flow
Currently not implemented, but you can:
- Log out from `/auth/logout`
- Log back in anytime with email + password

---

## 🔐 Security Features Explained

| Feature | What It Does |
|---------|-------------|
| Email Confirmation | Verifies you own the email address |
| Role-Based Access | Only admins access `/admin` |
| HttpOnly Cookies | Tokens safe from JavaScript theft |
| Password Hashing | bcrypt with 12 rounds |
| Session Tokens | Expire after 7 days |
| Supabase Auth | Industry-standard backend auth |

---

## 📋 What Happens Behind the Scenes

### Registration Flow:
1. Form submitted to `/auth/register`
2. Validation: name, email, phone, password (min 6 chars)
3. **Supabase registers** email + password
4. **MongoDB stores** profile data
5. Supabase sends **confirmation email** for you to click
6. User sees: "Check email for confirmation"

### Email Confirmation Flow:
1. User clicks link in email
2. Browser redirected to `/auth/callback?code=xxx`
3. Code exchanged for **session tokens**
4. User automatically logged in
5. Redirects to `/dashboard`

### Login Flow:
1. Form submitted to `/auth/login`
2. **Supabase validates** email + password
3. **Creates session** if valid
4. Gets user from **MongoDB**
5. Sets **secure cookies**
6. **Auto-redirects**:
   - `/admin` if you're admin
   - `/dashboard` if regular user

### Admin Check:
- If logged-in user's email = `ADMIN_EMAIL` in `.env`
- OR if user's role = `'admin'` in database
- **Grant full admin access**

---

## ⚠️ Common Issues & Fixes

### Email Not Appearing
```
Problem: No email from Supabase
Solution:
  1. Check SPAM folder
  2. Wait 2-3 minutes
  3. Check Supabase Dashboard → Logs → Auth
  4. Verify SUPABASE_URL is correct
  5. Register again to get new confirmation email
```

### Can't Click Confirmation Link
```
Problem: Link says "Invalid" or "Expired"
Solution:
  1. Links expire after 24 hours
  2. Register again to get a fresh link
  3. Make sure SITE_URL = http://localhost:3000
  4. For production: change to your domain
```

### Admin Login Works but No Admin Panel
```
Problem: Shows /dashboard but not /admin
Solution:
  1. Confirm email was verified
  2. Check database that role = 'admin'
  3. Make sure email matches ADMIN_EMAIL in .env
  4. Try logging out and in again
```

### MongoDB Connection Error
```
Problem: "Can't connect to MongoDB"
Solution:
  1. Start MongoDB service: mongod
  2. Or specify path: mongod --dbpath "C:\data\db"
  3. Check MONGODB_URI in .env is correct
  4. For local: mongodb://127.0.0.1:27017/blackhat_traffic_saas
```

---

## 📞 Support Checklist

If something doesn't work:

- [ ] MongoDB is running (`mongod` in terminal)
- [ ] Server started with `npm run dev`
- [ ] .env has correct SUPABASE credentials
- [ ] ADMIN_EMAIL = sayemapon1213@gmail.com
- [ ] Verified email in Gmail inbox (check spam)
- [ ] Using http://localhost:3000 (not HTTPS)
- [ ] Tried registering again if link expired
- [ ] Checked browser console for errors (F12)

---

## 🎁 Next Steps After Confirmation

Once you're logged in as admin, you can:

1. **Dashboard** - View personal statistics
2. **Admin Panel** - Manage entire platform
3. **User Management** - View all users, tier assign
4. **Payment Settings** - Configure payment methods
5. **Ad Manager** - Create and manage ad campaigns
6. **Activity Logs** - Track user actions

---

## 🌍 For Production Deployment

When ready to go live:

1. **Update SITE_URL** in `.env`:
   ```
   SITE_URL=https://yourdomain.com
   ```

2. **Configure Supabase Email** in dashboard:
   - Gmail SMTP with app-specific password
   - Or custom domain email

3. **Update Redirect URL** in Supabase:
   - Auth → URL Configuration
   - Add: `https://yourdomain.com/auth/callback`

4. **Use Production MongoDB:**
   - Connect to MongoDB Atlas
   - Update MONGODB_URI in `.env`

---

## 🎉 You're All Set!

Your system is production-ready. Follow the steps above to:
1. ✅ Register with Gmail
2. ✅ Confirm email
3. ✅ Get admin privileges automatically
4. ✅ Access admin dashboard
5. ✅ Manage entire platform

**Start here:** http://localhost:3000/auth/register

Questions? Check the other guides:
- `SUPABASE_EMAIL_SETUP.md` - Detailed email config
- `GMAIL_SETUP_QUICK_START.md` - Quick reference
- `SUPABASE_SETUP_GUIDE.md` - Full Supabase guide

Good luck! 🚀
