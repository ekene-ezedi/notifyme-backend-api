//define packages/modules
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cors({origin:true,credentials:true}));
app.use(cookieParser());
app.use('/public',express.static('public'));

//essential parts
require('./startup/db')();
require('./startup/routes')(app);

//listen to server
const port = process.env.PORT || 3000;
const server = app.listen(port, ()=>console.log(`App running on port ${port}....`));
module.exports = server;