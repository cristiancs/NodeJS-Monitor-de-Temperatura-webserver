var express = require("express");
var app = express();
var port = 3700;
var io = require('socket.io').listen(app.listen(port));
var MongoClient = require('mongodb').MongoClient;
var rootDir =  __dirname + '/views/'
app.use(express.static(__dirname + '/views/'));
app.use(express.static(__dirname + '/assets/'));

app.get("/", function(req, res){
	res.sendFile(rootDir+"home.html");
});
 
console.log("Listening on port " + port);

// Get Historical
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
	interior: new Date().getTime(),
	exterior: new Date().getTime(),
}
MongoClient.connect("mongodb://user:password@ip:27017/temps", function(err, db) {
	if(!err) {
		console.log("Getting Last 7 days");
		db.collection('interior').find({ $where: function () { return Date.now() - this._id.getTimestamp() < (24 * 60 * 60 * 1000 * 7)  }  }).each(function(err,doc){
			if(doc){
				recibidos[0].values.push({
					"x": new Date(doc['date']).getTime(),
					"y": Number(doc['temperature'])
				});
				recibidos[1].values.push({
					"x": new Date(doc['date']).getTime(),
					"y": Number(doc['humidity'])
				});
			}
		});
		db.collection('exterior').find({ $where: function () { return Date.now() - this._id.getTimestamp() < (24 * 60 * 60 * 1000 * 7)  }  }).each(function(err,doc){
			if(doc){
				recibidos[2].values.push({
					"x": new Date(doc['date']).getTime(),
					"y": Number(doc['temperature'])
				});
				recibidos[3].values.push({
					"x": new Date(doc['date']).getTime(),
					"y": Number(doc['humidity'])
				});
			}
		});
	}
	else{
		console.log(err)
		fn(0,'Cant connect to db');
	}
});

io.sockets.on('connection', function (socket) {
	console.log('a user connected');
	// Return historical on connect
	
	socket.on('getHistoricalTemperature',function(fn){
		console.log("Send Historical");
		if(typeof fn == 'function'){
			fn(recibidos,'');
		}
	})
	// Actualizar temperaturas (Petición a Raspberry)
	socket.on('updateLast', function(){
		io.emit('updateLast');
	});
	// Notificar Cambio Temperaturas
	socket.on('updateDb', function (data, fn) {
		console.log("Trying to Update Log")
		if((lastUpdates.interior < new Date().getTime()-30000 && data.tipo == "interior") || (lastUpdates.exterior < new Date().getTime()-30000 && data.tipo == "exterior") && (data.values.temperature > -30 && data.values.temperature < 55) && (data.values.humidity > 0 && data.values.humidity <=100) ){
			console.log("Updating Log");
			if(data.token == ''){ // Same from client.js
				MongoClient.connect("mongodb://user:password@ip:27017/temps", function(err, db) {
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
				});
				postData = {
					tipo: data.tipo,
					values: data.values,
				}
				// Enviar nuevos datos de temperatura al clieente
				io.emit('updateData', postData);
				if(data.tipo == "interior"){
					lastUpdates.interior = new Date().getTime();
					recibidos[0].values.push({
						"x": new Date().getTime(),
						"y": Number(data.values['temperature'])
					});
					recibidos[1].values.push({
						"x": new Date().getTime(),
						"y": Number(data.values['humidity'])
					});
				}
				if(data.tipo == "exterior"){
					lastUpdates.exterior = new Date().getTime();
					recibidos[2].values.push({
						"x": new Date().getTime(),
						"y": Number(data.values['temperature'])
					});
					recibidos[3].values.push({
						"x": new Date().getTime(),
						"y": Number(data.values['humidity'])
					});
				}
			}
		}
		else{
			if(recibidos[0].values.length > 1){
				postData = {
					0:{
						tipo: "interior",
						values: {
							temperature: recibidos[0].values[(recibidos[0].values.length-1)]['y'],
							humidity: recibidos[1].values[(recibidos[1].values.length-1)]['y'],
						}
					},
					1:{
						tipo: "exterior",
						values: {
							temperature: recibidos[2].values[(recibidos[2].values.length-1)]['y'],
							humidity: recibidos[3].values[(recibidos[3].values.length-1)]['y'],
						}
						
					}
				}
				io.emit('updateData', postData[0]);
				io.emit('updateData', postData[1]);
			}
			else{
				console.log(recibidos[0].values.length);
			}
			console.log("Last update was before 30 seconds ago");
		}
	});
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
	io.emit('updateLast');
});