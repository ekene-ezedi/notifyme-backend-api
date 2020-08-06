//import required modules
const jwt = require('jsonwebtoken');

 module.exports = function(req,res,next){
     //retrieve token from request header
     const token = req.header('x-auth-token');
        
     //throw error if token doesnt exists
     if (!token) return res.status(401).send('Unauthorised access');

     try {
         //decode and verify token
     const decoded = jwt.verify(token, JSON.parse(process.env.PUBLIC_ACCESS_TOKEN_SECRET), {algorithms:'RS256',complete:true});

     //assign req.user to decoded result
     req.user = decoded.payload;

     //call next middleware
     next();

     } catch (error) {
         res.status(400).send('Invalid token');
     }
 }