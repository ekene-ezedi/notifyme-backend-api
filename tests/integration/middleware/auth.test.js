const request = require('supertest');

let server;

describe('AUTH MIDDLEWARE', ()=>{

    beforeEach(()=>{server = require('../../../app')});
    afterEach(async()=>{await server.close()});

    it('should return 401 if no token is provided', async()=>{
        const res = await request(server).get('/api/channel');
        expect(res.status).toBe(401);
    });
});