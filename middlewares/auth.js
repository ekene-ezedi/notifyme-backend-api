//import required modules
const jwt = require('jsonwebtoken');
/**
 * check if req.header has token
 * if token exists verify and call next middleware
 * 
 */

 module.exports = function(req,res,next){
     //retrieve token from request header
     const token = req.cookies.headerPayload+req.cookies.signature
        
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