//required packages/modules
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const Joi = require('joi');
const _ = require('lodash');
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const myOAuth2Client = new OAuth2(process.env.GMAIL_CLIENT_ID,process.env.GMAIL_CLIENT_SECRET,process.env.GMAIL_PLAYGROUND);

myOAuth2Client.setCredentials({refresh_token:process.env.GMAIL_REFRESH_TOKEN});

const myAccessToken = myOAuth2Client.getAccessToken()

//user schema
const userSchema = new schema({
    firstname:{
        type:String,
        required:true,
        maxlength:50
    },
    lastname:{
        type:String,
        required:true,
        maxlength:50
    },
    email:{
        type:String,
        required:true,
        unique:true,
        maxlength:255
    },
    imgurl:{
        type:String,
        default:'../../../assets/images/ic_person_outline_black_48dp.png'
    },
    password:{
        type:String,
        required:true,
        minlength:8,
        maxlength:1024
    },
    occupation:{
        type:String,
        required:true
    },
    verificationcode:String,
    isverified:{
        type:Boolean
    },
    subscriptions:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Channel'
    }]

});

//user model
const User = mongoose.model('User',userSchema);
module.exports = User;

//validate user input
module.exports.validateUser = function (user) {  
    const schema = Joi.object().keys({
        firstname: Joi.string().max(50).required(),
        lastname: Joi.string().max(50).required(),
        email:Joi.string().email({minDomainAtoms:2}).required(),
        password:Joi.string().min(8).required(),
        occupation:Joi.string().required()
    });
    
    //.... Return result....
    const result = Joi.validate(user, schema);
    return result;
}

//validate reset password
module.exports.validatePasswordReset = function (password) {
    const schema = Joi.object().keys({
        email:Joi.string().email({minDomainAtoms:2}).required(),
        new_password:Joi.string().min(8).required()
    });

    //.... Return result....
    const result = Joi.validate(password, schema);
    return result;
}

module.exports.hashPassword = async function (password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password,salt);
    return hash;
}

//select properties to use in token generation
module.exports.pickPayloadProps = function(user){
    const payload = _.pick(user,['_id','email','firstname']);
    return payload;
}

//generate verification token
module.exports.generateToken = function(payload){
    const vToken = jwt.sign(payload,
    JSON.parse(process.env.PRIVATE_ACCESS_TOKEN_SECRET),{ algorithm:'RS256',expiresIn:'24h'});
    return vToken;
}

//nodemailer config
const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
         type: "OAuth2",
         user: process.env.GMAIL_CLIENT_EMAIL, //your gmail account you used to set the project up in google cloud console"
         clientId: process.env.GMAIL_CLIENT_ID,
         clientSecret: process.env.GMAIL_CLIENT_SECRET,
         refreshToken: process.env.GMAIL_REFRESH_TOKEN,
         accessToken: myAccessToken //access token variable we defined earlier
    }});

//send verification email
module.exports.sendVerificationEmail = async function(user){
    return new Promise((resolve,reject)=>{
        const output = `
        <div>
            <p>Welcome ${user.firstname}, Thank you for joining notifymeapp, now click on the link below to verify your account</p><br>
            <a target="_blank" href="${process.env.CLIENT_BASE_URL}/verifyaccount/${user.verificationcode}" style="padding: 15px; background-color: blue; border: none; color: white; font-size: 20px; box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19); text-decoration: none;">Verify Account</a><br>
            <p>This link is valid for 24hrs!</p>
        </div>
      `;
        const mailOptions = {
            from:process.env.GMAIL_CLIENT_EMAIL,
            to:user.email,
            subject:'Verify Your notifyme account',
            text:'Verify your account',
            html:output
        };
    
         transport.sendMail(mailOptions, function (error,info){
            if (error) {
                reject(error);
                console.log(error)
            }      
                resolve(info);
        });
    });
   
}

//send password reset email
module.exports.sendPasswordResetEmail = async function(user,token){
    return new Promise((resolve,reject)=>{
        const output = `
        <div>
            <p>Click the link below to reset your password</p><br>
            <a href="${process.env.CLIENT_BASE_URL}/forgot_password/${token}/?reset=true" style="padding: 15px; background-color: blue; border: none; color: white; font-size: 20px; box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19); text-decoration: none;">Reset Password</a><br>
            <p style="margin-top:20px">This link is valid for 24hrs!</p>
        </div>
      `;
        const mailOptions = {
            from:'Notifyme',
            to:user.email,
            subject:'Reset Password Link',
            text:'Reset your password',
            html:output
        };
    
         transport.sendMail(mailOptions, function (error,info){
            if (error) {
                console.log(error)
                reject(error);
            }else{
                console.log(info)
                resolve(info);
            }
        });
    });
   
}