//required packages/modules
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const Joi = require('joi');
const _ = require('lodash');
const nodemailer = require('nodemailer');
// const { google } = require('googleapis');
 
//   const oauth2Client = new google.auth.OAuth2(
//     JSON.parse(process.env.GMAIL_CLIENT_ID),
//     JSON.parse(process.env.GMAIL_CLIENT_SECRET),
//     JSON.parse(process.env.GMAIL_REDIRECT_URL),
//   );
 
//   const code = "4/2wHkS8PUSx3bYfOwFUsQHoF8JXNqT8fyWk5or91N29MN03kWMWVV4_QU5vwlXvujtgdcrawjJho1RtTRCrtOG_0";

//   const getToken = async () => {
//     const { tokens } = await oauth2Client.getToken(code);
//     // console.info(tokens);
//   };
 
//   getToken();

  // Generate a url that asks permissions for Gmail scopes
//   const GMAIL_SCOPES = [
//     'https://mail.google.com/',
//     'https://www.googleapis.com/auth/gmail.modify',
//     'https://www.googleapis.com/auth/gmail.compose',
//     'https://www.googleapis.com/auth/gmail.send',
//   ];
 
//   const url = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: GMAIL_SCOPES,
//   });
 
//   console.info(`authUrl: ${url}`);

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
        default:'https://res.cloudinary.com/dz3c3h3jx/image/upload/v1596669125/assets/ic_person_outline_black_48dp_nfimoe.png'
    },
    public_id:{
        type:String,
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

// generate verification token
module.exports.generateToken = function(payload){
    const vToken = jwt.sign(payload,JSON.parse(process.env.PRIVATE_ACCESS_TOKEN_SECRET),{ algorithm:'RS256',expiresIn:'24h'});
    return vToken;
}

module.exports.generateToken = function(payload){
    const vToken = jwt.sign(payload,process.env.PRIVATE_ACCESS_TOKEN_SECRET,{ algorithm:'RS256',expiresIn:'24h'});
    return vToken;
}

//nodemailer config
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: JSON.parse(process.env.GMAIL_CLIENT_EMAIL),
      clientId: JSON.parse(process.env.GMAIL_CLIENT_ID),
      clientSecret: JSON.parse(process.env.GMAIL_CLIENT_SECRET),
      refreshToken: JSON.parse(process.env.GMAIL_REFRESH_TOKEN),
      accessToken: JSON.parse(process.env.GMAIL_ACCESS_TOKEN),
      expires: Number.parseInt(JSON.parse(process.env.GMAIL_TOKEN_EXPIRE), 10),
    },
  });


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