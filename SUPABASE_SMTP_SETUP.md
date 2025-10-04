# Supabase SMTP Configuration Guide

## Step 1: Configure Custom SMTP in Supabase Dashboard

### 1. Login to Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project (`ckcxixjkclyaqmkjjrgp`)

### 2. Navigate to Authentication Settings
- In the left sidebar, click on **Authentication**
- Click on **Settings** (or **Settings** tab)
- Scroll down to **SMTP Settings** section

### 3. Configure SMTP Provider
You have two options:

#### Option A: Use Your AWS SES Directly
- **SMTP Host**: `email-smtp.us-west-2.amazonaws.com`
- **SMTP Port**: `587`
- **SMTP User**: `AKIAR72PHKJWD4V5LI6W`
- **SMTP Pass**: `BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP`
- **From Name**: `Peta-eta` (or leave empty)
- **From Email**: `info@petaera.com`
- **SMTP Admin Email**: `info@petaera.com`

#### Option B: Use Supabase as Proxy (Recommended)
- Enable **Enable custom SMTP**
- Use the same credentials as above

### 4. Enable Custom SMTP
- Toggle **Enable custom SMTP** to ON
- Save the settings

## Step 2: Verify Your Domain in AWS SES

### 1. Check AWS SES Console
- Go to AWS Console → Simple Email Service
- Go to **Verified identities**
- Ensure `info@petaera.com` is verified
- If not verified, add and verify the domain/email

### 2. Check Sending Quotas
- Go to **Sending statistics** in SES
- Check your sending limits
- For production, request limit increases if needed

## Step 3: Update Email Templates

### 1. Go to Authentication → Email Templates
- Select **Password Reset** template
- Update the HTML with your custom template:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - Peta-eta</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold;
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .link-box { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>🔐 Password Reset</h1>
                <p style="margin: 0;">Peta-eta Finance Hub</p>
            </div>
            <div class="content">
                <h2>Hello!</h2>
                <p>We received a request to reset your password for your Peta-eta account.</p>
                <div style="text-align: center;">
                    <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-box">{{ .ConfirmationURL }}</div>
                <p><strong>⚠️ This link will expire in 24 hours.</strong></p>
                <p>If you didn't request this password reset, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
                <p>© 2024 Peta-eta. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>
```

### 2. Update Confirm Signup Template
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Confirmation - Peta-eta</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold;
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .link-box { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>📧 Welcome to Peta-eta!</h1>
                <p style="margin: 0;">Finance Hub</p>
            </div>
            <div class="content">
                <h2>Confirm Your Email Address</h2>
                <p>Thank you for signing up! To complete your registration, please confirm your email address.</p>
                <div style="text-align: center;">
                    <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-box">{{ .ConfirmationURL }}</div>
                <p>🎉 Welcome to the Peta-eta family!</p>
            </div>
            <div class="footer">
                <p>© 2024 Peta-eta. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>
```

## Step 4: Test the Configuration

### 1. Test Password Reset
- Go to your app: http://localhost:8081/auth
- Click "Forgot your password?"
- Enter a valid email address
- Check if the email comes from `info@petaera.com`

### 2. Check Email Delivery
- Look in your email inbox
- Check the "From" field should now show your domain
- Check the "Reply-To" field

## Step 5: Troubleshooting

### Common Issues:

1. **Emails still coming from Supabase**
   - Verify SMTP settings are saved
   - Check if custom SMTP is enabled
   - Wait 5-10 minutes for settings to propagate

2. **SMTP Authentication Failed**
   - Verify AWS SES credentials
   - Check if email is verified in AWS SES
   - Ensure SES is in correct region (us-west-2)

3. **Emails going to spam**
   - Set up SPF records for your domain
   - Set up DKIM in AWS SES
   - Consider using a dedicated email domain

### Environment-specific Settings:
- For **production**: Use a dedicated domain for emails
- For **staging**: Use a subdomain like `noreply@peta-eta-app.com`
- For **development**: Keep using AWS SES with verified email

## Alternative: Using Your Email Service Directly

If Supabase custom SMTP doesn't work, you can bypass it entirely:

### Option 1: Disable Supabase Email + Use Custom Service
1. Disable email checks in Supabase settings
2. Handle email verification manually in your app
3. Use your SMTP service for all emails

### Option 2: Custom Email Function
Create a server-side function that handles all email operations using your AWS SES credentials.
