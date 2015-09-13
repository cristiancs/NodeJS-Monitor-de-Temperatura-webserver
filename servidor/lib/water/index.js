function water(){
	$('#menu li').removeClass('active');
	 $('#menu li[data-action="agua"]').addClass('active');
	 $('#content').load('water.html',function(){
		apiUpdateTemp('water');
		$('.btn-update').click(apiUpdateTemp);
		apiGetGraph(
			{
				'start': addDays(new Date(),-1),
				'end': new Date(),
				'type': 'water',
				'graphName': 'Diaria',
				'of': ['temperatura']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-7),
				'end': new Date(),
				'type': 'water',
				'graphName': 'Semanal',
				'of': ['temperatura']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-30),
				'end': new Date(),
				'type': 'water',
				'graphName': 'Mensual',
				'of': ['temperatura']
			},
			airGraph
		 );
		 apiGetGraph(
			{
				'start': addDays(new Date(),-365),
				'end': new Date(),
				'type': 'water',
				'graphName': 'Anual',
				'of': ['temperatura']
			},
			airGraph
		 );
	 });
}