// Vars
var timeout;
var server = 'http://127.0.0.1:3700/';
var timeBetweenUpdates = 60; // Time between auto updates in seconds
var token = '';
var ports = {'interior': 25, 'exterior': 23};
var ubicaciones = {
	'28-0314642bd5ff': 'Piscina',
	'28-0314640479ff': 'Tinaja'
};

// For my raspberry the ports are
//P4 (23) -> Exterior
//P6 (25) -> Interior


// Requires
var io = require('socket.io-client')(server);
var sensorLib = require("node-dht-sensor");
var ds18b20 = require('ds18b20');


/// Get the data
function getData(pos){
	var data = sensorLib.readSpec(22, pos);
	return data
}

// Water Temperature
function getSensors(fallback){
	ds18b20.sensors(function(err, ids) {
		fallback(ids);
	});
}

function getData(id,fallback,key,test){
	ds18b20.temperature(id, function(err, value) {
		fallback(value,key,test);
	});
}
function sendData(temperature,ubicacion,test){
	if(temperature){
		tosend = {};
		tosend.token = token;
		tosend[ubicacion] = temperature.toFixed(2);
		if(!test){
			console.log('Sending Data');
			conn.emit('updateDb', tosend, function(resp, data) {
				console.log('Respuesta' + resp,data);
			});
		}
		else{
			console.log('Test Mode',tosend);
		}
	}
}
function updateData(test){
	test || ( test = false );
	getSensors(function(sensors){
		if(sensors){
			sensors = sensors;
			for (var key in sensors){
				console.log(key);
				ubicacion = ubicaciones[sensors[key]];
				getData(sensors[key],sendData,ubicacion,test);
			}
		}
	});
}

// Handle socket request
io.on('connect',function(){
	console.log('Connected');
	io.on('updateLast',update);
})


function update(){
	console.log("Update Request Received");
	clearInterval(timeout);
	for (var key in ports){
		request = getData(ports[key]);
		if(request.errors == 0){
			console.log('Lecture is valid');
			var data = {
				'token': token,
				'tipo': key,
				'values': {
					'temperature': parseFloat(request.temperature).toFixed(1),
					'humidity': parseFloat(request.humidity).toFixed(1),
				}	
			}
			console.log(data);
			io.emit('updateDb', data, function(resp, data) {
			    console.log('Response ' + resp,data);
			});
		}
		else{
			console.log('The '+key+' data is invalid, not sended');
		}
		
	}
	timeout = setTimeout(function(){update();},timeBetweenUpdates * 1000);
	updateData();
}

updateData();
setInterval(updateData(),timeBetweenUpdates * 1000);



console.log('Client Started');