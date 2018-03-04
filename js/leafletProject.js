/* Map of GeoJSON data from World Bank Open Data on Internet access in Aub-saharan Africa*/

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
  if (attValue <1){
    radius = 7; //keep very small values from being too tiny
  } else{
    scaleFactor = 95;
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
  }
  return radius;
};

//creates popup to be used in fuctions pointToLayer and updatePropSymbols
function createPopup(properties, attribute, layer, radius){
  //build popup information
  var popupContent = "<p><b>Nation:</b> " + properties.name + "</p>";
  var year = attribute.split("_")[1];
  //assign popup information with NA choice
  if (properties[attribute] == "na"){
    popupContent += "<p><b>Internet Access in " + year + ":</b> " + "Not available</p>";
  } else {
    var numberDecimals = properties[attribute];
    var roundNumber = numberDecimals.toFixed(2);//round out decimal to 2 places
    popupContent += "<p><b>Internet Access in " + year + ":</b> " + roundNumber + "%</p>";
  }
  //bind popupContent to layer and offset a little
  layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius),
        });
};

//create layer with circle radius prop symbols and popup information
function pointToLayer(feature, latlng, attributes){
  //assign current attribute to first index of array
  var attribute = attributes[0];
  //create marker options
  var options = {
      fillColor: "#007a4d",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
  };
  if (attribute == 'na' ){
    return options.radius = 7;//make NA markers same size as tiny markers
  } else {
  //determine value for each feature
  var attValue = Number(feature.properties[attribute]);
  //change circle radius based on population
  options.radius = calcPropRadius(attValue);
  }
  //return created markers
  var layer = L.circleMarker(latlng, options);
  createPopup(feature.properties, attribute, layer, options.radius);
  //creating tooltip using mouse over
  layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });
  return layer;
};

//create a Leaflet GeoJSON layer and add it to the map
function createPropSymbols(data, map, attributes){
    L.geoJson(data, {
        pointToLayer: function (feature, latlng){
          return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//update the prop symbols based on year/index from slider and buttons
function updatePropSymbols(map, attribute){
  map.eachLayer(function(layer){
    if (layer.feature && layer.feature.properties[attribute]){
      //access feature properties
      var props = layer.feature.properties;
      if (props[attribute] == 'na'){
        var radius = 7;
        //make NA markers gray
        var naMarker= {
          fillColor: "#808080"
          }
          layer.setStyle(naMarker);
      } else {
        //update each feature's radius based on new attribute values
        var radius = calcPropRadius(props[attribute]);
        var backToMarker = {
          fillColor: "#007a4d"
        }
        layer.setStyle(backToMarker);
      };
      layer.setRadius(radius);

      //add new popup to each circleMarker
      createPopup(props, attribute, layer, radius);
    };
  });
};

//Sequence controls that are laid over map
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range" max="16" min="0" value="0" step="1">');
            //add skip buttons
            $(container).append('<button class="skip" id="reverse" title="Reverse"><img src="img/reverse.png"> </button>');
            $(container).append('<button class="skip" id="forward" title="Forward"><img src="img/forward.png"></button>');
            //kill any mouse event listeners on the map
            $(container).on('mousedown mouseup dblclick click', function(e){
                L.DomEvent.stopPropagation(e);
            });
            //stop map dragging on slider drag
            $(container).on('mouseover', function(){
              map.dragging.disable();
            });
            //enable map dragging when mouse is not in slider container
            $(container).on('mouseout', function(){
              map.dragging.enable();
            });
            return container;
        }//end of onAdd: function
    });//end of Control.extend

    map.addControl(new SequenceControl());
    //click listener for buttons
    $('.skip').click(function(){
      //get the old index value
      var index = $('.range-slider').val();
      if ($(this).attr('id') == 'forward'){
          index++;
          //if past the last attribute, wrap around to first attribute
          index = index > 16 ? 0 : index;
          updatePropSymbols(map, attributes[index]);
          updateLegend(map, attributes[index]);
      } else if ($(this).attr('id') == 'reverse'){
          index--;
          //if past the first attribute, wrap around to last attribute
          index = index < 0 ? 16 : index;
          updatePropSymbols(map, attributes[index]);
          updateLegend(map, attributes[index]);
      };
      //update slider
      $('.range-slider').val(index);
    });

    //input listener for slider
    $('.range-slider').on('input', function(){
        var index = $(this).val();
        updatePropSymbols(map, attributes[index]);
        updateLegend(map, attributes[index]);
    });
};//end of function createSequenceControls

