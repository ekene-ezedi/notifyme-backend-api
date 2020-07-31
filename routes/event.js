//import required modules
const express = require('express');
const router = express.Router();
const Event = require('../models/event');
const User = require('../models/users');
const Channel = require('../models/channel');
const auth = require('../middlewares/auth');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

//multer storage
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/channelbg')
      },
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function(err, raw) {
            if (err) return cb(err);
          
            cb(null, raw.toString('hex') + path.extname(file.originalname));
            
          });
    }
});

let upload = multer({storage:storage});

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
    const channel = await Channel.findById({_id:req.body.channelId});
        const data = {
            "subscribers":channel.subscribers,
            "channelname":channel.name
        }
        const result =  Event.sendEmailNotification(data,req.body)
        result.then((info)=>{
            res.status(200).json({"success":true}); 
        })
        result.catch((error)=>{
            res.status(500).json({"success":false}); 
        })
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
router.put('/upload/:id',auth,upload.single('eventbg'), async(req,res)=>{
    try {
        const host = req.headers.host;
        const filePath = req.protocol + "://" + host + '/' + req.file.path;
        let filename = req.file.destination + '/' + req.file.filename;
        
        const event = await Event.findByIdAndUpdate({_id:req.params.id},{imgurl:filePath},{new:true});
        res.status(200).json({event});

    } catch (error) {
    res.status(200).json({error});
    }
});

module.exports = router;