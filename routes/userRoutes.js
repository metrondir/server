const express = require("express");
const { registerUser, currentUser, loginUser, listOfUsers } = require("../controllers/userController");
const validateToken = require("../midlware/validateTokenHandler");

const router = express.Router();

router.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
 });

router.get("/users",listOfUsers)

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/current",validateToken,currentUser);

module.exports = router;