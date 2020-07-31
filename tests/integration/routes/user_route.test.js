const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const request = require('supertest');
const User = require('../../../models/users');
const adminId = mongoose.Types.ObjectId();
const vtoken = User.generateToken({email:"johndoe@gmail.com",_id:adminId,fullname:"john doe"});
let server;
let data = {
    fullname:"John Doe",
    email:"johndoe@gmail.com",
    password:"123456789",
    occupation:"DevOps @ johndoeinc"
};

describe('USERS ROUTE', ()=>{

    beforeEach(()=>{server = require('../../../app');});
    afterEach(async()=>{
        await server.close();
        await User.remove({})
    });

    describe('POST/users/', ()=>{
        it('should return 400 if user with given email already exists', async()=>{
            const user = new User(data);
            await user.save();
            const res = await request(server).post('/api/users').send({email:data.email});
            expect(res.status).toBe(400);
        });

        it('should return 200 if user registration succeeds', async()=>{
            const res = await request(server).post('/api/users').send(data);
            expect(res.status).toBe(200);
        });
    });

    describe('PUT/user/verifyuser/:vtoken',()=>{
        it('should return 200 if user is verified successfully', async()=>{
            const user = new User(data);
            await user.save();
            const res = await request(server).put(`/api/users/${vtoken}`);
            expect(res.status).toBe(200)
        });
    });

    describe('POST/login',()=>{
        it('should return 404 if user does not exist',async()=>{
            const res = await request(server).post('/api/users/login').send({email:'johndoe@gmail.com',password:'123456789'});
            expect(res.status).toBe(404);
        });

        it('should return 400 if user is not verified', async()=>{
            const user = new User(data);
            await user.save();
            const res = await request(server).post('/api/users/login').send(user);
            expect(res.status).toBe(400);
        });

        it('should return 200 if login is successful', async()=>{
            data.isverified = true;
            const hash = await User.hashPassword(data.password);
            data.password = hash;
            const user = new User(data);
            await user.save();
            const res = await request(server).post('/api/users/login').send({email:data.email,password:"123456789"});
            expect(res.status).toBe(200);
        });
    });

    describe('POST/password_reset', ()=>{
        it('should return 200 if password reset token is valid', async()=>{
            const user = new User(data);
            await user.save();
            const res = await request(server).post('/api/users/password_reset').send({email:data.email});
            expect(res.status).toBe(200);
        });
    });

    describe('POST/password_reset/:token', ()=>{
        it('should return 200 if password reset is succesfull', async()=>{
            const res = await request(server).put(`/api/users/password_reset/${vtoken}`).send({email:data.email,new_password:'098574647383'});
            expect(res.status).toBe(200);
        });
    });
});