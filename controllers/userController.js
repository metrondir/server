const asyncHandler = require("express-async-handler");
const {validationResult} = require("express-validator");
const {registration ,activate, login,logout, refresh ,getAllUsers,changePassword,changePasswordLink,forgetPassword } = require("../services/userService");
const ApiError = require("../middleware/apiError");


const getUsers = asyncHandler(async (req, res, next) => {
    try {
        const users = await getAllUsers(req, res);
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
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true,path: "/api/users/refresh", secure: true});
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
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true,path: "/api/users/refresh", secure: true});
        
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

const refreshTokenUser = asyncHandler(async (req,res,next) =>{
        try {
        const {refreshToken} = req.cookies;
        console.log("The refresh token is :", req.cookies);
        if(!refreshToken){
            return res.json("User is not authorized");
        }

        const userData = await refresh(refreshToken);
        res.cookie("refreshToken", userData.refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true, path: "/api/users/refresh", secure: true});
        return res.json(userData);   
    } catch (error) {
            next(error);
        }

});


const activateUser = asyncHandler(async (req,res,next) =>{
    try {
        const activationLink = req.params.link;
        await activate(activationLink);
        return res.redirect(process.env.CLIENT_URL);
    } catch (error) {
        next(error);
    }

});

const changePasswordUser = asyncHandler(async (req,res,next) =>{
    try {
       const {email,password} = req.body;
       const {refreshToken} = req.cookies;    
       await changePassword(email,password,refreshToken);
       res.clearCookie("refreshToken");
       return res.json("Password changed successfully");
       
    } catch (error) {
        next(error);
    }

});
const forgetPasswordUser = asyncHandler(async (req,res,next) =>{
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return next(ApiError.BadRequest("Validation error", errors.array()));
        }
        const {email, password} = req.body;
        await forgetPassword(email,password);
       
        return res.json("Forget password link has been sent to your email");
    } catch (error) {
        next(error);
    }

});

const changePasswordUserLink = asyncHandler(async (req,res,next) =>{
    try {
        const changePasswordLin = req.params.link;
        await changePasswordLink(changePasswordLin);
        return res.redirect(process.env.CLIENT_URL+"/login");
    } catch (error) {
        next(error);
    }

});


module.exports= {registerUser,loginUser,logoutUser,refreshTokenUser,activateUser,getUsers,changePasswordUser,changePasswordUserLink,forgetPasswordUser}