# 🔧 LOGIN FIX - "Invalid email or password" Error

## ⚠️ The Problem

You're seeing **"Invalid email or password"** because you either:
1. ❌ Haven't registered yet, OR
2. ❌ Registered but haven't confirmed your email

---

## ✅ The Solution (3 Steps)

### Step 1: REGISTER (Not Login!)
1. **Close the login page**
2. Go to: **http://localhost:3000/auth/register** ← Important!
3. Fill in the form:
   ```
   Full Name: Your Name
   Phone: +1234567890
   Email: sayemapon1213@gmail.com
   Password: YourPassword123
   ```
4. Click **"Create Account"**
5. See: ✅ "Check your email for confirmation link"

---

### Step 2: CONFIRM EMAIL
1. Open your **Gmail inbox**
2. Find email from **Supabase** (check Spam folder)
3. Click the **"Confirm Email"** button in the email
4. You'll be **auto-logged in** ✅

---

### Step 3: LOGIN (Next Time)
Now you can use the login page:
1. Go to: **http://localhost:3000/auth/login**
2. Enter:
   ```
   Email: sayemapon1213@gmail.com
   Password: YourPassword123
   ```
3. Click **"Sign In"** ✅

---

## 🔑 Key Points

| Step | Action | Result |
|------|--------|--------|
| 1 | Visit `/auth/register` | Create account |
| 2 | Fill form & submit | Receive confirmation email |
| 3 | Click email confirmation link | Auto-logged in |
| 4 | Visit `/auth/login` | Can sign in anytime after |

---

## 🆘 If Email Doesn't Arrive

1. **Check SPAM folder** first ▶️
2. **Wait 2-3 minutes** for Supabase to send it
3. **Register again** to get a new confirmation email
4. Make sure your `.env` has correct Supabase URL:
   ```
   SUPABASE_URL=https://dcxgaitrmktdfhynkqwd.supabase.co
   ```

---

## 🚀 Start Here

**DON'T go to /auth/login first!**

**GO HERE:** http://localhost:3000/auth/register ← Click this!

Then follow the 3 steps above.

---

## 💡 Remember

- 📧 Email confirmation is REQUIRED (security)
- 🔒 Prevents fake accounts
- ✅ You only need to do this once
- 🔐 After confirmation, you can login anytime

---

**Ready?** Go register now at: http://localhost:3000/auth/register
