const nodemailer = require('nodemailer');
const ApiError = require('../middleware/apiError');

class EmailService {
	constructor() {
		 const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, API_URL } = process.env;

		 this.transporter = nodemailer.createTransport({
			  host: SMTP_HOST,
			  port: SMTP_PORT,
			  secure: true,
			  auth: {
					user: SMTP_USER,
					pass: SMTP_PASSWORD,
			  },
		 });

		 this.apiUrl = API_URL;
	}

	async sendActivationGmail(to, link) {
		 try {
			  await this.transporter.sendMail({
					from: process.env.SMTP_USER,
					to,
					subject: `Activation link ${this.apiUrl}`,
					text: '',
					html: `
						 <div>
							  <h1>For activation follow the link</h1>
							  <a href="${link}">${link}</a>
						 </div>
					`,
			  });
			 
		 } catch (error) {
			  throw ApiError.BadRequest(`Error sending activation email: ${error}`);
		 }
	}

	async sendChangePasswordUser(to, link) {
		 try {
			  await this.transporter.sendMail({
					from: process.env.SMTP_USER,
					to,
					subject: `Confirmation link to change password ${this.apiUrl}`,
					text: '',
					html: `
						 <div>
							  <h1>For Change password</h1>
							  <a href="${link}">${link}</a>
						 </div>
					`,
			  });
			 
		 } catch (error) {
			 throw ApiError.BadRequest(`Error sending change password email: ${error}`);
		 }
	}
}

module.exports = EmailService;
