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
  log: [{description: {type: String}, duration: {type: Number}, date: {type: String} }]  
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
        var d = new Date(inputDate).toUTCString();
        if(d === "Invalid Date"){
            d = new Date().toUTCString();
        } 
          var userNameFetchedDB = docs.username;
          console.log("The date Generated is: ", d );
          console.log("The date Generated is: ", d.substring(0,16));
          d = d.substring(0,16);
          d = d.replace(/,/g, '');
          console.log("The date Generated is: ", d );

          var sampleDate = d.split(" ")
          var finalDate = "";
          finalDate = [sampleDate[0], sampleDate[2], sampleDate[1], sampleDate[3]].join(' ');
          console.log("Final Date: ", finalDate);
        
          var logs = {date: finalDate, duration: req.body.duration, description: req.body.description};  
          User.updateOne({_id: userID}, { $push: { log: logs } },  (err, docs) => {
            if(!err){
              console.log("Successful Update of User Record !!!", userID);
              console.log("Successful Update of User Record !!!", docs);
              res.json({_id: userID, username: userNameFetchedDB, date: finalDate, duration: req.body.duration, description: req.body.description});
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


  User.findOne({_id: userID},{ _id: 1, __v:0, "log._id": 0 },(err, docs) => {
    if(!docs){
      res.json({"error": "no user exists with given ID"})
    } else {
      res.json(docs);
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
