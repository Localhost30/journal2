const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOTP = async (to, code) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Trading Journal Pro — Code de vérification',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #0a0e17; padding: 40px; border-radius: 16px; border: 1px solid rgba(148,163,184,0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #06b6d4); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">📊</div>
          <h1 style="color: #f1f5f9; font-size: 22px; margin: 16px 0 4px;">Code de vérification</h1>
          <p style="color: #64748b; font-size: 14px;">Utilisez ce code pour réinitialiser votre mot de passe</p>
        </div>
        <div style="background: rgba(59,130,246,0.1); border: 2px dashed rgba(59,130,246,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Votre code OTP</p>
          <p style="font-size: 36px; font-weight: 700; color: #3b82f6; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">Ce code expire dans <strong style="color: #f59e0b;">10 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };
