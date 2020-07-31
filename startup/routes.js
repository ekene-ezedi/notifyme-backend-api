//define packages/modules
const express = require('express');
const users = require('../routes/users');
const channel = require('../routes/channel');
const event = require('../routes/event');

//route middlewares
module.exports = function (app) {
    app.use(express.json());
    app.use('/api/users', users);
    app.use('/api/channel', channel);
    app.use('/api/event', event)
}