//Mapbox information
// var mapboxAccessToken = 'pk.eyJ1IjoiYXplbGVzbnl3aXNjIiwiYSI6ImNpc2c1cGViczAxcDIyeXZvZWp0OGFwNWQifQ.lgxgyzCrnpDPitrPWBS9jg'
// L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
//     attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
//     maxZoom: 18,
//     id: 'mapbox.light',
//     accessToken: mapboxAccessToken
// }).addTo(mymap);

/* Map of GeoJSON data from MegaCities.geojson */

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
  //scale factor to adjust symbol size evenly
  var scaleFactor = 50;
  //area based on attribute value and scale factor
  var area = attValue * scaleFactor;
  //radius calculated based on area
  var radius = Math.sqrt(area/Math.PI);
  return radius;
};

//create layer with circle radius prop symbols and popup information
function pointToLayer(feature, latlng, attributes){
  //assign current attribute to first index of array
  var attribute = attributes[0];
  //create marker options
  var geojsonMarkerOptions = {
      fillColor: "#ff7800",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
  };
  //determine value for each feature
  var attValue = Number(feature.properties[attribute]);
  //change circle radius based on population
  geojsonMarkerOptions.radius = calcPropRadius(attValue);
  //return created markers
  var layer = L.circleMarker(latlng, geojsonMarkerOptions);
  //build popup information
  var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";
  var year = attribute.split("_")[1];
  popupContent += "<p><b>Population in " + year + ":</b> " + feature.properties[attribute] + " million</p>";
  //bind popupContent to layer and offset a little
  layer.bindPopup(popupContent, {
        offset: new L.Point(0,-geojsonMarkerOptions.radius),
        closeButton: false
    });
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

      //update each feature's radius based on new attribute values
      var radius = calcPropRadius(props[attribute]);
      layer.setRadius(radius);

      //add city to popup content string
      var popupContent = "<p><b>City:</b> " + props.City + "</p>";

      //add formatted attribute to panel content string
      var year = attribute.split("_")[1];
      popupContent += "<p><b>Population in " + year + ":</b> " + props[attribute] + " million</p>";

      //replace the layer popup
      layer.bindPopup(popupContent, {
          offset: new L.Point(0,-radius)
      });
    };
  });
};

//Create sequence controls
function createSequenceControls(map, attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });
    //add skip buttons forward and reverse
    $('#panel').append('<button class="skip" id="reverse">Reverse</button>');
    $('#panel').append('<button class="skip" id="forward">Skip</button>');
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');
    var startYear = (attributes[0].toString()).split("_")[1];
    $('h1').text(startYear);
    //creativecommons icons by Dániel Aczél from the Noun Project
    //click listener for buttons
    $('.skip').click(function(){
      //get the old index value
      var index = $('.range-slider').val();
      if ($(this).attr('id') == 'forward'){
          index++;
          //if past the last attribute, wrap around to first attribute
          index = index > 6 ? 0 : index;
          updatePropSymbols(map, attributes[index]);
          var year = (attributes[index].toString()).split("_")[1];
          $('h1').text(year);
      } else if ($(this).attr('id') == 'reverse'){
          index--;
          //if past the first attribute, wrap around to last attribute
          index = index < 0 ? 6 : index;
          updatePropSymbols(map, attributes[index]);
          var year = (attributes[index].toString()).split("_")[1];
          $('h1').text(year);
      };
      //update slider
      $('.range-slider').val(index);
    });

    //input listener for slider
    $('.range-slider').on('input', function(){
        var index = $(this).val();
        var year = (attributes[index].toString()).split("_")[1];
        updatePropSymbols(map, attributes[index]);
        $('h1').text(year);
    });
};

//loop through attributes
function processData(data){
  var attributes =[]; //start with empty array
  var properties = data.features[0].properties;
  for (var attribute in properties){
    if (attribute.indexOf("Pop")>-1){
      attributes.push(attribute);
    };
  };
  return attributes;
};



//function to retrieve the data and place it on the map
function getData(map){
    //load the data
    $.ajax("data/megacities.geojson", {
        dataType: "json",
        success: function(response){
          //create an attributes array
          var attributes = processData(response);

          //call functions on map
          createPropSymbols(response, map, attributes);
          createSequenceControls(map, attributes);
        }
    });
};

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [20, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};


//call the createMap function when HTML doc is ready
$(document).ready(createMap);
