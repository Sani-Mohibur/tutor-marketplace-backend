import nodemailer from "nodemailer";

// Configure Nodemailer with your Gmail OAuth2 credentials
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER, // e.g., mdfarabi200@gmail.com
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

export const sendVerificationEmail = async (to: string, url: string) => {
  try {
    await transporter.sendMail({
      from: `"Skill Bridge" <${process.env.EMAIL_USER}>`,
      to, // Reminder: This must be your verified Resend email address while testing
      subject: "Verify your email address - Skill Bridge",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(to right, #0ea5e9, #6366f1); padding: 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .content { padding: 40px 32px; color: #3f3f46; line-height: 1.6; }
            .content p { margin: 0 0 16px 0; font-size: 16px; }
            .button-container { text-align: center; margin: 32px 0; }
            .button { display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
            .button:hover { background-color: #4338ca; }
            .footer { padding: 24px 32px; background-color: #f8fafc; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Skill Bridge!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up. To complete your registration and gain full access to our platform, please verify your email address by clicking the button below.</p>
              <div class="button-container">
                <a href="${url}" class="button" style="color: #ffffff;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9; font-size: 14px;">${url}</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Skill Bridge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

export const sendResetPasswordEmail = async (to: string, url: string) => {
  try {
    await transporter.sendMail({
      from: `"Skill Bridge" <${process.env.EMAIL_USER}>`,
      to, // Reminder: This must be your verified Resend email address while testing
      subject: "Reset your password - Skill Bridge",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(to right, #10b981, #0ea5e9); padding: 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .content { padding: 40px 32px; color: #3f3f46; line-height: 1.6; }
            .content p { margin: 0 0 16px 0; font-size: 16px; }
            .button-container { text-align: center; margin: 32px 0; }
            .button { display: inline-block; background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
            .button:hover { background-color: #0284c7; }
            .footer { padding: 24px 32px; background-color: #f8fafc; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
            .warning { font-size: 14px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Skill Bridge account. Click the button below to choose a new password.</p>
              <div class="button-container">
                <a href="${url}" class="button" style="color: #ffffff;">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9; font-size: 14px;">${url}</p>
              <div class="warning">
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns. Your password won't change until you create a new one.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Skill Bridge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending reset password email:", error);
  }
};

// const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
// const BREVO_API_KEY = process.env.BREVO_API_KEY; // Add this to Render environment
// const SENDER_EMAIL = process.env.EMAIL_USER; // Your verified email in Brevo

// export const sendVerificationEmail = async (to: string, url: string) => {
//   try {
//     const response = await fetch(BREVO_API_URL, {
//       method: "POST",
//       headers: {
//         "api-key": BREVO_API_KEY!,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         sender: { email: SENDER_EMAIL },
//         to: [{ email: to }],
//         subject: "Verify your email address - Skill Bridge",
//         html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="utf-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Verify your email</title>
//           <style>
//             body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
//             .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
//             .header { background: linear-gradient(to right, #0ea5e9, #6366f1); padding: 32px; text-align: center; }
//             .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
//             .content { padding: 40px 32px; color: #3f3f46; line-height: 1.6; }
//             .content p { margin: 0 0 16px 0; font-size: 16px; }
//             .button-container { text-align: center; margin: 32px 0; }
//             .button { display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
//             .button:hover { background-color: #4338ca; }
//             .footer { padding: 24px 32px; background-color: #f8fafc; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>Welcome to Skill Bridge!</h1>
//             </div>
//             <div class="content">
//               <p>Hello,</p>
//               <p>Thank you for signing up. To complete your registration and gain full access to our platform, please verify your email address by clicking the button below.</p>
//               <div class="button-container">
//                 <a href="${url}" class="button" style="color: #ffffff;">Verify Email Address</a>
//               </div>
//               <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
//               <p style="word-break: break-all; color: #0ea5e9; font-size: 14px;">${url}</p>
//               <p>If you didn't create an account, you can safely ignore this email.</p>
//             </div>
//             <div class="footer">
//               <p>&copy; ${new Date().getFullYear()} Skill Bridge. All rights reserved.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//       }),
//     });
//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error("Brevo API Error:", errorData);
//     }
//   } catch (error) {
//     console.error("Error sending verification email:", error);
//   }
// };

// export const sendResetPasswordEmail = async (to: string, url: string) => {
//   // Use the same fetch logic, just update the subject and htmlContent
//   try {
//     await fetch(BREVO_API_URL, {
//       method: "POST",
//       headers: {
//         "api-key": BREVO_API_KEY!,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         sender: { email: SENDER_EMAIL },
//         to: [{ email: to }],
//         subject: "Reset your password - Skill Bridge",
//         html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="utf-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Reset your password</title>
//           <style>
//             body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
//             .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
//             .header { background: linear-gradient(to right, #10b981, #0ea5e9); padding: 32px; text-align: center; }
//             .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
//             .content { padding: 40px 32px; color: #3f3f46; line-height: 1.6; }
//             .content p { margin: 0 0 16px 0; font-size: 16px; }
//             .button-container { text-align: center; margin: 32px 0; }
//             .button { display: inline-block; background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
//             .button:hover { background-color: #0284c7; }
//             .footer { padding: 24px 32px; background-color: #f8fafc; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
//             .warning { font-size: 14px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>Password Reset Request</h1>
//             </div>
//             <div class="content">
//               <p>Hello,</p>
//               <p>We received a request to reset your password for your Skill Bridge account. Click the button below to choose a new password.</p>
//               <div class="button-container">
//                 <a href="${url}" class="button" style="color: #ffffff;">Reset Password</a>
//               </div>
//               <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
//               <p style="word-break: break-all; color: #0ea5e9; font-size: 14px;">${url}</p>
//               <div class="warning">
//                 <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns. Your password won't change until you create a new one.</p>
//               </div>
//             </div>
//             <div class="footer">
//               <p>&copy; ${new Date().getFullYear()} Skill Bridge. All rights reserved.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//       }),
//     });
//   } catch (error) {
//     console.error("Error sending reset password email:", error);
//   }
// };
