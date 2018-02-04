function debugAjax(){
  
	$.ajax("data/megacities.geojson", {
		dataType: "json",
		success: debugCallback
	});
};

function debugCallback(response){
  $('#mydiv').append('GeoJSON data: ' + JSON.stringify(response));
};



$(document).ready(debugAjax);
