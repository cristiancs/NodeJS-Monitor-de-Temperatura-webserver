function air(){
	 $('#menu li').removeClass('active');
	 $('#menu li[data-action="aire"]').addClass('active');
	 $('#content').load('air.html',function(){
		apiUpdateTemp('aire');
		$('.btn-update').click(apiUpdateTemp);

		apiGetGraph(
			{
				'start': addDays(new Date(),-1),
				'end': new Date(),
				'type': 'aire',
				'graphName': 'Diaria',
				'of': ['temperatura','humedad']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-7),
				'end': new Date(),
				'type': 'aire',
				'graphName': 'Semanal',
				'of': ['temperatura','humedad']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-30),
				'end': new Date(),
				'type': 'aire',
				'graphName': 'Mensual',
				'of': ['temperatura','humedad']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-365),
				'end': new Date(),
				'type': 'aire',
				'graphName': 'Anual',
				'of': ['temperatura','humedad']
			},
			airGraph
		 );
	 });
}