// Jquery
// @codekit-prepend "../../bower_components/jquery/dist/jquery.min.js"
// Page
// @codekit-prepend "../../bower_components/page/page.js"
// Router
// @codekit-prepend "../../lib/js/router.js"
// Actions
// @codekit-prepend "../../lib/js/index.js"
// @codekit-prepend "../../lib/dashboard/index.js"
// @codekit-prepend "../../lib/air/index.js"
// @codekit-prepend "../../lib/water/index.js"

// Webapp Hacks
window.addEventListener("load", function() { window. scrollTo(0, 0); });
// document.addEventListener("touchmove", function(e) { e.preventDefault(); });
var body = document.documentElement;
if (body.requestFullscreen) {
  body.requestFullscreen();
} else if (body.webkitrequestFullscreen) {
  body.webkitrequestFullscreen();
} else if (body.mozrequestFullscreen) {
  body.mozrequestFullscreen();
} else if (body.msrequestFullscreen) {
  body.msrequestFullscreen();
}

var socket = io();


// External Functions
function addDays(dateObj, numDays) {
  return dateObj.setDate(dateObj.getDate() + numDays);
}

function notfound(){
	console.log('No existe');
}

// Process Data
function processUpdate(json,args){
	console.log(json,args);
	for (var k in json){
			$container = $('[data-type="'+args.tipo+'"][data-title="'+k+'"]');
			for (var k2 in json[k]){
				$container.find('[data-name="'+k2+'"]').html(json[k][k2]);
			}
		}
}
function airGraph(json,args){
	var chart,label,label2;
	console.log(JSON.stringify(json.data));
	var data = new google.visualization.DataTable(json.data);
	var options = {
		height: 500,
	};

	$Graph = $('[data-name="'+args.graphName+'"] [data-type="'+json.type+'"]')[0];
	chart = new google.charts.Line($Graph);
	chart.draw(data, options);    
 }

// API Data
function apiUpdateTemp(tipo){
	console.log(tipo,$(this).attr('data-type'));
	var args = {};
	if(typeof tipo === "string"){
		args.tipo = tipo;
	}
	else{
		args.tipo = $(this).attr('data-type');
	}
	socket.emit('updateLast');
	$.post('api/updateTemp', args, function(data) {
		processUpdate(data,args);
	});
}
function apiGetGraph(args,callback){
	for(var key in args.of){
		$.post('api/getGraph', {of: args.of[key], args: args}, function(data) {
			callback(data,args);
		});
	}
	
}
// Socket Data
// Actualizar el último registro de temperatura
socket.on('updateData', function(datos){
	console.log(datos);
	var args = {};
	args.type = datos.type;
	processUpdate(datos.data,args);
});
