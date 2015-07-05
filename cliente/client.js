// Vars
var timeout;
var server = '';
var timeBetweenUpdates = 60; // Time between auto updates in seconds
var token = '';

var ports = {'interior': 25, 'exterior': 23};
// For my raspberry the ports are
//P4 (23) -> Exterior
//P6 (25) -> Interior


// Requires
var io = require('socket.io-client')(server);
var sensorLib = require("node-dht-sensor");

/// Get the data
function getData(pos){
	var data = sensorLib.readSpec(22, pos);
	return data
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
}

console.log('Client Started');