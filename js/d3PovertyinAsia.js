//wrapping everything in self executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var asianArray = ["Human_Dev_Rank", "Human_Dev_Index", "GNI_per_capita", "POV_DAY", "POV_DAY_YEAR", "POV_NATIONAL", "POV_NATIONAL_YEAR", "OUT_OF_SCHOOL", "OUT_FEMALE_PRIMARY", "MALNUTRITION_UNDERWEIGHT", "MALNUTRITION_YEAR", "MALNUTRITION_WORLDBANK_2015"];
var expressed = asianArray[0]; //initial attributes
//chart frame dimensions
var chartWidth = window.innerWidth*0.425,
    chartHeight = 473;
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
      .range([463, 0])
      .domain([0, 200]);
//execute script when window is loaded
window.onload = setMap();

//set up choropleth map
function setMap(){
  //map frame dimensions
      var width = window.innerWidth *0.5,
          height = 460;
  //create new svg container for the map
      var map = d3.select("body")
          .append("svg")
          .attr("class", "map")
          .attr("width", width)
          .attr("height", height);
  //mercator projection and zoom/panning
      var projection = d3.geoMercator()
        .center([100, 25])
        .scale(360)
        .translate([width / 2, height / 2]);
      var zoom = d3.zoom()
          .on("zoom", zoomed)
          .scaleExtent([0,4]);
          //need to add limits for zoom out and panning
      var path = d3.geoPath()
            .projection(projection);
  //zoom function to be called on zoom
    function zoomed(){
      t = d3
          .event
          .transform;
      map.selectAll("path")
        .attr("d", path)
        .attr("transform","translate("+ [t.x, t.y] + ")scale("+t.k+")");
    };
    map.call(zoom); //call zoom on map
  //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/Poverty_asia.csv") //load attributes from csv
        .defer(d3.json, "https://unpkg.com/world-atlas@1/world/110m.json")//load world background spatial data
        .defer(d3.json, "data/asia_poverty.topojson") //load choropleth spatial data
        .await(callback);

    function callback(error,csvData,world,asia){

      //translate world and asian TopoJSON
      var worldCountries = topojson.feature(world, world.objects.countries),
          asianCountries = topojson.feature(asia, asia.objects.asia_poverty).features;
      //add world countries to map
      var wCountries = map.append("path")
          .datum(worldCountries)
          .attr("class", "world")
          .attr("d", path);
      //create the color scale
      var colorScale = makeColorScale(csvData);

      //join csv data to GeoJson enumeration setEnumerationUnits
      asianCountries = joinData(asianCountries, csvData);
      //add enumeration units to the setMap
      setEnumerationUnits(asianCountries, map, path, colorScale);
      //add coordinated visualization to the map
      setChart(csvData, colorScale);
      createDropdown(csvData);
        };//end of function callback
};//end of setMap


function joinData(asianCountries, csvData){
  //loop through csv to assign each set of csv attribute values to geojson region
      for (var i=0; i<csvData.length; i++){
          var csvRegion = csvData[i]; //the current region
          var csvKey = csvRegion.ADM0_A3; //the CSV primary key

          //loop through geojson regions to find correct region
          for (var a=0; a<asianCountries.length; a++){

              var geojsonProps = asianCountries[a].properties; //the current region geojson properties
              var geojsonKey = geojsonProps.ADM0_A3; //the geojson primary key

              //where primary keys match, transfer csv data to geojson properties object
              if (geojsonKey == csvKey){

                  //assign all attributes and values
                  asianArray.forEach(function(attr){
                      var val = parseFloat(csvRegion[attr]); //get csv attribute value
                      geojsonProps[attr] = val; //assign attribute and value to geojson properties
                  });
              };
          };
      };
      return asianCountries;
};//end of joinData

function setEnumerationUnits(asianCountries, map, path, colorScale){
  //add Asian Countries to map
    var asian = map.selectAll(".countries")
        .data(asianCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "countries " + d.properties.ADM0_A3;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
          highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
    var desc = asian.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};//end setEnumerationUnits

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
      "#ffffcc",
      "#c7e9b4",
      "#7fcdbb",
      "#41b6c4",
      "#1d91c0",
      "#225ea8",
      "#0c2c84",
    ];
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    return colorScale;
};//end of makeColorScale function

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};//end of choropleth test

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){
          return b[expressed]-a[expressed];
        })
        .attr("class", function(d){
            return "bars " + d.ADM0_A3;
        })
        .attr("width", chartWidth / csvData.length-1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
  var desc = bars.append("desc")
          .text('{"stroke": "none", "stroke-width": "0px"}');
    // //annotate bars with attribute value text
    //   var numbers = chart.selectAll(".numbers")
    //       .data(csvData)
    //       .enter()
    //       .append("text")
    //       .sort(function(a, b){
    //           return a[expressed]-b[expressed]
    //       })
    //       .attr("class", function(d){
    //           return "numbers " + d.ADM0_A3;
    //       })
    //       .attr("text-anchor", "middle")
    //       .attr("x", function(d, i){
    //           var fraction = chartWidth / csvData.length;
    //           return i * fraction + (fraction - 1) / 2;
    //       })
    //       .attr("y", function(d){
    //         //make sure attribute value is a number
    //         var val = parseFloat(d[expressed]);
    //         //if attribute value exists, assign a color; otherwise assign gray
    //         if (typeof val == 'number' && !isNaN(val)){
    //             return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //         } else {
    //             return 0;
    //         };
    //       })
    //       .text(function(d){
    //           return d[expressed];
    //       });
      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale);
      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);
      //create frame for chart border
      var chartFrame = chart.append("rect")
          .attr("class", "chartFrame")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);
      //create chart title
      var chartTitle = chart.append("text")
              .attr("x", 40)
              .attr("y", 40)
              .attr("class", "chartTitle")
              .text("Variable " + expressed[0] + " in each nation");
    updateChart(bars, csvData.length,colorScale);
};//end of setChart

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
                    changeAttribute(this.value, csvData)
                });
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(asianArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};//end of createDropdown

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var asian = d3.selectAll(".countries")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d,i){
          return i*20
        })
        .duration(500);
      updateChart(bars, csvData.length,colorScale);
};//end of changeAttribute

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
          //make sure attribute value is a number
          var val = parseFloat(d[expressed]);
          //if attribute value exists, assign a color; otherwise assign gray
          if (typeof val == 'number' && !isNaN(val)){
              return 463 - yScale(parseFloat(d[expressed]));
          } else {
              return 0;
          };
        })
        .attr("y", function(d, i){
          //make sure attribute value is a number
          var val = parseFloat(d[expressed]);
          //if attribute value exists, assign a color; otherwise assign gray
          if (typeof val == 'number' && !isNaN(val)){
              return yScale(parseFloat(d[expressed])) + topBottomPadding;
          } else {
              return 0;
          };
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    var chartTitle = d3.select(".chartTitle")
        .text("Variable " + expressed[0] + " in each nation");
};
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.ADM0_A3)
        .style("fill-opacity","0.3")
    //call labels
    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.ADM0_A3)
        .style("fill-opacity", function(){
            return getStyle(this, "fill-opacity")
        });
    d3.select(".infolabel")
        .remove();
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.ADM0_A3 + "_label")
        .html(labelAttribute);

    var countryName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.ADM0_A3);
        //how do I acccess the full name of the country?
};//end function setLabel

//function to move info label with mouse
function moveLabel(){
  //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};//end function moveLabel

})();//last line of d3map.js
