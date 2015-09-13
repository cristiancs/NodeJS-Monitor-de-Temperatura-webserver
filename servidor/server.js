// Vars
var mongoUrl = 'mongodb://admin:pass@127.0.0.1:27017/temps'; // MongoDB Data
var port = 3700; // For the Webserver and Socket Server
var token = ''; // Same from client.js
var timeBetweenUpdates = 30; // Minimum time between updates from raspberry (In Seconds)
var timeBetweenGraph = 60 * 60;
var timeGetRecords = 24 * 60 * 60 * 1000 * 7;
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
	},
	{
		"sensorName": "Piscina",
		"sensorKind": "temperature",
		"values": [],
	},
	{
		"sensorName": "Tinaja",
		"sensorKind": "temperature",
		"values": [],
	},
];

var lastUpdates = {
	interior: new Date().getTime()-(timeBetweenUpdates+1)*1000,
	exterior: new Date().getTime()-(timeBetweenUpdates+1)*1000,
	piscina: new Date().getTime()-(timeBetweenUpdates+1)*1000,
	tinaja: new Date().getTime()-(timeBetweenUpdates+1)*1000
};
var maxmin;


//Required
var moment = require('moment');
var express = require("express");
var app = express();
var io = require('socket.io').listen(app.listen(port));
var MongoClient = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var rootDir =  __dirname + '/public/';

