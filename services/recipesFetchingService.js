const axios = require('axios');

const { baseUrl, getApiKey } = require('../config/configApiHandler');
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const Recipe = require("../models/recipeModel");
const { translateText,handleApiError,translateRecipeInformation, detectLanguage, } = require('./translationService');
const {  getRecipesFromDatabaseRandom, getRecipesFromDatabaseByIngridients, getRecipesFromDatabaseComplex,getRecipesByCategories} =  require('./databaseRecipeFetchingService');
const { findToken } = require('./tokenService');

 async function fetchRecipesData(response, language) {
	if (language === "en" || !language) {
	  return response.map(recipe => ({
		 id: recipe.id,
		 title: recipe.title,
		 image: recipe.image,
		 readyInMinutes: recipe.readyInMinutes + ' min',
		 dishTypes: recipe.dishTypes || [],
	  }));
	} else {
	  await Promise.all(response.map(recipe => translateRecipeInformation(recipe, language)));
	  return response.map(recipe => ({
		 id: recipe.id,
		 title: recipe.title,
		 image: recipe.image,
		 readyInMinutes: recipe.readyInMinutes,
		 dishTypes: recipe.dishTypes || [],
	  }));
	}
 }


const fetchRecipesByIngredients = async (ingredients,number,language) => {
	let apiKey = getApiKey();
	let url = `${baseUrl}/findByIngredients?apiKey=${apiKey}&ingredients=${ingredients}&number=${number}&ignorePantry=true`;
	try {
	  const response = await axios.get(url);
	  const recipes = await getRecipesFromDatabaseByIngridients(number,ingredients);
	  const allRecipes = response.data.concat(recipes);
	  return Promise.all(allRecipes.map(async recipe => fetchInformationByRecomended(recipe.id, language)));

	} catch (error) {
	  return handleApiError(error, fetchRecipesByIngredients, ingredients, language);
	}
};


 const fetchRecipes = async (query, limit, type, diet,cuisine, maxReadyTime, language) => {
	let apiKey = getApiKey();
	const lanQuery = await detectLanguage(query);
	if (lanQuery !== "en") {
	  query = await translateText(query, "en");
	}
	let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${query}&number=${limit/2}&addRecipeNutrition=true`;
	
	if (type) url += `&type=${type}`;
	if (diet) url += `&diet=${diet}`;
	if(cuisine) url += `&cuisine=${cuisine}`;
	if (maxReadyTime) url += `&maxReadyTime=${maxReadyTime}`;

	try {
	  const response = await axios.get(url);
	  const recipes = await getRecipesFromDatabaseComplex(limit, type, diet, cuisine, maxReadyTime);
	  const allRecipes = response.data.results.concat(recipes);
	  
	  return fetchRecipesData(allRecipes, language);
	} catch (error) {
	  return handleApiError(error, fetchRecipes, query, limit, type, diet, maxReadyTime, language);
	}
 }

 const fetchRecipesByCategories = async (limit, sort, sortDirection, language) => {
	let apiKey = getApiKey();
	
	let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&number=${limit}&sort=${sort}&sortDirection=${sortDirection}&addRecipeNutrition=true`;
	try {
		const response = await axios.get(url);
		if(sort === "time"){
		const recipesByDB = await	getRecipesByCategories(sortDirection,sort);
		
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}
	if(sort === "popularity"){
		const recipesByDB = await	getRecipesByCategories(sortDirection,sort);
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}
	if(sort === "price"){
		
		await Promise.all(response.data.results.map(async (recipe) => {
			recipe.pricePerServing = Math.ceil((recipe.pricePerServing * recipe.servings) / 100);
	  }));
		const recipesByDB = await	getRecipesByCategories(sortDirection,sort);
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}	
	} catch (error) {
	  return handleApiError(error, fetchRecipesBySort, limit, sort, sortDirection, language);
	}
};

 const fetchRandomRecipes = async (limit,language,refreshToken) => {
	let apiKey = getApiKey();
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
  try {
    const response = await axios.get(url);
	
	 const recipes = await getRecipesFromDatabaseRandom(limit,findToken.user);
	 
	 const allRecipes = response.data.recipes.concat(recipes);
    return fetchRecipesData(allRecipes, language);
  } catch (error) {
    return handleApiError(error, fetchRandomRecipes, limit, language);
  }
}


