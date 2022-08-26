const express = require('express')
const app = express()
const cors = require('cors')
var bodyParser = require('body-parser')
const dotenv = require('dotenv')
dotenv.config()
var mongo = require('mongodb');
var mongoose = require('mongoose');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let uri = process.env.uri
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log("State of Mongoose: ",mongoose.connection.readyState);

//The model method takes three parameters
// 1. Model Name 2. Model Schema 3.Collection Name(Optional) if not provided takes the plural form of Model Name
//Schema to store user names
let User = mongoose.model('User', {
  username: { type: String },
  count: {type: Number, default: 0},
  log: [{description: {type: String, required: true}, duration: {type: Number, required: true}, date: String }]  
})

//Schema to store User's exercise logs
let Exercise = mongoose.model('Exercise', {
  username: {type:String},
  count: {type: Number, default: 0},
  _id: {type: String},
  log: [{description: {type: String}, duration: {type: Number}, date: {type: String} }]  
})

app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Route to create a User
app.post('/api/users', (req, res) => {
  let input = req.body.username;
  console.log("Username is : ", input);

  var userID;
  User.findOne({username : input}, (err, docs) => {
    if(!docs){
        const newUser = new User({ username: input})
        newUser.save((err,docs) => {
          if(!err){
            res.json({
              username: docs.username,
              _id: docs.id
            })
          } else res.json({"error":"Emtpy Field"});
          userID = docs.id;
        })
    } else {
      res.json({
        username: docs.username,
            _id: docs.id
      })
    }
  });
});

//Route to get the list of all Users
app.get('/api/users', (req, res) => {

  User.find({},{count: 0, log:0}, (err, docs) => {
    if(!docs){
      res.json({"error":"Emtpy Users List"});
    } else {
      res.json(docs);
    }
  })

});

//Route to create a Exercise Log
app.post('/api/users/:_id/exercises', (req, res) => {
    let userID = req.params._id;
    console.log("The User ID passed is: ", userID)

    User.findOne({_id: userID}, (err, docs) => {
      if(!docs){
        res.json({"error": "no user exists with given ID"})
      } else {
        let inputDate = req.body.date;
        var userNameFetchedDB = docs.username;

        //Converting the input Date to the format "Sun Jan 01 1956 00:00:00 GMT+0000 (GMT)" using toString()
        var responseDate = new Date(inputDate).toString();
        if(responseDate === 'Invalid Date'){
            console.log("Inside Invalid Date !!")
            responseDate = new Date().toString().substring(0,15);
            console.log("Inside Invalid Date !! ", responseDate)
        } else {
            responseDate = responseDate.substring(0,15);
        }

        //Storing in DB in the ISOFormat for ease of date range querying
        var dateStored = new Date(responseDate).toISOString().substring(0,10);
          
          //Exercise Logs
          var logs = {date: dateStored, duration: req.body.duration, description: req.body.description};  
          User.updateOne({_id: userID}, { $push: { log: logs } },  (err, docs) => {
            if(!err){
              console.log("Successful Update of User Record !!!", userID);
              console.log("Successful Update of User Record !!!", docs);
              res.json({_id: userID, username: userNameFetchedDB, date: responseDate, duration: parseInt(req.body.duration,10), description: req.body.description});
            } else {
              console.log("Update Error Msg", err)
              res.json({"error": "Failed to update User Record"})
            }
          });

          User.updateOne({_id: userID}, { $inc: {count: 1} }, (err, docs) => {
            if(!err){
              console.log("Successful Update of Count !!!", userID);
            } else {
              console.log("Update Error Msg", err)
              res.json({"error": "Failed to update Exercise Count"})
            }
          });
      }
    }) 
});


//Route to Get all the logs of a particular User
app.get("/api/users/:_id/logs", (req, res) => {
  let userID = req.params._id;
  console.log("The User ID passed is: ", userID)
  const{ from, to, limit } = req.query;
  console.log("The Query parameters passed are: ", from ," ",to ," ", limit)

  User.findById(userID, {__v: 0, "log._id": 0}, (err, result) => {
    
  
    let responseObject = result;

    let fromDate = new Date(0);
    let toDate = new Date();

    if(from){
        fromDate = new Date(from);
    }

    if(to){
      toDate = new Date(to);
    }

    fromDate = fromDate.getTime()
    toDate = toDate.getTime()

    console.log("The values are: ", fromDate ," ", toDate )

    responseObject.log = responseObject.log.filter((session) => {
      let actualDate = session.date;
      let sessionDate = new Date(session.date).getTime()

      if(sessionDate >= fromDate && sessionDate <= toDate){
        actualDate = new Date(actualDate).toString().substring(0,15);
        session.date = actualDate;
        console.log(actualDate, " ", typeof(actualDate))
        return actualDate;
      }
    })


    //Removing the logs from the array if a limit value is specified
    if(limit){
        responseObject.count = limit;
        responseObject.log = responseObject.log.slice(0, limit);
    }

    responseObject.count = responseObject.log.length;

    res.json(responseObject)
  })

  
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