// Static dirs for express and handle post
app.use(express.static(__dirname + '/public/'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); // Helper Functions

var verifyDate = function(initial,toverify,interval){
	if (toverify-interval > initial){
		return true;
	}
	else{
		return false;
	}
};
var getMaxMin = function(sensorName, day){
	// Get key
	var max = -100;
	var min = 100;
	for (var id in recibidos){
		if(recibidos[id].sensorName === sensorName && recibidos[id].sensorKind === 'temperature'){
			for (var key in recibidos[id].values){
				var a = moment(recibidos[id].values[key].x);
				var b = moment();
				if(a.diff(b, 'days') == 0){
					if(max < recibidos[id].values[key].y){
						max = recibidos[id].values[key].y;
					}
					if(min > recibidos[id].values[key].y){
						min = recibidos[id].values[key].y;
					}
				}
			}
		}
	}
	return [max,min];
};
// Get Initial Data

MongoClient.connect(mongoUrl, function(err, db) {
	if(!err) {
		console.log("Getting Last 7 days");
		var lastDates = {
			interior: 0,
			exterior: 0,
			piscina: 0,
			tinaja: 0,
		};
		db.collection('interior').find({ date: { $gte: new Date(moment().subtract(7, 'days')) } }).each(function(err,doc){
			// Get all the saves and storage one register per hour
			if(doc){
				date = new Date(doc.date).getTime();
				if(verifyDate(lastDates.interior, date, timeBetweenGraph * 1000) ){
					lastDates.interior = date;

					recibidos[0].values.push({
						"x": date,
						"y": Number(doc.temperature)
					});
					recibidos[1].values.push({
						"x": date,
						"y": Number(doc.humidity)
					});
				}
			}
		});
		db.collection('exterior').find({ date: { $gte: new Date(moment().subtract(7, 'days')) } }).each(function(err,doc){
			if(doc){
				// Get all the saves and storage one register per hour
				date = new Date(doc.date).getTime();
				if(verifyDate(lastDates.exterior, date, timeBetweenGraph * 1000) ){
					lastDates.exterior = date;

					recibidos[2].values.push({
						"x": date,
						"y": Number(doc.temperature)
					});
					recibidos[3].values.push({
						"x": date,
						"y": Number(doc.humidity)
					});
				}
			}
		});
		db.collection('piscina').find({ date: { $gte: new Date(moment().subtract(7, 'days')) } }).each(function(err,doc){
			if(doc){
				// Get all the saves and storage one register per hour
				date = new Date(doc.date).getTime();
				if(verifyDate(lastDates.piscina, date, timeBetweenGraph * 1000) ){
					lastDates.piscina = date;

					recibidos[4].values.push({
						"x": date,
						"y": Number(doc.temperature)
					});
				}
			}
		});
		db.collection('tinaja').find({ date: { $gte: new Date(moment().subtract(7, 'days')) } }).each(function(err,doc){
			if(doc){
				// Get all the saves and storage one register per hour
				date = new Date(doc.date).getTime();
				if(verifyDate(lastDates.tinaja, date, timeBetweenGraph * 1000) ){
					lastDates.tinaja = date;
					recibidos[5].values.push({
						"x": date,
						"y": Number(doc.temperature)
					});
				}
			}
		});
	}
	else{
		//console.log(err);
		fn(0,'Cant connect to db');
	}
});


// Routers
// app.get("/pebble", function(req, res){
// 	res.setHeader('Content-Type', 'application/json');
// 	//console.log( recibidos[0].values[recibidos[0].values.length-1] );
// 	json = {
// 		'Interior': {
// 			'Temperatura': recibidos[0].values[recibidos[0].values.length-1].y,
// 			'Humedad': recibidos[1].values[recibidos[1].values.length-1].y
// 		},
// 		'Exterior':{
// 			'Temperatura': recibidos[2].values[recibidos[2].values.length-1].y,
// 			'Humedad': recibidos[3].values[recibidos[3].values.length-1].y,
// 		}
// 	}
// 	res.send(JSON.stringify(json));
// });

app.post("/api/updateTemp", function(req, res){
	res.setHeader('Content-Type', 'application/json');
	var data;
	if(req.body.tipo === 'aire'){
		if(recibidos[0].values && recibidos[1].values && recibidos[2].values && recibidos[3].values){
			var maxMinInterior = getMaxMin('Interior', new Date());
			var maxMinExterior = getMaxMin('Exterior', new Date());
			data = {
				interior:{
					temperature: recibidos[0].values[(recibidos[0].values.length-1)].y,
					humidity: recibidos[1].values[(recibidos[1].values.length-1)].y,
					'max-daily': maxMinInterior[0],
					'min-daily': maxMinInterior[1]
				},
				exterior:{
					temperature: recibidos[2].values[(recibidos[2].values.length-1)].y,
					humidity: recibidos[3].values[(recibidos[3].values.length-1)].y,
					'max-daily': maxMinExterior[0],
					'min-daily': maxMinExterior[1]
				}
			};
		}
		else{
			data = {
				interior:{
					temperature: 0,
					humidity: 0,
					'max-daily': 0, 
					'min-daily': 0, 				
				},
				exterior:{
					temperature: 0,
					humidity: 0,
					'max-daily': 0, 
					'min-daily': 0, 				
				}
			};
		}
		
	}
	if(req.body.tipo === 'agua'){
		if(recibidos[4].values.length > 0 && recibidos[5].values.length > 0){
			data = {
				piscina:{
					temperature: recibidos[4].values[(recibidos[4].values.length-1)].y,
				},
				tinaja:{
					temperature: recibidos[5].values[(recibidos[5].values.length-1)].y,
				}
			};
		}
		else{
			data = {
				piscina: { temperature: 0},
				tinaja: { temperature: 0}
			}
		}
		
	}
	res.send(JSON.stringify(data));
});
app.post("/api/getGraph", function(req, res){
	function reduceHour(array){
		// arrray = [
		// {

		// }]
		// for()
	}
	function reduceDay(array){

	}
	function reduceMonth(array){

	}
	function reduceYear(array){

	}


	
	var resultados = {},toSend = {};
	MongoClient.connect(mongoUrl, function(err, db) { if(!err){

		// Get Data
		if(req.body.type === 'air'){
			db.collection('interior').find({ date: { $gte: new Date(req.body.start) } }).each(function(err,doc){
				var moment = moment(doc.date);
				var hora   = moment.get('hour');
				var dia    = moment.get('day');
				var mes    = moment.get('month');
				var anio   = moment.get('year');
				
				if(req.body.of == 'temperatura'){
					resultados['interior'][anio][mes][dia][hora].append(Number(doc.temperature));
				}
				else{
					resultados['interior'][anio][mes][dia][hora].append(Number(doc.humidity));
				}
			});
			db.collection('exterior').find({ date: { $gte: new Date(req.body.start) } }).each(function(err,doc){
				var moment = moment(doc.date);
				var moment = moment(doc.date);
				var hora   = moment.get('hour');
				var dia    = moment.get('day');
				var mes    = moment.get('month');
				var anio   = moment.get('year');

				if(req.body.of == 'temperatura'){
					resultados['exterior'][anio][mes][dia][hora].append(Number(doc.temperature));
				}
				else{
					resultados['exterior'][anio][mes][dia][hora].append(Number(doc.humidity));
				}
			});
		}
		if(req.body.type == 'water'){
			db.collection('piscina').find({ date: { $gte: new Date(req.body.start) } }).each(function(err,doc){
				var moment = moment(doc.date);
				var moment = moment(doc.date);
				var hora   = moment.get('hour');
				var dia    = moment.get('day');
				var mes    = moment.get('month');
				var anio   = moment.get('year');

				if(req.body.of == 'temperatura'){
					resultados['piscina'][anio][mes][dia][hora].append(Number(doc.temperature));
				}
				else{
					resultados['piscina'][anio][mes][dia][hora].append(Number(doc.humidity));
				}
			});
			db.collection('tinaja').find({ date: { $gte: new Date(req.body.start) } }).each(function(err,doc){
				var moment = moment(doc.date);
				var moment = moment(doc.date);
				var hora   = moment.get('hour');
				var dia    = moment.get('day');
				var mes    = moment.get('month');
				var anio   = moment.get('year');

				if(req.body.of == 'temperatura'){
					resultados['tinaja'][anio][mes][dia][hora].append(Number(doc.temperature));
				}
				else{
					resultados['tinaja'][anio][mes][dia][hora].append(Number(doc.humidity));
				}
			});
		} 
	} });

	function dtos(date){
		var fecha = 'Date('+moment(date).subtract(1, 'months').format("YYYY, M, D, HH, mm, ss")+')';
		return fecha;
	}
	res.setHeader('Content-Type', 'application/json');
	var date = new Date();
	date.setDate(date.getDate() - 10);
	var type = 'humedad';
	json = {
		'type': type,
		data: 
		{
			cols: [
				{ label:"Fecha", type:"date" },
				{ label:"Promedio "+type+" Dia Interior", type:"number" },
				{ label:"Promedio "+type+" Noche Interior", type:"number" },
				{ label:"Promedio "+type+" Dia Exterior", type:"number" },
				{ label:"Promedio "+type+" Noche Exterior", type:"number" }
			],
			rows: [
				{c: [
						{v:dtos(new Date())},
						{v:50},
						{v:36},
						{v:25},
						{v:30}
					]
				},
				{c: [
						{v:dtos(date)},
						{v:48},
						{v:34},
						{v:23},
						{v:28}
					]
				}
			]
		}
	};
	// console.log(json);
	res.send(JSON.stringify(json));
});

app.get("*", function(req, res){
	res.sendFile(rootDir+"index.html");
});


// Handle Sockets

io.sockets.on('connection', function (socket) {
	var clientIp = socket.request.connection._peername.address;
	//console.log('Client IP ('+clientIp+') Connected');
	
	//  Update Temperature (To Raspberry PI)
	socket.on('updateLast', function(){
		io.emit('updateLast');
	});

	// Process Data from Raspberry PI
	socket.on('updateDb', function (data, fn) {
		//console.log("Trying to Update Log");
		date = new Date().getTime();
		// Verify last Update 
		if( verifyDate( lastUpdates[data.tipo], date, timeBetweenUpdates * 1000 ) ){
			//console.log("Updating Log");
			if(data.token === token){ 
				// Store data on DB
				MongoClient.connect(mongoUrl, function(err, db) {
				  if(!err) {
				  	if(data.values.humidity){
				  		db.collection(data.tipo).insertOne(
						   {
								date: new Date(),
								temperature: Number(data.values.temperature),
								humidity: Number(data.values.humidity),
						   }
						);
				  	}
				  	else{
				  		db.collection(data.tipo).insertOne(
						   {
								date: new Date(),
								temperature: Number(data.values.temperature),
						   }
						);
				  	}
					
					db.close();
					fn(1,'Updated');
				  }
				  else{
					//console.log(err)
					fn(0,'Cant connect to db');
				  }
				});

				// Store Data on our app
				if(data.tipo === "interior"){
					if(verifyDate(lastUpdates.interior, date, timeBetweenGraph * 1000) ){
						lastUpdates.interior = date;
						recibidos[0].values.push({
							"x": date,
							"y": Number(data.values.temperature)
						});
						recibidos[1].values.push({
							"x": date,
							"y": Number(data.values.humidity)
						});

						// Send Data to the connected Users
						maxMin = getMaxMin('Interior', new Date());
						postData = {
							"interior":{
								temperature: recibidos[0].values[(recibidos[0].values.length-1)].y,
								humidity: recibidos[1].values[(recibidos[1].values.length-1)].y,
								'max-daily': maxMin[0],
								'min-daily': maxMin[1]

							}
						};
						io.emit('updateData', postData);
					}
				}
				if(data.tipo === "exterior"){
					if(verifyDate(lastUpdates.exterior, date, timeBetweenGraph * 1000) ){
						lastUpdates.exterior = date;
						recibidos[2].values.push({
							"x": date,
							"y": Number(data.values.temperature)
						});
						recibidos[3].values.push({
							"x": date,
							"y": Number(data.values.humidity)
						});
						// Send Data to the connected Users
						maxMin = getMaxMin('Exterior', new Date());
						postData = {
							"exterior":{
								temperature: recibidos[2].values[(recibidos[2].values.length-1)].y,
								humidity: recibidos[3].values[(recibidos[3].values.length-1)].y,
								'max-daily': maxMin[0],
								'min-daily': maxMin[1]
							}
						};
						io.emit('updateData', postData);
					}
				}
				if(data.tipo === "piscina"){
					if(verifyDate(lastUpdates.piscina, date, timeBetweenGraph * 1000) ){
						recibidos[4].values.push({
							"x": date,
							"y": Number(data.values.temperature)
						});
						lastUpdates.piscina = date;
						// Send Data to the connected Users
						postData = {
							"piscina":{
								temperature: recibidos[4].values[(recibidos[4].values.length-1)].y,
							}
						};
						io.emit('updateData', postData);
					}
				}
				if(data.tipo === "tinaja"){
					if(verifyDate(lastUpdates.tinaja, date, timeBetweenGraph * 1000) ){
						recibidos[5].values.push({
							"x": date,
							"y": Number(data.values.temperature)
						});
						lastUpdates.tinaja = date;
						// Send Data to the connected Users
						postData = {
							"tinaja":{
								temperature: recibidos[5].values[(recibidos[5].values.length-1)].y,
							}
						};
						io.emit('updateData', postData);
					}
				}

			}
			else{
				console.log('The token is not valid');
			}
		}
		else{
			//console.log('Getting Temperature Info from Cache');
			if(recibidos[0].values.length > 0){
				if(data.tipo === 'interior'){
					maxMin = getMaxMin('Interior', new Date());
					postData = {
						"interior":{
							temperature: recibidos[0].values[(recibidos[0].values.length-1)].y,
							humidity: recibidos[1].values[(recibidos[1].values.length-1)].y,
							'max-daily': maxMin[0],
							'min-daily': maxMin[1]
						}
					};
					io.emit('updateData', postData);
				}
			}
			if(recibidos[2].values.length > 0){
				if(data.tipo === 'exterior'){
					maxMin = getMaxMin('Exterior', new Date());
					postData = {
						"exterior":{
							temperature: recibidos[2].values[(recibidos[2].values.length-1)].y,
							humidity: recibidos[3].values[(recibidos[3].values.length-1)].y,
							'max-daily': maxMin[0],
							'min-daily': maxMin[1]

						}
					};
					io.emit('updateData', postData);
				}
				
			}
			if(recibidos[4].values.length > 0){
				if(data.tipo === 'Piscina'){
					postData = {
						"piscina":{
							temperature: recibidos[4].values[(recibidos[4].values.length-1)].y,

						}
					};
					io.emit('updateData', postData);
				}
				
			}
			if(recibidos[5].values.length > 0){
				if(data.tipo === 'Tinaja'){
					postData = {
						"tinaja":{
							temperature: recibidos[5].values[(recibidos[5].values.length-1)].y,

						}
					};
					io.emit('updateData', postData);
				}
				
			}
		} 
	});
	
});

console.log("Listening on port " + port);
