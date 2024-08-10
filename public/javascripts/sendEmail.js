const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MY_EMAIL_ADDRESS,
    pass: process.env.MY_APP_PASSWORD,
  },
});

async function sendPasswordResetEmail(user, subject, htmlString) {
  const mailOptions = {
    from: process.env.MY_EMAIL_ADDRESS,
    to: user.email,
    subject: subject,
    html: htmlString,
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: `Email sent successfully.`,
    };
  } catch (err) {
    return {
      success: false,
      message: "Failed to send email to inputted address",
    };
  }
}

module.exports = sendPasswordResetEmail;
