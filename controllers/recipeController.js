const asyncHandler = require("express-async-handler");
const Recipe = require("../models/recipeModel");
const { redisGetModels,redisGetModelsWithPaginating, onDataChanged } = require("../middleware/paginateMiddleware");
const ApiError = require("../middleware/apiError");
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const dir = './uploads';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, new Date().toISOString() + file.originalname);
    }
  });
  
  const upload = multer({ storage: storage });



//@desc Get all contacts
//@route GET /api/recipe
//@access public




const getRecipes = asyncHandler(async (req, res,next) => {
    try{
        if(req.query.page && req.query.limit){
           
            const recipes = await redisGetModelsWithPaginating(Recipe, req, res, next);
            res.status(200).json(recipes);
        }
        else{
           
            const recipes = await redisGetModels(Recipe, req, res, next);
            res.status(200).json(recipes);
        }
    }
    catch(error){
        next(error);
    }
   
});

//@desc Create new recipe
//@route POST /api/recipe
//@access public
function parseNestedArray(arr) {
    return arr.map(item => {
      if (Array.isArray(item)) {
        return parseNestedArray(item);
      } else {
        return JSON.parse(item).original;
      }
    });
  }
  const createRecipe = [
    // Validate request data
    check('title').notEmpty(),
    check('cuisine').notEmpty(),
    check('dishType').notEmpty(),
    check('readyInMinutes').notEmpty(),
    check('vegetarian').notEmpty(),
    check('cheap').notEmpty(),
    check('instructions').notEmpty(),
    check('image').notEmpty(),
  
    upload.single('image'),
  
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      try {
        // Create new recipe
        const recipe = new Recipe(req.body);
        console.log(req);
        recipe.image = {
          data: req.file.filename,
          contentType: "image/png",
        };
        await recipe.save();
  
        // Send response
        res.status(201).json(recipe);
        onDataChanged('Recipe');
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    })
  ];

//@desc Get recipe
//@route GET /api/recipe:/id
//@access public
const getRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        res.status(404);
        throw ApiError.BadRequest("Recipe not found");
    }
    res.status(200).json(recipe);
    
  });

//@desc Update recipe
//@route PUT /api/recipe:/id
//@access public
const updateRecipe = asyncHandler(async(req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        return res.status(404).json({ error: "Recipe not found" });
    }

   

    const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        req.body,
        {new : true}
    );

    res.status(200).json(updatedRecipe);
    onDataChanged('Recipe');
 
});

//@desc Delete recipe
//@route DELETE /api/recipe:/id
//@access public
const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw ApiError.BadRequest("Recipe not found");
    }
    await Recipe.deleteOne({ _id: req.params.id });
    res.status(200).json(recipe);
    onDataChanged('Recipe');
});

module.exports = {
    getRecipes,
    createRecipe,
    getRecipe,
    updateRecipe ,
    deleteRecipe,
};



