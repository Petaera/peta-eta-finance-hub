# Supabase Webhook Setup for Custom Email Templates

Since Supabase has default email templates, you'll need to configure a webhook to use your custom SMTP service. Here are the steps:

## 1. Supabase Dashboard Setup

1. **Go to your Supabase project dashboard**
2. **Navigate to Authentication > Settings**
3. **Configure Email Templates:**

### Password Reset Email Template:
```html
<!DOCTYPE html>
{% load i18n %}{% autoescape off %}
<html>
<head>
    <meta charset="utf-8">
    <title>{% trans "Reset Password" %} - Peta-eta</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Peta-eta Finance Hub</p>
        </div>
        <div class="content">
            <h2>Hello!</h2>
            <p>We received a request to reset your password for your Peta-eta account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
                {{ .ConfirmationURL }}
            </p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
            <p>© 2024 Peta-eta. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

### Email Confirmation Template:
```html
<!DOCTYPE html>
{% load i18n %}{% autoescape off %}
<html>
<head>
    <meta charset="utf-8">
    <title>{% trans "Confirm Email" %} - Peta-eta</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Email Confirmation</h1>
            <p>Peta-eta Finance Hub</p>
        </div>
        <div class="content">
            <h2>Welcome!</h2>
            <p>Thank you for signing up for Peta-eta! To complete your registration, please confirm your email address.</p>
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
                {{ .ConfirmationURL }}
            </p>
            <p>Welcome to the Peta-eta family! 🎉</p>
        </div>
        <div class="footer">
            <p>© 2024 Peta-eta. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

## 2. Email Configuration

Since Supabase will handle email delivery through its own SMTP, your AWS SES credentials will be used for:
- Custom applications that need email functionality
- Additional features beyond authentication

## 3. SMTP Usage in Application

Your email service can be used for:
- Custom notifications
- Transaction alerts  
- Budget reminders
- Custom marketing emails

Example usage in your application:
```typescript
import { sendEmail, generatePasswordResetEmail } from '../services/emailService';

// Send custom password reset email
const resetLink = 'https://yourapp.com/auth/reset-password?token=...';
await sendEmail({
  to: userEmail,
  subject: 'Reset your Peta-eta password',
  html: generatePasswordResetEmail(resetLink, userName)
});
```

## 4. Environment Variables

Make sure your email service is configured with the AWS SES credentials:
- AWS SMTP User: `AKIAR72PHKJWD4V5LI6W`
- AWS SMTP Password: `BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP`
- From Email: `info@petaera.com`