const fetchRecommendedRecipes = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/similar?apiKey=${apiKey}`;
	try {
	  const response = await axios.get(url);
	  const stringId = id.toString();
	  if (stringId.length < 7) {
		 return Promise.all(response.data.map(async recipe => fetchInformationByRecomended(recipe.id, language)));
	  }
	} catch (error) {
	  return handleApiError(error, fetchRecommendedRecipes, id, language);
	}
}


const fetchInformationByRecomended = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
		const response = await axios.get(url);
		if(language === "en"|| !language)
		{
			return {
				id: response.data.id,
				title: response.data.title,
				dishTypes: response.data.dishTypes || [],
				image: response.data.image,
				readyInMinutes: response.data.readyInMinutes + ' min',
			 };
			}
			else {
				await translateRecipeInformation(response.data, language);
				return {
				  id: response.data.id,
				  title: response.data.title,
				  dishTypes: response.data.dishTypes || [],
				  image: response.data.image,
				  readyInMinutes: response.data.readyInMinutes,
				};
			}
		}
		catch(error){
			return handleApiError(error, fetchInformationByRecomended, id,language);
		}
	}

const fetchAggregateLikesById = async(recipeId) =>{
		let apiKey = getApiKey();
	const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
		const response = await axios.get(url);
		return { aggregateLikes: response.data.aggregateLikes };
	}
	catch(error){
		return handleApiError(error, fetchInformationById, id,language);
	}
}


const fetchInformationById = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
		const response = await axios.get(url);
		if(language === "en"|| !language)
		{
		return {
			id: response.data.id,
			title: response.data.title,
			extendedIngredients: response.data.extendedIngredients.map(ingredient => ingredient.original) || [],
			pricePerServing: Math.ceil((response.data.pricePerServing*response.data.servings)/100),
			cuisines: response.data.cuisines || [],
			dishTypes: response.data.dishTypes || [],
			instructions: response.data.instructions || [],
			cheap: response.data.cheap,
			vegetarian: response.data.vegetarian,
			image: response.data.image,
			readyInMinutes: response.data.readyInMinutes + ' min',
		 };
		}
		else {
			await translateRecipeInformation(response.data, language);
			response.data.extendedIngredients = await Promise.all(response.data.extendedIngredients.map(async (ingredient) => {
				ingredient.original = await translateText(ingredient.original,language);
				return ingredient.original;
			 }));
			response.data.instructions = await translateText(response.data.instructions,language);
			response.data.vegetarian = await translateText(response.data.vegetarian ? "vegetarian" : "non-vegetarian",language);
			response.data.cheap = await translateText(response.data.cheap ? "cheap" : "expensive",language);
			response.data.cuisines = await Promise.all(response.data.cuisines.map(cuisine => translateText(cuisine,language)));
			return {
			  id: response.data.id,
			  title: response.data.title,
			  extendedIngredients: response.data.extendedIngredients,
			  cuisines: response.data.cuisines,
			  dishTypes: response.data.dishTypes,
			  instructions: response.data.instructions,
			  pricePerServing: Math.ceil((response.data.pricePerServing*response.data.servings)/100),
			  cheap: response.data.cheap,
			  vegetarian: response.data.vegetarian,
			  image: response.data.image,
			  readyInMinutes: response.data.readyInMinutes,
			};
		 }
	  } catch (error) {
		 return handleApiError(error, fetchInformationById, id,language);
	  }
	};


	const fetchFavoriteRecipes = async (id, language) => {
		try {
		  const apiKey = getApiKey();
		
		  const allFavoriteRecipes = await FavoriteRecipe.find({ user: id });
	 
		  const favoriteRecipes = [];
		  const favoriteRecipesByDb = [];
	 
		  for (const favoriteRecipe of allFavoriteRecipes) {
			 if (favoriteRecipe.recipe.length === 6) {
				favoriteRecipes.push(favoriteRecipe);
			 } else {
				favoriteRecipesByDb.push(favoriteRecipe);
			 }
		  }
		  
		
	 
		  const recipes = await Promise.all(
			 favoriteRecipes.map(async (favoriteRecipe) => {
				const url = `${baseUrl}/${favoriteRecipe.recipe}/information?includeNutrition=false&apiKey=${apiKey}`;
	 
				try {
				  const response = await axios.get(url);
	 
				  if (language === "en" || !language) {
					 return {
						id: response.data.id,
						title: response.data.title,
						image: response.data.image,
						readyInMinutes: response.data.readyInMinutes + ' min',
						dishTypes: response.data.dishTypes || [],
					 };
				  } else {
					 await translateRecipeInformation(response.data, language);
					 return {
						id: response.data.id,
						title: response.data.title,
						image: response.data.image,
						readyInMinutes: response.data.readyInMinutes,
						dishTypes: response.data.dishTypes || [],
					 };
				  }
				} catch (error) {
				  console.log(error);
				  return handleApiError(error, fetchFavoriteRecipes, id, language);
				}
			 })
		  );
	 
		  const fetchRecipes = async (recipeIds) => {
			try {
			  const fetchedRecipes = await Recipe.find({ _id: recipeIds });
			  return fetchedRecipes;
			} catch (error) {
			  console.log(error);
			  throw new Error(error);
			}
		 };
	 
		  const dbRecipes = await Promise.all(
			 favoriteRecipesByDb.map(async (favoriteRecipe) => {
				try {
					const fetchedRecipes = await fetchRecipes([favoriteRecipe.recipe]);

     			 if (fetchedRecipes.length > 0) {
        		const fetchedRecipe = fetchedRecipes[0];
				console.log(fetchedRecipe)
				  if (language === "en" || !language) {
					 return {
						id: fetchedRecipe._id,
						title: fetchedRecipe.title,
						image: fetchedRecipe.image,
						readyInMinutes: `${fetchedRecipe.readyInMinutes} min`,
						dishType: fetchedRecipe.dishType || [],
					 };
				  } else {
					 await translateRecipeInformation(fetchedRecipe, language);
					 return {
						id: fetchedRecipe._id,
						title: fetchedRecipe.title,
						image: fetchedRecipe.image,
						readyInMinutes: fetchedRecipe.readyInMinutes,
						dishType: fetchedRecipe.dishType|| [],
					 };
				  }
				}
				} catch (error) {
				  console.log(error);
				}
			 })
		  );
			console.log(dbRecipes)
		  return recipes.concat(dbRecipes);
		} catch (error) {
		  console.log(error);
		  return handleApiError(error, fetchFavoriteRecipes, id, language);
		}
	 };
	 

const parsedIngredients = async (ingredients) => {
	try {
	  const apiKey = getApiKey();
	  const url = `${baseUrl}/parseIngredients?includeNutrition=false&apiKey=${apiKey}`;
 
	  const ingredientList = ingredients.map(item => item.original).join('\n'); 
	  const formData = new URLSearchParams();
	  formData.append('ingredientList', ingredientList);
 
	  const response = await axios.post(
		 url,
		 formData.toString(), 
		 {
			headers: {
			  'Content-Type': 'application/x-www-form-urlencoded',
			},
		 }
	  );
	  
	  let totalEstimatedCost = response.data.reduce((total, item) => {
		return total + item.estimatedCost.value;
	 }, 0);
	 	totalEstimatedCost = Math.ceil(totalEstimatedCost/100);
	  return totalEstimatedCost;
	} catch (error) {
	  throw error; 
	}
 };
 
 
 


module.exports = {
	fetchRecipes,
	fetchRandomRecipes,
	fetchRecommendedRecipes,
	fetchInformationById,
	fetchFavoriteRecipes,
	fetchRecipesByIngredients,
	fetchRecipesByCategories,
	parsedIngredients,
	fetchAggregateLikesById,
};
