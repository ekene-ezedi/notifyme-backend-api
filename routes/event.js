//import required modules
const express = require('express');
const router = express.Router();
const Event = require('../models/event');
const User = require('../models/users');
const Channel = require('../models/channel');
const auth = require('../middlewares/auth');
const {uploads,dataUri} = require('../middlewares/multer');
const {cloudinary} = require('../middlewares/cloudinary-config');

//get events by subscriptions
router.get('/', auth, async(req,res)=>{
    try {
        const user = await User.findById({_id:req.user._id},'subscriptions -_id');
        let subscriptions = user.subscriptions;
        const events = await Event.find({"channelId":{"$in":subscriptions}}).populate('channelId','name imgurl _id').sort('-createdat');
        res.status(200).json({"success":true,events});               
    } catch (error) {
        res.status(500).json({error});
    }
});

//get events user is attendding
router.get('/attending', auth, async(req,res)=>{
    try {
        const events = await Event.find({"likes":{"$all":[req.user._id]}});
        res.status(200).json({"success":true, events});
    } catch (error) {
        res.status(500).json({error});
    }
});


router.post('/notify_subscribers', auth, async(req,res)=>{
    try {
        const channel = await Channel.findById({_id:req.body.channelId});
    
        const sub = channel.subscriptions;

        const payload = {
            "notification": {
                "title":req.body.name ,
                "body": channel.name,
                "data": {
                    "dateOfArrival":Date.now(),
                    "primarykey":1,
                    "url":`${process.env.CLIENT_BASE_URL}/event/${req.body._id}`
                },
                "icon": "https://res.cloudinary.com/dz3c3h3jx/image/upload/v1597244167/assets/android-icon-36x36_cdcmpe.png",
                "vibrate": [100,50,100]
              }
        };
        const result = await Event.notify_subscribers(sub,payload);

        res.status(200).json({result});

        console.log(payload)

    } catch (error) {
        console.log(error)
        res.status(500).json({error}); 
    }

});



//get all events by channel
router.get('/:id/:status', auth, async(req, res) => {
    
    try {
        let today = Date.now();

        if (req.params.status == 'previous') {
            const events = await Event.find({channelId:req.params.id,date:{"$lt":today}});
            res.status(200).json({"success":true,events}); 
        }else{
            const events = await Event.find({channelId:req.params.id,date:{"$gt":today}}).sort({date:-1})
            res.status(200).json({"success":true,events});
        }
    } catch (error) {
        res.status(500).json({error});
    }
});

//get single event
router.get('/:id', auth, async(req,res)=>{
    try {
        const event = await Event.findById({"_id":req.params.id}).populate('admin','firstname imgurl');
        if (!event) return res.status(404).send('No event found');
        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error});
    }
});

//create event
router.post('/:id', auth, async(req,res)=>{
    //validate request body
    req.body.channelId = req.params.id;
    req.body.admin = req.user._id;
    const result = Event.validateEvent(req.body);
    if (result.error) return res.status(400).json(result.error.details[0].message);

    try {
        //save event
        const event = new Event(req.body);
        await event.save();

        res.status(200).json({"success":true,event});

    } catch (error) {
        res.status(500).json({"error":error.message});
    }

});

//update event
router.put('/:id', auth, async(req,res)=>{
    try {
        const event = await Event.findOneAndUpdate({"admin":req.user._id,"_id":req.params.id},req.body,{new:true});    
        res.status(200).json({"success":true, event});
    } catch (error) {        
        res.status(500).json({error}); 
    }
});

//update guests
router.put('/guests/:id', auth, async(req,res)=>{
    try {
        const event = await Event.findById(req.params.id).populate('admin','firstname imgurl');;
        if (!event) return res.status(404).json({"msg":"No event"});

        event.set("guests",req.body);
        await event.save();

        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error});
    }
});

//attend event
router.put('/attend/:id', auth, async (req, res) => {
    try {
        // const event = await Event.findOne({"_id":req.params.id});
        const event = await Event.update({_id:req.params.id},{"$addToSet":{attendees:req.user._id}});
        
        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error});
    }
});


//add event guests
router.put('/guest/:id', auth, async (req, res) => {
    try {
        const event = await Event.findById({"_id":req.params.id}).populate('admin','firstname imgurl');
        if(!event) return res.status(404).send('no event found');
        event.guests = req.body;
        await event.save();
        res.status(200).json({"success":true,event});
    } catch (error) {
        console.log(error);
        res.status(500).json({error:error.message});        
    }
});

//delete guest
router.delete('/guest/:id/:gid', auth, async(req,res)=>{
    try {
        const event = await Event.findOneAndUpdate({"_id":req.params.id},{$pull:{"guests":{_id:req.params.gid}}},{new:true}).populate('admin','firstname imgurl');
        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error})
    }
});
//delete event
router.delete('/:id', auth, async (req,res)=>{
    try {
        const event = await Event.findOneAndDelete({"admin":req.user._id,"_id":req.params.id});
        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error});
    }
});

//like
router.put('/like/:id', auth, async(req,res)=>{
    try {
        const event = await Event.findByIdAndUpdate({_id:req.params.id},{"$addToSet":{likes:req.user._id}},{new:true})

        res.status(200).json({"success":true,event});
    } catch (error) {
        res.status(500).json({error});
    }
});

//upload event background
router.post('/upload/:id',auth,uploads.single('image'), async(req,res)=>{
    try {
        const event = await Event.findById(req.params.id);
        if(req.file) {
            const file = dataUri(req).content;
            return cloudinary.uploader.upload(file,{
                public_id:event.public_id,
                invalidate:true
            })
            .then((result)=>{
                const image = result.secure_url;
                event.public_id = result.public_id;
                event.imgurl = result.secure_url;
                event.save().then((event)=>{
                    res.status(200).json({success: true,image});
                })
            }).catch((err)=> {
                console.log(err)
                res.status(500).json({msg:"Something went wrong",err});
            });
        } 
      } catch (error) {
          console.log(error)
        res.status(500).json({error});
      }
});

module.exports = router;