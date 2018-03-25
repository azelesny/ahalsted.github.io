//wrapping everything in self executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var asianArray = ["% Poverty ($1.90 a day)", "% National Poverty","% Primary Children Out of School", "% Female Primary Children Out of School", "% Prevalance of Undernourishment","Human Development Rank", "Human Development Index", "GNI per capita"];
var expressed = asianArray[0]; //initial attributes

//chart frame dimensions
var chartWidth = window.innerWidth*0.425,
    chartHeight = window.innerHeight*0.70;
    leftPadding = 35,
    rightPadding = 10,
    topPadding = 30,
    bottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topPadding - bottomPadding,
    translate = "translate(" + leftPadding + "," + topPadding + ")";
//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
      .range([chartHeight, 0])
      .domain([0, 75]);
//execute script when window is loaded
window.onload = setMap();

//set up choropleth map
function setMap(){
  //map frame dimensions
      var width = window.innerWidth *0.5,
          height = window.innerHeight*0.70;
  //create new svg container for the map
      var map = d3.select("body")
          .append("svg")
          .attr("class", "map")
          .attr("width", width)
          .attr("height", height);
      var hoverInfo = d3.select("body")
          .append("div")
          .attr("class", "hoverInfo")
          .attr("fill", "#2A2C39")
          .text("Hover over country for detailed information");
  //mercator projection and zoom/panning
      var projection = d3.geoPatterson()
        .center([100, 25])
        .scale(300)
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
              //console.log(asianCountries.length)
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
    // var colorClasses = [
    //   "#ffffe5",
    //   "#f7fcb9",
    //   "#d9f0a3",
    //   "#addd8e",
    //   "#78c679",
    //   "#41ab5d",
    //   "#238443",
    //   "#005a32"
    // ];
    var colorClasses = [
      "#A1FF9A",
      "#7ADD92",
      "#58BB86",
      "#3C9978",
      "#277866",
      "#185951",
      "#0f4733",
      "#062022"
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
        return "#8a8e89";
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
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);
    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){
          return b[expressed]-a[expressed] || b[expressed]-0;
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
      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale)
          .tickSize(0);
      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);
      //create chart title
      var chartTitle = chart.append("text")
              .attr("x", chartWidth*.5)
              .attr("y", chartHeight*.1)
              .attr("text-anchor", "middle")
              .attr("class", "chartTitle")
              .text(expressed)
              .append("a").attr("xlink:href",function(d){return "#information"});
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
    // put attributes into arry
    var changeArray =[];
    for (var i=0; i<csvData.length; i++){
        var val = parseFloat(csvData[i][expressed]);
        changeArray.push(val);
    };
    //check for max and min values
    var maxValue = d3.max(changeArray);
    var minValue = d3.min(changeArray);

    //update the chart Y axis
    yScale = d3.scaleLinear()
      .range([chartHeight, 0])
      .domain([0, maxValue+(maxValue*.1)]);
    //recreate vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale)
          .tickSize(0);
      d3.selectAll("g.axis")
          .call(yAxis);
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var asian = d3.selectAll(".countries")
        .transition()
        .duration(1500)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a,b){
          return b[expressed]-a[expressed] || b[expressed]-0;
        })
        .transition() //add animation
        .delay(function(d,i){
          return i*10
        })
        .duration(1500);
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
          //is attribute value a number
          if (typeof val == 'number' && !isNaN(val)){
              return chartHeight - yScale(parseFloat(d[expressed]));
          } else {
              return 0;
          };
        })
        .attr("y", function(d, i){
          //make sure attribute value is a number
          var val = parseFloat(d[expressed]);
          //is attribute value a number
          if (typeof val == 'number' && !isNaN(val)){
              return yScale(parseFloat(d[expressed])) + bottomPadding;
          } else {
              return 0;
          };
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    var chartTitle = d3.select(".chartTitle")
        .text(expressed);
  };//end updateChart

//function to highlight enumeration units and bars
function highlight(props){
    //change fill
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
function setLabel(props, csvData){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", [props.ADM0_A3] + "_label")
        .html(labelAttribute)

        // function getCountryNames(ADM0_A3){
        //   d3.csv("data/Poverty_asia.csv", function(nameArray){
        //       for (var i=0; i < nameArray.length; i++){
        //         if(ADM0_A3 === nameArray[i]["ADM0_A3"]){
        //           console.log("I'm here!");
        //           return nameArray[i]["Long_Name"];
        //         }
        //       }
        //   })
        // };

        var countryName = infolabel.append("div")
            .attr("class", "labelname")
            // .html(function(d){
            //   return getCountryNames(props.ADM0_A3);
            // });
            .html(function(ADM0_A3){
              d3.csv("data/Poverty_asia.csv", function(nameArray){
                  for (var i=0; i < nameArray.length; i++){
                    if(props.ADM0_A3 === nameArray[i]["ADM0_A3"]){
                      console.log(nameArray[i]["Long_Name"]);
                      return nameArray[i]["Long_Name"];
                    }
                  }
              })
            });

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
