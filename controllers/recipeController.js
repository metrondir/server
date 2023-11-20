const asyncHandler = require("express-async-handler");
const Recipe = require("../models/recipeModel");
//@desc Get all contacts
//@route GET /api/recipe
//@access public
const getRecipes = asyncHandler(async (req, res) => {
    const recipes = await Recipe.find();
    res.status(200).json(recipes);
});

//@desc Create new recipe
//@route POST /api/recipe
//@access public
const createRecipe = asyncHandler( async( req, res) => {
    console.log("The request body is :" ,req.body);
    const{
        title,
        ingredients,
        instructions,
        imageUrl,
        cookingTime,
        cuisineType} = req.body;
        if(!title || !ingredients || !instructions || !imageUrl || !cookingTime || !cuisineType){
            res.status(400)
            throw new Error("All fields are mandatory")    
        }

    const recipe = await Recipe.create({
        title,
        ingredients,
        instructions,
        imageUrl,
        cookingTime,
        cuisineType,
    });
    res.status(201).json(recipe);
});

//@desc Get recipe
//@route GET /api/recipe:/id
//@access public
const getRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        res.status(404);
        throw new Error("Recipe not found");
    }
    res.status(200).json(recipe);
  });

//@desc Update recipe
//@route PUT /api/recipe:/id
//@access public
const updateRecipe = asyncHandler(async(req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        res.status(404);
        throw new Error("Recipe not found");
    }
    const updateRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        req.body,
        {new : true}
    );
    res.status(200).json(updateRecipe);
});

//@desc Delete recipe
//@route DELETE /api/recipe:/id
//@access public
const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw new Error("Recipe not found");
    }
    await Recipe.deleteOne({ _id: req.params.id });
    res.status(200).json(recipe);
});

module.exports = {
    getRecipes,
    createRecipe,
    getRecipe,
    updateRecipe ,
    deleteRecipe,
};