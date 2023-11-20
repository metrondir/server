const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
//const redisClient = require("../config/redicClient");

const listOfUsers = asyncHandler(async (req, res) => {
    const users = await User.findAll();
    res.json(users);
  });
//@desc Register a user
//@route POST /api/users/register
//@access public
const registerUser = asyncHandler(async (req,res) =>{
    const{username, email,password}=req.body;
    if(!username || !email || !password){
    res.status(400);
        throw new Error("All fields are mandatory");
    }
    const userAvailable = await User.findOne({email});
    if(userAvailable) {
        res.status(400);
        throw new Error("User already registered");
    }

    const hashedPassword = await bcrypt.hash(password,10);
    console.log("Hashed Password: " ,hashedPassword);
    const user = await User.create({
        username,
        email,
        password: hashedPassword,
    });
    if(user){
        //redisClient.set(`user:${user.id}`, JSON.stringify(user));
        
        res.status(201).json({_id: user.id , email: user.email});
    }
    else{
        res.status(400);
        throw new Error("User data is not valid");
    }
    console.log(`user created ${user}`);
    res.json({ message: "Register the user"});
});

//@desc loginUser a user
//@route POST /api/users/login
//@access public
const loginUser = asyncHandler(async (req,res) =>{
    const {email , password} = req.body;
    if(!email || !password){
        res.status(400);
        throw new Error("All field are mandatory!");
    }
    const user = await User.findOne({email});

    if(user &&(await bcrypt.compare(password, user.password))){
        const accesToken = jwt.sign({
            user:{
                username: user.username,
                email: user.email,
                id: user.id,
            },
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "5m"}
        );
        const refreshToken = jwt.sign({
            user:{
                username: user.username,
                email: user.email,
                id: user.id,
            },
        },)
        //redisClient.set(`user:${user.id}`, JSON.stringify(user));
        res.status(200).json({accesToken});
    }else{
        res.status(401);
        throw new Error("Email or password is not valid ");
    }

});

//@desc Current user information
//@route GET /api/users/current
//@access private
const currentUser = asyncHandler(async (req,res) =>{
    res.json({ message: "Current user information"});
});


module.exports= {registerUser,loginUser,currentUser,listOfUsers}