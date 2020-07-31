//import required modules
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../../models/users');
const Channel = require('../../../models/channel');

let server;
const adminId = mongoose.Types.ObjectId();
const token = User.generateToken({email:"ezedi.eo.ekene@gmail.com",_id:adminId});
let channels = [{
    subscribers:[],
    name:"channel 1",
    description:"this is channel 1",
    location:"benin",
    category:"business",
    createdat:Date.now(),
    admin:adminId
},
{
    subscribers:[],
    name:"channel 2",
    description:"this is channel 2",
    location:"benin",
    category:"tech",
    createdat:Date.now(),
    admin:adminId
}
];

//tests for channels routes
describe('/api/channel', ()=>{
    //server instance
    beforeEach(()=>{
        server = require('../../../app');
    });
    afterEach(async()=>{
        await server.close();
        await Channel.remove({});
        await User.remove({});
    });

    //get all channels test
    describe('GET /', ()=>{

        it('should return 200 if channel is found', async()=>{
        //save to collection
        await Channel.collection.insertMany(channels);
        const res = await request(server).get('/api/channel').set('x-auth-token',token);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body.some(c => c.name === 'channel 1')).toBeTruthy();
        expect(res.body.some(c => c.name === 'channel 2')).toBeTruthy();
        });
    });

    //get specific channel by id test
    describe('GET /:id', ()=>{
        it('should return 404 if channel not found', async()=>{
            const res = await request(server).get('/api/channel/' + adminId).set('x-auth-token',token);
            expect(res.status).toBe(404);
        });

        it('should return 200 if channel with given is found', async()=>{
            const channel = new Channel(channels[0]);
            await channel.save();
            const res = await request(server).get('/api/channel/' + channel._id).set('x-auth-token',token);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name','channel 1');
        });
    });

    //get channel id by category test
    describe('GET /getchanbycat', ()=>{
        it('should return 200 if channels with given category is found', async()=>{
            await Channel.collection.insertMany(channels);
            const res =  await request(server).get('/api/channel/getchanbycat').set('x-auth-token',token);
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it('should return 404 if no channel is found', async()=>{
            channels[0].category = "Not Business",
            channels[1].category = "Not Tech",
            await Channel.collection.insertMany(channels);
            const res =  await request(server).get('/api/channel/getchanbycat').set('x-auth-token',token);
            expect(res.status).toBe(404);
        });
    });
   // create new channel test
    describe('POST', ()=>{
        it('should return 200 if channel is successfully saved', async()=>{
            const channel = {
                name:"channel 1",
                description:"this is channel 1",
                location:"benin",
                category:"business",
            };
            const res = await request(server).post('/api/channel').set('x-auth-token',token).send(channel);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('location','benin');
        });

        it('should return 500, if a server error occurs', async()=>{
            const channel = {
                namfe:"channel 1",
                description:"this is channel 1",
                location:"benin",
                category:"business",
            };
            const res = await request(server).post('/api/channel').set('x-auth-token',token).send(channel);
            expect(res.status).toBe(500);
        });
    });

    //update channel test
    describe('PUT', ()=>{
        let id;
        //create channel before each test
        beforeEach(async()=>{
            const channel = new Channel(channels[0]);
            await channel.save();

            id = channel._id;
        });
        it('should return 200 if channel is updated successfully', async()=>{
            const res = await request(server).put('/api/channel/'+id).set('x-auth-token',token).send({name:"channel one"});
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name','channel one');
        });
    });

    //delete channel test
    describe('DELETE', ()=>{
        let id;
        //create channel before each test
        beforeEach(async()=>{
            const channel = new Channel(channels[0]);
            await channel.save();

            id = channel._id;
        });

        it('should return 200 if channel is deleted successfully', async()=>{
            const res = await request(server).delete('/api/channel/'+id).set('x-auth-token',token);
            expect(res.status).toBe(200);
        })
    });

    //subscription test
    describe('SUBSCRIPTION', ()=>{
        let id;
        //create channel before each test
        beforeEach(async()=>{
            const channel = new Channel(channels[0]);
            await channel.save();
            id = channel._id;

            const user = new User({
                _id:adminId,
                fullname:"Ekene Ezedi",
                email:"ezedi.eo.ekene@gmail.com",
                password:"inspired",
                occupation:"CEO, Rapor technologies inc",
            });
            await user.save();
        });

        it('should return 200 if subscription is successful', async()=>{
            const res = await request(server).put('/api/channel/subscribe/'+id).set('x-auth-token',token);
            expect(res.status).toBe(200);
        });

        it('should return 200 if unsubscription is successful', async()=>{
            const res = await request(server).put('/api/channel/unsubscribe/'+id).set('x-auth-token',token);
            expect(res.status).toBe(200);
        });
    });
});