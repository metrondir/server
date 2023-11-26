const nodemailer = require('nodemailer');

class EmailService {
	 constructor() {
		  this.transporter = nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: process.env.SMTP_PORT,
				secure: true,
				auth: {
					 user: process.env.SMTP_USER,
					 pass: process.env.SMTP_PASSWORD,
				},
		  });
	 }

	 async sendActivationGmail(to, link) {
		  await this.transporter.sendMail({
				from: process.env.SMTP_USER,
				to,
				subject: `Activation link` + process.env.API_URL,
				text: '',
				html:
					 `
					 <div>
						  <h1>For activation follow the link</h1>
						  <a href="${link}">${link}</a>
					 </div>
				`,
		  });
	 }
	 async sendChangePasswordUser(to, link) {
		await this.transporter.sendMail({
			 from: process.env.SMTP_USER,
			 to,
			 subject: `Confirmation link to change passwors ` + process.env.API_URL,
			 text: '',
			 html:
				  `
				  <div>
						<h1>For Change password</h1>
						<a href="${link}">${link}</a>
				  </div>
			 `,
		});
  }
}


module.exports = EmailService;
