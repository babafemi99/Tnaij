const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // create a transporter
  const transporter = nodemailer.createTransport({
    // host: process.env.EMAIL_HOST,
    // port: process.env.EMAIL_PORT,
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: false,
    logger: true,
    auth: {
      user: 'oreoluwa83@yahoo.com',
      pass: 'ojserwolbfxoogau'
    }
  });

  // Define the email options
  const mailOptions = {
    from: 'Oreoluwa Oloniyo <ooluwa27@gmail.com>',
    to: options.email,
    subject: options.subject,
    message: options.message
    //html:
  };
  // send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
