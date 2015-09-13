function dashboard(){
	 $('#content').load('dashboard.html',function(){
	 	apiUpdateTemp('aire');
	 	apiUpdateTemp('agua');
	 	 $('.btn-update').click(apiUpdateTemp);
	 });
}