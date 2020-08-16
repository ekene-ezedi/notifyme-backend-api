//import required modules
const express = require('express');
const router = express.Router();
const Channel = require('../models/channel');
const User = require('../models/users');
const Event = require('../models/event');
const auth = require('../middlewares/auth');
const {uploads,dataUri} = require('../middlewares/multer');
const {cloudinary} = require('../middlewares/cloudinary-config');

//Create channel
router.post('/', auth, async (req,res)=>{
    try {
        //validate channel data
        const result = await Channel.validateChannel(req.body);

        //save channel
        const channel = new Channel(result);
        channel.createdat = Date.now();
        channel.admin = req.user._id;
        await channel.save();
        res.status(200).json({"success":true,channel});
    } catch (error) {
        res.status(500).json({"msg":error.details[0].message});
    }
});

//get all channels
router.get('/',auth,async (req,res)=>{
    try {
        const channels = await Channel.find({"subscribers":{"$ne":req.user._id}});
        res.status(200).json({channels});
    } catch (error) {
        res.status(500).json({error});
    }
});

//get channel categories
router.get('/categories', auth, async(req,res)=>{
    try {
        const categories = Channel.channelCategories();
        res.status(200).send(categories)
    } catch (error) {
        res.status(500).send(error)
    }
});

//get channels based on selected categories
router.get('/getchanbycat', auth, async(req,res)=>{
    const categories = req.query.cat;
    try {
        const channels = await Channel.find({"category":{"$in":categories}}).sort({subscribercount:-1})
        res.status(200).json({channels});
    } catch (error) {
        res.status(500).send(error);  
    }
});

//get all user channels
router.get('/my-channels', auth, async(req,res)=>{
    let userId = req.user._id;
    try {
        const channels = await Channel.find({"admin":userId});
        if (!channels) {
            res.status(404).json({"msg":"You haven't created any channel yet"});
        }
        res.status(200).json({"success":true, channels});
    } catch (error) {
        res.status(500).json(error);
    }
});

//get all channels user has subscribed to
router.get('/subscriptions', auth, async(req,res)=>{
    try {
        const channels = await Channel.find({"subscribers":{"$all":[req.user.email]}});
        if (!channels) {
            res.status(404).send("no subscription");
        }
        res.status(200).json({"success":true, channels});
    } catch (error) {
        res.status(500).json({error});
    }
});
//get specific channel
router.get('/:id', auth, async(req,res)=>{
    try {
        const channel = await Channel.findById(req.params.id).populate('admin','firstname imgurl');
        if(!channel) return res.status(404).send('channel not found');
        res.status(200).json({channel});
    } catch (error) {        
        res.status(500).send(error);
    }

} );

//update channel
router.put('/:id', auth, async(req,res)=>{
    try {
        const data = req.body;
        const channel = await Channel.findByIdAndUpdate({'_id':req.params.id, 'admin._id':req.user._id}, data, {new:true});
        res.status(200).json({"success":true,channel});
    } catch (error) {
        res.status(500).json({error});
    }
});

//delete specific channel
router.delete('/:id', auth, async(req,res)=>{
    try {
        const channel = await Channel.findByIdAndDelete({'_id':req.params.id, 'admin._id':req.user._id});
        res.status(200).json({"success":true});
    } catch (error) {
        res.status(500).json({error});
    }
});

//subscribe to channel

router.put('/subscribe/:id', auth, async(req,res)=>{ 
    try {
        const subscription = [];
        subscription.push(req.body);

        const channel = await Channel.findByIdAndUpdate({_id:req.params.id},{"$addToSet":{subscribers:req.user.email,subscriptions:subscription}},{new:true});

        await User.findByIdAndUpdate({_id:req.user._id},{"$addToSet":{subscriptions:req.params.id}},{new:true});

        const payload = {
            "notification": {
                "title":channel.name ,
                "body": "Thank you for subscribing, we'll send you updates frequently",
                "data": {
                    "dateOfArrival":Date.now(),
                    "primarykey":1,
                },
                "icon": "https://res.cloudinary.com/dz3c3h3jx/image/upload/v1597244167/assets/android-icon-36x36_cdcmpe.png",
                "vibrate": [100,50,100]
              }
        };
        const result = Event.notify_subscribers(subscription,payload);
        result.then(()=>res.status(200).json({"success":true,channel}))
              .catch(err=>console.log('from server'+err))
    } catch (error) {
        console.error(error);
        res.status(500).json({error});
    }
});

//unsubscribe to channel
router.put('/unsubscribe/:id', auth, async(req,res)=>{ 
    try {
        const channel = await Channel.findByIdAndUpdate({_id:req.params.id},{"$pull":{subscribers:req.user.email}},{new:true});
        if (channel) {
             await User.findByIdAndUpdate({_id:req.user._id},{"$pull":{subscriptions:req.params.id}},{new:true});
             res.status(200).json({"success":true,channel});
        }     
    } catch (error) {
        res.status(500).send(error.message);
    }
});

//upload channel background
router.post('/upload/:id',auth, uploads.single('image'), async(req,res)=>{
  try {
    const channel = await Channel.findById(req.params.id);
    if(req.file) {
        const file = dataUri(req).content;
        return cloudinary.uploader.upload(file,{
            public_id:channel.public_id,
            invalidate:true
        })
        .then((result)=>{
            const image = result.secure_url;
            channel.public_id = result.public_id;
            channel.imgurl = result.secure_url;
            channel.save().then((event)=>{
                res.status(200).json({success: true,image});
            });
        }).catch((err)=> res.status(500).json({msg:"Something went wrong",err}));
    } 
  } catch (error) {
    res.status(500).json({error});
  }
      
});

//search for channel
router.get('/search/:searchstr',auth,async(req,res)=>{
    let searchstr = new RegExp(req.params.searchstr,'i')
    try {
        const channels = await Channel.find({name:{$regex:searchstr}});
        res.status(200).json({channels});
    } catch (error) {
        res.status(200).json({error});
    }
});
//export router
module.exports = router;