const mongoose = require("mongoose");

const TokenSchema = mongoose.Schema({
	user:{
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "User",
	},
	
	refreshToken: {
		type: String,
		required: true,
	},


});

module.exports = mongoose.model("Token", TokenSchema);