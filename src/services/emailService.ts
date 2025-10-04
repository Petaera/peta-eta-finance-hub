import nodemailer from 'nodemailer';

// AWS SES SMTP Configuration
const smtpConfig = {
  host: 'email-smtp.us-west-2.amazonaws.com', // AWS SES SMTP endpoint
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'AKIAR72PHKJWD4V5LI6W', // SMTP username (Access Key ID)
    pass: 'BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP' // SMTP password (Secret Access Key)
  }
};

// Create transporter
const transporter = nodemailer.createTransporter(smtpConfig);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using AWS SES via SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verify SMTP connection
    await transporter.verify();
    
    // Send email
    const info = await transporter.sendMail({
      from: 'info@petaera.com', // Your verified email address
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Generate password reset email template
 */
export const generatePasswordResetEmail = (resetLink: string, userName?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset - Peta-eta</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { 
          display: inline-block; 
          background: #4CAF50; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 15px 0; 
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
          <h2>Hello${userName ? ` ${userName}` : ''}!</h2>
          <p>We received a request to reset your password for your Peta-eta account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
            ${resetLink}
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
  `;
};

/**
 * Generate email confirmation template
 */
export const generateEmailConfirmation = (confirmationLink: string, userName?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Confirmation - Peta-eta</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { 
          display: inline-block; 
          background: #4CAF50; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 15px 0; 
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
          <h2>Welcome${userName ? ` ${userName}` : ''}!</h2>
          <p>Thank you for signing up for Peta-eta! To complete your registration, please confirm your email address.</p>
          <div style="text-align: center;">
            <a href="${confirmationLink}" class="button">Confirm Email Address</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
            ${confirmationLink}
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
  `;
};
