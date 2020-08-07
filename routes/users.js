//define packages/modules
const _ = require('lodash');
const config = require('config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/users');
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {uploads,dataUri} = require('../middlewares/multer');
const {cloudinary} = require('../middlewares/cloudinary-config');

//register route
router.post('/',async (req,res)=>{
    //validate data
    const result = User.validateUser(req.body);
    
    if (result.error) return res.status(400).json({"error":result.error.details[0].message});
    
    try {
        //check if user already exists
        let userExists = await User.findOne({email:req.body.email});
        if(userExists) return res.status(400).json({msg:'This email address is unavailable'});
        
        const user = new User(req.body);

        //gen salt and hash password
        const hash = await User.hashPassword(user.password);
        
        //gen token
        const payload = User.pickPayloadProps(user);
        const vToken = User.generateToken(payload);

        user.password = hash;
        user.verificationcode = vToken;
        
        const response = await User.sendVerificationEmail(user);
        if (response.rejected = []) {
            //save user and verification code to db
            await user.save();
            res.status(200).json({"success":true});
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({error});
    }

});


//login route
router.post('/login', async (req,res)=>{
    try {
            //retrieve email and password
    const email = req.body.email;
    const password = req.body.password;

    //check if user exists
    const user = await User.findOne({email:email});


    if(!user) {
        return res.status(404).json({"error":"User not found"});
    }else{
        //verify password
        const isMatch =  await bcrypt.compare(password,user.password);

        if (!isMatch) return res.status(400).json({"error":"Password incorrect"});

        // if (!user.isverified) {
        //     const verificationDetails = {
        //         "email":user.email,
        //         "firstname":user.firstname,
        //         "_id":user._id,
        //         "verificationcode":user.verificationcode
        //     };
        //     return res.status(400).json({error:"Account not Verified!",verificationDetails});
        // };
        
        //generate token and send with res
        const payload = User.pickPayloadProps(user);
        const token = User.generateToken(payload);

        // const split = token.split('.');
        // const headerPayload = split[0]+"."+split[1];
        // const signature = "."+split[2];


        // res.cookie('headerPayload',headerPayload);
        // res.cookie('signature',signature,{httpOnly:true,path:'/'});

        
        return res.status(200).json({"success":true,token});

    }
    } catch (error) {
        console.log(error)
        return res.status(500).json(error);
    }
});

//update user data
router.put('/',auth,async(req,res)=>{
    try {
        if (req.body.password || req.body.password == "") {
            req.body.password = await User.hashPassword(req.body.password);
        }
        const user = await User.findByIdAndUpdate({_id:req.user._id},req.body,{new:true}).select('-password -subscriptions -verificationcode -isverified');
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error});
    }
});

//resend verification link
router.put('/resend_verification_email', async(req,res)=>{
    try {
        //gen token
        const user = req.body;
        const payload = User.pickPayloadProps(req.body);
        const vToken = User.generateToken(payload);
        user.verificationcode = vToken;

        const response = await User.sendVerificationEmail(user);
        if (response.rejected = []) {
            res.status(200).json({"success":true,"msg":"Verification link has been sent to your email"});
        }

    } catch (error) {
            res.status(500).json({"success":false});
    }
});
//generate password reset
router.post('/password_reset', async (req,res)=>{
    try {
        
        //retrieve email
        const email = req.body.email;
        // //check db if user exists
        const user = await User.findOne({email});
        if(!user) return res.status(404).json({"error":'user not found'});

        // //generate token
        const passwordResetToken = User.generateToken(req.body);

        // //send email
        const response = await User.sendPasswordResetEmail(user,passwordResetToken);
        if (response.rejected = []) {
            res.status(200).json({"success":true,"msg":"Password reset Link has been sent to your email"});
        }


        return res.status(200).json({passwordResetToken});
    } catch (error) {
        return res.status(500).json({error});
    }
} );

router.put('/password_reset/:token', async (req,res)=>{
     try {
         //validate data
        const result = User.validatePasswordReset(req.body);
    
        // if (result.error) return res.status(400).json({'error':result.error.details[0].message})
         //retrieve token
        const token = req.params.token;

        //verify token
        const decoded = jwt.verify(token,process.env.PUBLIC_ACCESS_TOKEN_SECRET, {complete:true});

        //retrieve email
        const email = decoded.payload.email;
        const newPassword = req.body.password;
        
        //hash password
        const hash = await User.hashPassword(newPassword);
        const user = await User.findOneAndUpdate({email},{password:hash},{new:true});

        return res.status(200).json({"success":true,"msg":"Password reset successful"})
     } catch (error) {
         console.log(error)
        return res.status(500).json({"error":"password reset faild"});
     }
});

//verify user
router.put('/:vtoken', async (req,res)=>{
    try {
        //verify verification code
        let token = jwt.verify(req.params.vtoken, process.env.PUBLIC_ACCESS_TOKEN_SECRET, {algorithms:'RS256',complete:true});

        //retrieve email from token
        const id = token.payload._id;

        //find user in db, if user exists, update isVerified status
        const user = await User.findByIdAndUpdate({_id:id},{isverified:true},{new:true});

        //generate token and send with response
        const payload = User.pickPayloadProps(user);
        token = User.generateToken(payload);

        const split = token.split('.');
        const headerPayload = split[0]+"."+split[1];
        const signature = "."+split[2];

        res.cookie('headerPayload',headerPayload,{path:'/'});
        res.cookie('signature',signature,{httpOnly:true,sameSite:true,path:'/'});

        return res.status(200).json({"success":true,token});
    } catch (error) {
        return res.status(500).json({"success":false,"error":error.message});
    }
    
});

//logout
router.get('/logout', auth, async(req,res)=>{
   try {
    res.clearCookie('signature');
    res.clearCookie('headerPayload');
    return res.status(200).json({"success":true});
   } catch (error) {
       return res.status(500).json(error);
   }
});

//get user
router.get('/', auth, async(req,res)=>{
    try {
        const user = await User.findById(req.user._id).select('-password -subscriptions -verificationcode -isverified');
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error});
    }
});

//upload profile pic
router.post('/upload/:id',auth,uploads.single('image'), async(req,res)=>{
    try {
        const user = await User.findById(req.params.id);
        if(req.file) {
            const file = dataUri(req).content;
            return cloudinary.uploader.upload(file,{
                public_id:user.public_id,
                invalidate:true
            })
            .then((result)=>{
                const image = result.secure_url;
                user.public_id = result.public_id;
                user.imgurl = result.secure_url;
                user.save().then((event)=>{
                    res.status(200).json({success: true,image});
                })
            }).catch((err)=> res.status(500).json({msg:"Something went wrong",err}));
        }

    } catch (error) {
        res.status(500).json({error});
    }
});


//export router
module.exports = router;