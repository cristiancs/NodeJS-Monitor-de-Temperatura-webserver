
$(function() {
	// Webapp Hacks
	window.addEventListener("load", function() { window. scrollTo(0, 0); });
	document.addEventListener("touchmove", function(e) { e.preventDefault() });
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
    // Actualizar el último registro de temperatura
    socket.on('updateData', function(datos){
        console.log(datos);
        $('[data-id="'+datos.tipo+'"]').find('.amount').html(datos.values.temperature+' °C');
        $('[data-id="'+datos.tipo+'"]').find('span').html(datos.values.humidity+' % Humedad');
    });
    // Obtener gráficos historicos
    socket.emit('getHistoricalTemperature',function(resp,data){
    	console.log(resp,data);
    	var chartData = [];
    	resp.forEach(function(resp) {
	        var color = resp.sensorKind == 'temperature' ? '#A4C4E8' : resp.sensorKind == 'humidity' ? '#FCDAB0' : '#336600';
	        chartData.push({key: (resp.sensorKind +" " +resp.sensorName), area: true, color: color, values: resp.values});
    	});
    	drawChart(chartData);
    });
    
    $('.js-UpdateData').click(function(){
    	socket.emit('updateLast');
    })

	chartDatetimeFormatter   = d3.time.format("%d.%m.%y - %H:%M"); //see https://github.com/mbostock/d3/wiki/Time-Formatting
    tableDatetimeFormatter   = d3.time.format("%d.%m.%y - %H:%M:%S");

	 
    function drawChart(tempHumidData) {
      nv.addGraph(function() {
        // For other chart types see: https://nvd3.org/examples/index.html
        // API documentation: https://github.com/novus/nvd3/wiki/API-Documentation
        var chart = nv.models.lineChart()
          .margin({left: 100})
          .margin({bottom: 130})
          .useInteractiveGuideline(true)
          .transitionDuration(500)
          .showLegend(true);
        
        chart.xAxis    
          .rotateLabels(-45)
          .tickFormat(function(d) { 
            return chartDatetimeFormatter(new Date(d))
          });
        
        chart.yAxis     
          .axisLabel('Temperature °C / Humidity %')
          .tickFormat(d3.format('.01f'));
        
        d3.select('#chart svg') 
          .datum(tempHumidData) 
          .call(chart);
        
        nv.utils.windowResize(function() { chart.update() });
        return chart;
   	  });
    }
});