//create temporal legend
function createLegend(map, attributes){
  var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container
            var container = L.DomUtil.create('div', 'legend-control-container');
            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')
            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="180px" height="100px">';
            //array of circle names to base loop on
            var circles = {
            max: 40,
            mean: 60,
            min: 80
            };
            //loop to add each circle and text to svg string
            for (var circle in circles){
            //circle string
              svg += '<circle class="legend-circle" id="' + circle + '" fill="#007a4d" fill-opacity="0.8" stroke="#000000" cx="60"/>';
            //text string
              svg += '<text id="' + circle + '-text" x="110" y="' + circles[circle] + '"></text>';
            };
            //close svg string
            svg += "</svg>";
            //add attribute legend svg to container
            $(container).append(svg);
            return container;
        }
    });
    map.addControl(new LegendControl());
    //assign current attribute to first index of array, starting legend text
    updateLegend(map, attributes[0]);
};//end of createLegend

//update text and circles in legend
function updateLegend(map, attribute){
    var year = attribute.split("_")[1];
    var legendContent = "Internet access in " + year;
    $('#temporal-legend').html(legendContent);
    var circleValues = getCircleValues(map, attribute);
    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);
        //Assign the cy and r attributes
        $('#'+key).attr({
            cy: 85 - radius,
            r: radius
        });
        if (circleValues[key]<1){
          $('#'+key+'-text').text("<1%");
        } else{
          $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + "%");
        };
    };
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;
    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);
            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };
            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });
    //set mean
    var mean = (max + min) / 2;
    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//loop through attributes data and create an array for each years data
function processData(data){
  var attributes =[]; //start with empty array
  var properties = data.features[0].properties;
  for (var attribute in properties){
    if (attribute.indexOf("Int")>-1){
      attributes.push(attribute);
    };
  };
  return attributes;
};

//function to retrieve the data and place it on the map and start initial functions
function getData(map){
    //load the data
    $.ajax("data/subsaharanInternet.geojson", {
        dataType: "json",
        success: function(response){
          //create an attributes array
          var attributes = processData(response);
          //call functions on map
          createPropSymbols(response, map, attributes);
          createSequenceControls(map, attributes);
          createLegend(map, attributes);
        }
    });
};

//function to instantiate the Leaflet map and zoom to africa
function createMap(){
    //baselayers
    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}),

        high = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
          id: 'mapbox.high-contrast',
          accessToken: 'pk.eyJ1IjoiYXplbGVzbnl3aXNjIiwiYSI6ImNpc2c1cGViczAxcDIyeXZvZWp0OGFwNWQifQ.lgxgyzCrnpDPitrPWBS9jg'}),

        hot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'});
      //create the map, limit zoom and panning
      var map = L.map('africa-map', {
          center: [-3.5, 20],
          zoom: 4,
          minZoom: 4,
          maxZoom: 9,
          maxBounds: [[35.023974, 61.357810],[-40.916196, -30.378981]],
          layers: [high]
      });

    //call getData function
    getData(map);
    //assign names to baselayers
    var baseLayers={
      "High Contrast" : high,
      "Open Street Map" : osm,
      "Humanitarian OSM" : hot,
    };
    //add control for layers
    L.control.layers(baseLayers,null,{collapsed:false}).addTo(map);
    //add additional attributions
    attribution = "Source: International Telecommunication Union, World Telecommunication/ICT Development Report and database. | icons by Dániel Aczél from the Noun Project"
    $('.leaflet-control-attribution').append(attribution);

};

//call the createMap function when HTML doc is ready
$(document).ready(createMap);
