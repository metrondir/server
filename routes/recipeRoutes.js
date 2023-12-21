const express = require("express");
const router = express.Router();
const {getRecipes,createRecipe,getRecipe,updateRecipe ,deleteRecipe,} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");
const convertFieldsToBooleans = require("../middleware/convertFields");
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../src/images')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});

const fileFilter = (req, file, cb) => {

  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 
  },
  fileFilter: fileFilter
});
router.route("/").get(authMiddleware, getRecipes).post(authMiddleware,upload.single("image"),convertFieldsToBooleans(['vegetarian', 'cheap']), createRecipe);

router.route("/:id").get(authMiddleware, getRecipe).put(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), updateRecipe).delete(authMiddleware, deleteRecipe);
module.exports = router;