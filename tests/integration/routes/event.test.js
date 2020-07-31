const request = require('supertest');
const mongoose = require('mongoose');
const adminId = mongoose.Types.ObjectId();
const User = require('../../../models/users');
const Event = require('../../../models/event');
const Channel = require('../../../models/channel');
let server;
let channel;
let events;

const token = User.generateToken({email:"johndoe@gmail.com",_id:adminId,fullname:"john doe"});
describe('API/EVENT', ()=>{
    //server instance
    beforeEach(async()=>{
        server = require('../../../app');

        channel = {
            subscribers:[],
            name:"channel 1",
            description:"this is channel 1",
            location:"benin",
            category:"business",
            createdat:Date.now(),
            admin:adminId
        };

        await Channel.collection.insertOne(channel);

        events =[ 
            {
                name:"Event 1",
                description:"This is event 2",
                date:new Date(2020,4,12,4,30),
                time:"04:30 PM",
                venue:"Edo Innovates",
                address:"Vancouver CA",
                channelId:channel._id,
                guests:[]
            },
            {
                name:"Event 2",
                description:"This is event 2",
                date:new Date(2020,4,12,4,30),
                time:"04:30 PM",
                venue:"Edo Innovates",
                address:"Vancouver CA",
                channelId:channel._id,
                guests:[]
            }
        ];
    });
    afterEach(async()=>{
        await server.close();
        await Channel.remove({});
        await Event.remove({});
    });

    describe('GET /:id', ()=>{
        //get all events by channel
        it('should return 404 if no event is found', async()=>{
            const res = await request(server).get('/api/event/'+channel._id).set('x-auth-token',token);
            expect(res.status).toBe(404)
        });

        it('should return 200 if event is found',async()=>{
            await Event.collection.insertMany(events);  
            const res = await request(server).get('/api/event/'+channel._id).set('x-auth-token',token);
            expect(res.status).toBe(200);
        });
    });

    describe('GET /:id/:eid', ()=>{
        it('should return 404 if event is not found', async()=>{
            const id = mongoose.Types.ObjectId();
            const eid = mongoose.Types.ObjectId();
            const res = await request(server).get(`/api/event/${id}/${eid}`).set('x-auth-token',token);
            expect(res.status).toBe(404);
        });

        it('should return 200 if event is found', async()=>{
            const event = events[0];
            await Event.collection.insertOne(event);
            const res = await request(server).get(`/api/event/${channel._id}/${event._id}`).set('x-auth-token',token);
            expect(res.status).toBe(200);
        });
    });

    describe('POST/:id', ()=>{
        it('should return 200 if request body is invalid', async()=>{
            const event = events[0];
            const res = await request(server).post(`/api/event/${channel._id}`).set('x-auth-token',token).send(event)
            expect(res.status).toBe(200);
        });
    });

    describe('PUT/:id', ()=>{
        it('should return 200 if event updates succesfully', async()=>{
            const event = events[0];
            event.host = {name:"john doe",created_by:channel.admin};
            await Event.collection.insertOne(event);
            event.name = "New Event";
            const res = await request(server).put(`/api/event/${event._id}`).set('x-auth-token',token).send(event);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name',event.name);
        });
    });

    describe('PUT/ATTEND/:id/:eid', ()=>{
        it('should return 404 if event deosn"t exists for user to attend', async()=>{
            const event = events[0];
            await Event.collection.insertOne(event);
            const res = await request(server).put(`/api/event/attend/${adminId}/${event._id}`).set('x-auth-token',token);
            expect(res.status).toBe(404); 
        });

        it('should return 200 if attendance is successfull', async()=>{
            const event = events[0];
            await Event.collection.insertOne(event);
            const res = await request(server).put(`/api/event/attend/${channel._id}/${event._id}`).set('x-auth-token',token);
            expect(res.status).toBe(200); 
            expect(res.body).toHaveProperty('attendees',['john doe'])
        });
    });

    describe('PUT/GUEST/:id/:eid', ()=>{
        it('should return 404 if event deosn"t exists', async()=>{
            const event = events[0];
            await Event.collection.insertOne(event);
            const res = await request(server).put(`/api/event/guest/${adminId}/${event._id}`).set('x-auth-token',token);
            expect(res.status).toBe(404); 
        });

        it('should return 200 if guest is added successfully', async()=>{
            const event = events[0];
            const guest = {name:"Ekene Chris Okonji-Ezedi", role:"CEO, Rapor technologies inc"};
            await Event.collection.insertOne(event);
            const res = await request(server).put(`/api/event/guest/${channel._id}/${event._id}`).set('x-auth-token',token).send(guest);
            expect(res.status).toBe(200); 
            expect(res.body.guests[0].name).toBe(guest.name);
        });
    });

    describe('DELETE/:id', ()=>{
        it('should return 200 if event is deleted succesfully', async()=>{
            const event = events[0];
            event.host = {name:"john doe",created_by:channel.admin};
            await Event.collection.insertOne(event);
            const res = await request(server).delete(`/api/event/${event._id}`).set('x-auth-token',token).send(event);
            expect(res.status).toBe(200);
        });
    });

});