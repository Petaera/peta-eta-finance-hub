# SMTP Configuration Checklist

## ✅ Pre-Setup Verification

### 1. AWS SES Setup
- [ ] AWS SES is active in `us-west-2` region
- [ ] Email `info@petaera.com` is verified in AWS SES
- [ ] SMTP credentials are valid:
  - Username: `AKIAR72PHKJWD4V5LI6W`
  - Password: `BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP`
- [ ] Domain `petaera.com` has proper DNS records (SPF, DKIM recommended)

## ✅ Supabase Dashboard Steps

### Step 1: Access Authentication Settings
1. [ ] Go to https://supabase.com/dashboard
2. [ ] Select project: `ckcxixjkclyaqmkjjrgp`
3. [ ] Navigate to **Authentication** → **Settings**

### Step 2: Configure SMTP Settings
1. [ ] Scroll down to **Auth** section
2. [ ] Find **SMTP Provider Settings** or **Custom SMTP**
3. [ ] Enter the following:
   ```
   Host: email-smtp.us-west-2.amazonaws.com
   Port: 587
   Username: AKIAR72PHKJWD4V5LI6W
   Password: BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP
   From Name: Peta-eta
   From Email: info@petaera.com
   ```
4. [ ] Enable **Custom SMTP** (toggle to ON)

### Step 3: Update Email Templates
1. [ ] Go to **Authentication** → **Email Templates**
2. [ ] Update **Password Reset** template with custom HTML
3. [ ] Update **Confirm Signup** template with custom HTML
4. [ ] Save templates

### Step 4: Advanced Settings (If Available)
1. [ ] Check **Site URL** is set to your app URL
2. [ ] Verify **Redirect URLs** include your reset password URL
3. [ ] Set **JWT expiry limit** if needed

## ✅ Testing Steps

### After Configuration:
1. [ ] Wait 5-10 minutes for settings to propagate
2. [ ] Test password reset flow:
   - Go to http://localhost:8081/auth
   - Click "Forgot Password"
   - Enter email address
   - Check inbox
3. [ ] Verify email source:
   - "From" should be `info@petaera.com` or `Peta-eta <info@petaera.com>`
   - Body should contain your custom template
   - No "via Supabase" in headers

## ❌ Common Problems & Solutions

### Problem: Still receiving emails from Supabase
**Solution**: 
- Most common issue is settings not saved or not refreshed
- Clear browser cache and re-enter SMTP settings
- Wait up to 10 minutes for changes to take effect

### Problem: SMTP authentication error
**Solution**:
- Verify AWS SES credentials are correct
- Ensure email is verified in AWS SES console
- Check AWS SES sending quotas

### Problem: Emails going to spam
**Solution**:
- Add SPF record for your domain
- Set up DKIM in AWS SES
- Consider dedicated email domain

### Problem: Custom templates not appearing
**Solution**:
- Templates must be HTML format
- Use `{{ .ConfirmationURL }}` for reset links
- Preview templates before saving

## 🔧 Manual Verification Commands

### Test SMTP Connection (Optional)
You can test your SMTP connection directly:

```javascript
// Add this to test SMTP connection
import { sendEmail } from '../services/emailService';

const testSMTP = async () => {
  const result = await sendEmail({
    fly: 'test@example.com',
    subject: 'Test Email',
    html: '<h1>Test Email</h1><p>SMTP is working!</p>'
  });
  console.log('SMTP Test:', result);
};
```

## 📧 Expected Email Output

After successful configuration:
- **Subject**: "Reset your password" (or custom)
- **From**: "Peta-eta <info@petaera.com>"
- **Body**: Your custom HTML template
- **Links**: Working reset links that redirect to your app

## 🚨 Emergency Fallback

If SMTP configuration fails:
1. Keep Supabase default email system active
2. Use custom email service for transaction confirmations only
3. Add note in UI: "Password reset emails come from Supabase"
4. Plan to migrate fully to custom SMTP later
