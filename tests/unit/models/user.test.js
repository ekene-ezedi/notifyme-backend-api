//import required modules
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require ('bcrypt');
const config = require('config');
const User = require('../../../models/users');

describe('user model', ()=>{
    let user = new User({
        fullname:"Ekene Ezedi",
        email:"ezedi.eo.ekene@gmail.com",
        password:"inspired",
        occupation:"CEO, Rapor technologies inc",
    });
    //test for generating token
    it('should return a valid jwt', ()=>{
        const payload = {email:user.email,fullname:user.fullname};
        const token = User.generateToken(payload);
        const decoded = jwt.verify(token, config.get('jwtprivatekey'));
        expect(decoded).toMatchObject(payload);
    });

    //test for hashing password
    it('should return true if password is properly hashed', async()=>{
        const password = 'tegrksgdgzj';
        const hash = await User.hashPassword(password);
        const isMatch = await bcrypt.compare(password,hash);
        expect(isMatch).toBeTruthy();
    });

    //test for payload
    it('should return payload with valid values', ()=>{
        const res = User.pickPayloadProps(user);
        expect(res).toHaveProperty("_id","email","fullname");
        expect(res.email).toBe(user.email);
    });

})