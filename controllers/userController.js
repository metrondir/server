const asyncHandler = require("express-async-handler");
const {validationResult} = require("express-validator");
const {registration ,activate, login,logout, refresh ,changePassword,changePasswordLink,forgetPassword } = require("../services/userService");
const ApiError = require("../middleware/apiError");
const User = require("../models/userModel");
const { redisGetModelsWithPaginating,onDataChanged,redisGetModels } = require("../middleware/paginateMiddleware");
const { logger } = require("express-winston");


const getUsers = asyncHandler(async (req, res, next) => {
    try {
        if(req.query.page && req.query.limit)
        {
            const users = await redisGetModelsWithPaginating(User, req, res, next);
            res.status(200).json(users);
        }
        else{
            const users = await redisGetModels(User, req, res, next);
            res.status(200).json(users);
        }
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
        res.cookie("refreshToken", userData.refreshToken, {maxAge: process.env.COOKIE_MAX_AGE, secure: true, sameSite: 'None'});
      
        onDataChanged('User');
        return res.status(201).json(userData);
       
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
        res.cookie("refreshToken", userData.refreshToken, {maxAge: process.env.COOKIE_MAX_AGE});
        
        return res.status(200).json(userData);
    } catch (eror) {
        next(eror);
    }

});
//@desc logoutUser a user
//@route POST /api/users/logout
//@access private with refreshtoken
const logoutUser = asyncHandler(async (req,res,next) =>{
    try{
        const {refreshToken} = req.cookies;
        const token = await logout(refreshToken);
        
        res.clearCookie("refreshToken", {
          });
        return res.status(200).json({ token: token, message: "User logged out successfully" });

    }
    catch(error){
        next(error);
    }
});
//@desc refreshToken from user
//@route POST /api/users/refresh
//@access private with refreshtoken
const refreshTokenUser = asyncHandler(async (req,res,next) =>{
        try {
        console.log(req.cookies);
        const {refreshToken} = req.cookies;
        const userData = await refresh(refreshToken);
        res.cookie("refreshToken", userData.refreshToken, {maxAge: process.env.COOKIE_MAX_AGE, secure: true,sameSite: 'None'});
        return res.status(200).json(userData);   
    } catch (error) {
            next(error);
    }
});

//@desc Activate a user
//@route POST /api/users/activate/:link
//@access private with activationLink
const activateUser = asyncHandler(async (req,res,next) =>{
    try {
        const activationLink = req.params.link;
        await activate(activationLink);
        onDataChanged('User');
        return res.redirect(process.env.CLIENT_URL);
    } catch (error) {
        next(error);
    }

});
//@desc Change password of user
//@route POST /api/users/change-password
//@access private with email and password
const changePasswordUser = asyncHandler(async (req,res,next) =>{
    try {
       const {email,password} = req.body;
       await changePassword(email,password);
       onDataChanged('User');   
       return res.status(200).json("Password changed successfully");
       
    } catch (error) {
        next(error);
    }

});
//@desc Forget password of user
//@route POST /api/users/forgot-password
//@access public with email and password
const forgetPasswordUser = asyncHandler(async (req,res,next) =>{
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return next(ApiError.BadRequest("Validation error", errors.array()));
        }
        const {email} = req.body;
        await forgetPassword(email);
        onDataChanged('User');
        return res.status(200).json("Forget password link has been sent to your email");
    } catch (error) {
        next(error);
    }

});
//@desc Confirm Link to change password of user
//@route POST /api/users/change-password/:link
//@access private with link
const changePasswordUserLink = asyncHandler(async (req,res,next) =>{
    try {
        const changePasswordLin = req.params.link;
        await changePasswordLink(changePasswordLin);
        return res.redirect(process.env.CLIENT_URL+"/new-password");
    } catch (error) {
        next(error);
    }

});


module.exports= {registerUser,loginUser,logoutUser,refreshTokenUser,activateUser,getUsers,changePasswordUser,changePasswordUserLink,forgetPasswordUser}