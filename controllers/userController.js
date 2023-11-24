const asyncHandler = require("express-async-handler");
const {validationResult} = require("express-validator");
const {registration ,activate, login,logout, refresh ,getAllUsers } = require("../services/userService");
const ApiError = require("../middleware/apiError");

const getUsers = asyncHandler(async (req, res,next) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});
 
//@desc Register a user
//@route POST /api/users/register
//@access public
const registerUser = asyncHandler(async (req,res,next) =>{
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return next(ApiError.BadRequest("Validation error", errors.array()));
        }
        const {username, email, password} = req.body;
        const userData = await registration(username, email, password);
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true});
        console.log("The user data is :", userData);
        return res.json(userData);
    } catch (error) {
        next(error);
    }
});

//@desc loginUser a user
//@route POST /api/users/login
//@access public
const loginUser = asyncHandler(async (req,res,next) =>{
    try {
        const {email,password} = req.body;
        const userData = await login(email, password);
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true});
        
        return res.json(userData);
    } catch (e) {
        next(e);
    }

});

const logoutUser = asyncHandler(async (req,res,next) =>{
    try{
        const {refreshToken} = req.cookies;
        const token = await logout(refreshToken);
        res.clearCookie("refreshToken");
        return res.json(token);
    }
    catch(error){
        next(error);
    }
});

const refreshTokenUser = asyncHandler(async (req,res) =>{
        try {
        const {refreshToken} = req.cookies;
        const userData = await refresh(refreshToken);
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true});
        return res.json(userData);   
    } catch (error) {
            next(error);
        }

});


const activateUser = asyncHandler(async (req,res) =>{
    try {
        const activationLink = req.params.link;
        await activate(activationLink);
        return res.redirect(process.env.CLIENT_URL);
    } catch (error) {
        next(error);
    }

});





module.exports= {registerUser,loginUser,logoutUser,refreshTokenUser,activateUser,getUsers}