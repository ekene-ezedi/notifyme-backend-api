//import required modules
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Joi = require('joi');
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const GMAIL_CLIENT_ID="380221621589-d3e6o527c5f5k43em2uroghs5h0psnqj.apps.googleusercontent.com"

const GMAIL_CLIENT_SECRET="MKPik5kkqJLipq4pfQ5ppgT7"

const GMAIL_PLAYGROUND="https://developers.google.com/oauthplayground"

const GMAIL_REFRESH_TOKEN="1//04csBOSG0Ca0YCgYIARAAGAQSNwF-L9IrTGUva0mEMgkt95dVEV6JnSvAR7j686zb7GKdFMoI5QyY_avN7XP2p-z7kgi4o86IxCY"

GMAIL_CLIENT_EMAIL="teamnotifyme@gmail.com"

const myOAuth2Client = new OAuth2(GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_PLAYGROUND);

myOAuth2Client.setCredentials({refresh_token:GMAIL_REFRESH_TOKEN});

const myAccessToken = myOAuth2Client.getAccessToken()



const eventSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    channelId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Channel',
        required:true
    },
    admin:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    date:{
        type:Date,
        required:true
    },
    time:{
        type:String,
        required:true
    },
    venue:{
        type:String,
        required:true
    },
    attendees:[{
        type:String
    }],
    guests:[{
        name:String,
        role:String,
        img:String
    }],
    likes:[],
    createdat:{
        type:Date,
        default:Date.now(),
        required:true
    },
    imgurl:{
        type:String,
        default:'../../../../assets/images/images-button.png'
    }
});

//model
const Event = mongoose.model('Event',eventSchema);
module.exports = Event;

//validate event req body
module.exports.validateEvent = function (event) {  
    const schema = Joi.object().keys({
        name: Joi.string().required(),
        description:Joi.string().required(),
        date:Joi.date().required(),
        time:Joi.string().required(),
        venue:Joi.string().required(),
        likes:Joi.string(),
        channelId:Joi.required(),
        admin:Joi.required(),
        attendees:Joi.array(),
        guests:Joi.array()
    });
    
    //.... Return result....
    let result = Joi.validate(event, schema);
    return result;
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
    
//send email notification
module.exports.sendEmailNotification = function (data,event) {
      data.subscribers.forEach(user => {
        return res =  new Promise((resolve,reject)=>{
            const output = `
                <div style="margin-left:25%;max-width:50%; padding:10px; border-radius:4px;background-color:blue; color:white;">
                    <p style="text-align:center;font-size:20px">Upcoming Event from ${data.channelname}</p>
                    <p style="text-align:center;font-size:20px">Event Name > ${event.name}</p>
                    <p style="text-align:center;font-size:20px">Click on the button below to view details</h3><br>
                    <a href="${process.env.CLIENT_BASE_URL}/event/${event._id}" style="background-color:white;border:none;color:black;border-radius:5px;text-align:center;text-decoration:none;width:50%;padding:15px 0px;margin:0% 25%;display:inline-block;">Details</a><br>
                </div>
          `;
            const mailOptions = {
                from:data.channelname,
                to:user,
                subject:'New Upcoming Event ',
                html:output
            };
             transport.sendMail(mailOptions, function (error,info){
                if (error) {
                    reject(error);
                }else{  
                    resolve(info);
                }
            });
        });
    });
    const value = Promise.all([res])
    return value;
}