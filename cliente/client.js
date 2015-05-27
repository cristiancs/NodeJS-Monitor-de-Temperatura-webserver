var io = require('socket.io-client');
var serverUrl = 'http://ip:3700/';
var conn = io.connect(serverUrl);
var sensorLib = require("node-dht-sensor");
console.log("Starting Client")
var timeout;
function getData(pos){
	console.log("Getting Sensor Data",pos);
	
	var data = sensorLib.readSpec(22, pos);
	return data

}
function update(){
	console.log("Update Requested");
	clearInterval(timeout);
	var data = {
		'interior': {
			'token': '', // Create your token
			'tipo': 'interior',
			'values': {
				'temperature': parseFloat(getData(24).temperature).toFixed(1),
				'humidity': parseFloat(getData(24).humidity).toFixed(1),
			}	
		},
		'exterior': {
			'token': '', // Create your token
			'tipo': 'exterior',
			'values': {
				'temperature': parseFloat(getData(4).temperature).toFixed(1),
				'humidity': parseFloat(getData(4).humidity).toFixed(1),
			}	
		}
	}
	conn.emit('updateDb', data.interior, function(resp, data) {
	    console.log('Respuesta' + resp,data);
	});
	conn.emit('updateDb', data.exterior, function(resp, data) {
	    console.log('Respuesta' + resp,data);
	});
	timeout = setTimeout(function(){update();},60000);
}
update();

conn.on('updateLast',function(){
	update();
})