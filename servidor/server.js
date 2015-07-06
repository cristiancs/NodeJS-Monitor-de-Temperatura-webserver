// Vars
var mongoUrl = 'mongodb://user:pass@127.0.0.1:27017/temps' // MongoDB Data
var port = 3700; // For the Webserver and Socket Server
var token = ''; // Same from client.js
var timeBetweenUpdates = 30; // Minimum time between updates from raspberry (In Seconds)
var recibidos = [
	{
		"sensorName": "Interior",
		"sensorKind": "temperature",
		"values": [],
	},
	{
		"sensorName": "Interior",
		"sensorKind": "humidity",
		"values": [],
	},
	{
		"sensorName": "Exterior",
		"sensorKind": "temperature",
		"values": [],
	},
	{
		"sensorName": "Exterior",
		"sensorKind": "humidity",
		"values": [],
	}
];

var lastUpdates = {
	interior: new Date().getTime()-(timeBetweenUpdates+1)*1000,
	exterior: new Date().getTime()-(timeBetweenUpdates+1)*1000,
}

//Required
var express = require("express");
var app = express();
var io = require('socket.io').listen(app.listen(port));
var MongoClient = require('mongodb').MongoClient;
var rootDir =  __dirname + '/views/'

// Static dirs for express
app.use(express.static(__dirname + '/views/'));
app.use(express.static(__dirname + '/assets/'));

// Helper Functions

var verifyDate = function(initial,toverify,interval){
	if (toverify-interval > initial){
		return true;
	}
	else{
		return false;
	}
}

// Get Initial Data

MongoClient.connect(mongoUrl, function(err, db) {
	if(!err) {
		console.log("Getting Last 7 days");
		var lastDates = {
			interior: 0,
			exterior: 0,
		}
		db.collection('interior').find({ $where: function () { return Date.now() - this._id.getTimestamp() < (24 * 60 * 60 * 1000 * 7)  }  }).each(function(err,doc){
			// Get all the saves and storage one register per hour
			if(doc){
				date = new Date(doc['date']).getTime();
				if(verifyDate(lastDates.interior, date, 60 * 60 * 1000) ){
					lastDates.interior = date;

					recibidos[0].values.push({
						"x": date,
						"y": Number(doc['temperature'])
					});
					recibidos[1].values.push({
						"x": date,
						"y": Number(doc['humidity'])
					});
				}
			}
		});
		db.collection('exterior').find({ $where: function () { return Date.now() - this._id.getTimestamp() < (24 * 60 * 60 * 1000 * 7)  }  }).each(function(err,doc){
			if(doc){
				// Get all the saves and storage one register per hour
				date = new Date(doc['date']).getTime();
				if(verifyDate(lastDates.exterior, date, 60 * 60 * 1000) ){
					lastDates.exterior = date;

					recibidos[2].values.push({
						"x": date,
						"y": Number(doc['temperature'])
					});
					recibidos[3].values.push({
						"x": date,
						"y": Number(doc['humidity'])
					});
				}
			}
		});
	}
	else{
		console.log(err);
		fn(0,'Cant connect to db');
	}
	db.close();
});


// Routers
app.get("/pebble", function(req, res){
	res.setHeader('Content-Type', 'application/json');
	console.log( recibidos[0].values[recibidos[0].values.length-1] );
	json = {
		'Interior': {
			'Temperatura': recibidos[0].values[recibidos[0].values.length-1].y,
			'Humedad': recibidos[1].values[recibidos[1].values.length-1].y
		},
		'Exterior':{
			'Temperatura': recibidos[2].values[recibidos[2].values.length-1].y,
			'Humedad': recibidos[3].values[recibidos[3].values.length-1].y,
		}
	}
	res.send(JSON.stringify(json));
});

app.get("/", function(req, res){
	res.sendFile(rootDir+"home.html");
});


// Handle Sockets

io.sockets.on('connection', function (socket) {
	var clientIp = socket.request.connection._peername.address;
	console.log('Client IP ('+clientIp+') Connected');
	// Return historical on connect
	
	socket.on('getHistoricalTemperature',function(fn){
		console.log("Send Historical");
		if(typeof fn == 'function'){
			fn(recibidos,'');
		}
	})
	//  Update Temperature (To Raspberry PI)
	socket.on('updateLast', function(){
		io.emit('updateLast');
	});

	// Process Data from Raspberry PI
	socket.on('updateDb', function (data, fn) {
		console.log("Trying to Update Log");
		date = new Date().getTime();
		// Verify last Update 
		if( verifyDate( lastUpdates[data.tipo], date, timeBetweenUpdates * 1000 ) ){
			console.log("Updating Log");
			if(data.token == token){ 
				// Store data on DB
				MongoClient.connect(mongoUrl, function(err, db) {
				  if(!err) {
					db.collection(data.tipo).insertOne(
					   {
							date: new Date(),
							temperature: data.values.temperature,
							humidity: data.values.humidity,
					   }
					)
					fn(1,'Updated');
				  }
				  else{
					console.log(err)
					fn(0,'Cant connect to db');
				  }
				  db.close();
				});

				// Send Data to the connected Users
				var postData = {
					tipo: data.tipo,
					values: data.values,
				}
				io.emit('updateData', postData);

				// Store Data on our app
				if(data.tipo == "interior"){
					lastUpdates.interior = date;
					recibidos[0].values.push({
						"x": date,
						"y": Number(data.values.temperature)
					});
					recibidos[1].values.push({
						"x": date,
						"y": Number(data.values.humidity)
					});
				}
				if(data.tipo == "exterior"){
					lastUpdates.exterior = date;
					recibidos[2].values.push({
						"x": date,
						"y": Number(data.values.temperature)
					});
					recibidos[3].values.push({
						"x": date,
						"y": Number(data.values.humidity)
					});
				}

			}
			else{
				console.log('The token is not valid');
			}
		}
		else{
			console.log('Getting Temperature Info from Cache');
			if(recibidos[0].values.length > 1){
				if(data.tipo == 'interior'){
					postData = {
						tipo: "interior",
						values: {
							temperature: recibidos[0].values[(recibidos[0].values.length-1)]['y'],
							humidity: recibidos[1].values[(recibidos[1].values.length-1)]['y'],
						}
					}
				}
				else if(data.tipo == 'exterior'){
					postData = {tipo: "exterior",
						values: {
							temperature: recibidos[2].values[(recibidos[2].values.length-1)]['y'],
							humidity: recibidos[3].values[(recibidos[3].values.length-1)]['y'],
						}
					}
				}
				io.emit('updateData', postData);
			}
			else{
				console.log('Looks like we dont have registers of temperature',recibidos[0].values);
			}
		} 
	});
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

	// Try to update data when user enter
	io.emit('updateLast');
});

console.log("Listening on port " + port);
