define([
            'jquery',
            'underscore',
            'api/SplunkVisualizationBase',
            'api/SplunkVisualizationUtils',
            'd3'
            ],
            function(
                $,
                _,
                SplunkVisualizationBase,
                SplunkVisualizationUtils,
                d3
            ) 
{         
            // Returns true if all elements of a list are numbers
            var isNumericList = function(list) {
                return _.every(list, function(i) { return _.isNumber(i); });
            };

            // Truncates a string to a length, optionally adding a suffix
            var truncate = function(str, maxLength, suffix) {
                maxLength = maxLength || 25;
                suffix = suffix || '...';
                if (str.length > maxLength) {
                    str = str.substring(0, maxLength + 1);
                    str = str + suffix;
                }
                return str;
            };

            // Rounds to thousands and adds a 'K'
            var roundToThousands = function(d) {
                var value = d[1];
                if (value > 1000) {
                    value = Math.round((value / 1000)) + 'K';
                }
                return value;
            };
            return SplunkVisualizationBase.extend({
 
            initialize: function() {
                // Save this.$el for convenience
                this.$el = $(this.el);
                 
                // Add a css selector class
                this.$el.addClass('splunk-my-viz');
            },
 
            getInitialDataParams: function() {
                return ({
                    outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                    count: 10000
                });
            },
            formatData: function(data, config) {
                        var rows = data;
                        // Get dimension names from a sample object
                        //var  sampleKeys= _.keys(data.fields);
                        var array_fields = [] 
                        _.each(data.fields, function(field){
                            array_fields.push(field["name"])
                        })
                        var currentCategory = 1;

                        // x for calculating the x scale later
                        var xValues = [];
                        var Labels = []
                        var xLabels = []


                        var yValues = [];

                        var countData = {};
                        var cols = {}
                        _.each(data.rows, function(row) {
                  
                        var name = row[array_fields.indexOf("rows")]

                        var category = currentCategory++;

                        var count = parseInt(row[array_fields.indexOf("count")],10);

                        var xValue = row[array_fields.indexOf("columns")]
                        xValues.push(xValue);
                        yValues.push(name);
                        countData[name] = countData[name] || {total: 0, name: name, counts: [], category: name};
                        countData[name]['total'] += count;
                        countData[name]['counts'].push([xValue, count]);

                        var col_type = row [ array_fields.indexOf("col_type") ]
                        if (col_type=="sub") {
                                var col_parent = row [ array_fields.indexOf("parent_col") ]
                                cols[col_parent] = cols[col_parent] || { sub: [] }
                                if (cols[col_parent]["sub"].indexOf(xValue) < 0)
                                        cols[col_parent]["sub"].push(xValue)
                         }else{

                                if (Labels.indexOf(xValue)<1){

                                            Labels.push(xValue)
                                            cols[xValue] = cols[xValue] || { sub: [] };

                                }
                                       
                         }

                        });
                        yValues = _.uniq(yValues);

                        var all_phases = _.uniq(xValues);
                        for (var ii=0 ; ii<yValues.length; ii++){
                                name = yValues[ii]
                                countData[name] = countData[name] || {total: 0, name: name, counts: [], category: name};
                                
                                var tmp_phases= []

                                for(var i=0; i < countData[name]["counts"].length;i++) {
                                            phase = countData[name]["counts"][i][0];
                                            tmp_phases.push(phase)
                                } 
                                         for(var jj=0; jj < all_phases.length;jj++)  {
                                                        tmp_phase= all_phases[jj]
                                                       
                                                         if (tmp_phases.indexOf(tmp_phase)<0)
                                                         {
                                                                    countData[name]["counts"].push([tmp_phase,"0"])
                                                         }

                                            }


                        }
                        var cols_inverse = {}
                        for (var i = 0 ; i < Labels.length; i ++ ){
                            
                            tmp_key = Labels[i]
                             if (xLabels.indexOf(tmp_key)< 0){
                                            xLabels.push(tmp_key)
                                }
                            subs = cols[tmp_key]["sub"]
                            for (var j = 0 ; j < subs.length ; j ++ ){
                                sub_col = subs[j];
                                cols_inverse[sub_col] = tmp_key
                               if (xLabels.indexOf(sub_col)< 0){
                                            xLabels.push(sub_col)
                                }
                            }
                        }
                        // Dedupe range values
                        xValues = xLabels //_.uniq(xValues);
                        if(xValues.length < 3 || yValues.length < 2){
                            throw new SplunkVisualizationBase.VisualizationError(
                                'This viz only supports tables whose dimensions  greater than 3x3'
                            );
                        }
                        var metadata = {xValues: xValues};

                        return {metadata: metadata, countData: _.values(countData), cols: cols, cols_inverse:cols_inverse, list_sub:_.keys(cols_inverse)};  
            },

            updateView: function(data, config) {
                        //Guard for empty data
                       if (!data.countData.length) {
                                    return;
                        }
                        console.log(data)
                        //sort xValues col1 sub-cols col2 sub-cols2
                        var cols = data.cols
                        var cols_inverse = data.cols_inverse
                        var list_sub = data.list_sub
                        var list_main = _.keys(cols)

                        // Clear the div
                        this.$el.empty();
                        var scale = parseFloat(config[this.getPropertyNamespaceInfo().propertyNamespace + "scale"]) || parseFloat(1.0);
                        if (scale < 0.5 || scale > 1.5) scale = 1.0
                        //alert(scale)
                        // Set height and width
                        var margin = {top: 30 * scale , right: 30 * scale, bottom: 30 * scale, left: 30 * scale};
                        var availableWidth = parseInt(1200, 10) * scale;
                        var availableHeight = parseInt(800, 10) * scale;
                
                        // SVG setup
                        var svg  = d3.select(this.el).append('svg')
                            .attr("id","my-svg")
                            .attr('width', availableWidth)
                            .attr('height', availableHeight)
                            .style('background', 'white');
  
                        var graphWidth = availableWidth - margin.left - margin.right;
                        var graphHeight = availableHeight - margin.top - margin.bottom;
                        
                        var graph = svg
                            .append('g')
                            .attr('width', graphWidth)
                            .attr('height', graphHeight)
                            .attr('transform', 'translate('
                            + margin.left + ','
                            + margin.top + ')');

                        //Colors
                        var colorScale = d3.scale.category20();
                        var cos_color= [];
                        var color1 = config[this.getPropertyNamespaceInfo().propertyNamespace + "Color1"] ||'#FFCCCC' ;
                        var color2 = config[this.getPropertyNamespaceInfo().propertyNamespace + "Color2"] ||'#DED9D9' ;
                        var color3 = config[this.getPropertyNamespaceInfo().propertyNamespace + "Color3"] ||'#B2AFAF' ;
                        var color4 = config[this.getPropertyNamespaceInfo().propertyNamespace + "Color4"] ||'#7C7A7A' ;
                        var color5 = config[this.getPropertyNamespaceInfo().propertyNamespace + "Color5"] ||'#000000' ;

                        cos_color.push(color1);
                        cos_color.push(color2);
                        cos_color.push(color3);
                        cos_color.push(color4);
                        cos_color.push(color5);


                        var xValues = data.metadata.xValues;
                        var xLength = xValues.length

                        // If the x scale is numbers, we make it linear, otherwise its ordinal
                        var LABEL_WIDTH = 400 * scale ; 
                        var ROW_HEIGHT = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "case_size"],10)|| 80 ;
                        ROW_HEIGHT = (parseInt(ROW_HEIGHT, 10 ) + 20 ) * scale ;
                        


                        var DELTA_RECT = 20 * scale
                        var RECT_HEIGHT_L = ROW_HEIGHT - DELTA_RECT;
                        var RECT_HEIGHT_XL = RECT_HEIGHT_L + DELTA_RECT
                        var RECT_HEIGHT_S = RECT_HEIGHT_L - DELTA_RECT

                        var RECT_WIDTH_L = RECT_HEIGHT_L;
                        var RECT_WIDTH_S = RECT_WIDTH_L - DELTA_RECT 
                        var MARGIN_RECT_LEFT = 260 * scale
                        var MARGIN_RECT_TOP = 90 * scale
                        
                        var case_font_size = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "case_font_size"],10)|| 34 ;
                        case_font_size = case_font_size  * scale
                        var xScale = null;
                        var X_RANGE_MAX = xLength * RECT_WIDTH_L;
                        if (isNumericList(xValues)) {
                                    var start = _.min(xValues);
                                    var end = _.max(xValues);

                                    xScale = d3.scale.linear()
                                        .domain([start, end])
                                        .range([0, graphWidth - LABEL_WIDTH]);
                        }
                        else {
                                    xScale = d3.scale.ordinal()
                                        .domain(xValues)
                                        .rangePoints([0, X_RANGE_MAX]);
                        }
                    
                         // Set up the axis markers
                        var xAxis = d3.svg.axis()
                            .scale(xScale)
                            .ticks(xValues.length + 1)

                        //hide line and tick
                        
                       
                        var transform_x = 400 * scale
                        graph.append('g')
                                    .attr('class', 'x axis')
                                    .call(xAxis)
                                    .attr({
                                      'fill':'none',
                                      'transform':'translate(' + transform_x  + ',40)'
                                     })
                                    .selectAll("text")
                                    .attr("dy", ".35em")
                                    .style('fill', "black") 
                                    .style('font-size',14 * scale)
                                    .style('font-weight',"bold")
                                    .attr("transform", "rotate(-45)");
                        graph.selectAll("path.domain").style("fill","none").style("stroke","none");
                        graph.selectAll("g.tick line").style("fill","none").style("stroke","none"); 
                        graph.selectAll("g.tick text").style("fill","none").style("stroke","none"); 

                        //Set up arrows
                        var g = graph.append('g');
                        var defs = g.append("defs");
                        var arrowMarker = defs.append("marker")
                                    .attr("id","arrow")
                                    .attr("markerUnits","strokeWidth")
                                    .attr("markerWidth","12") 
                                    .attr("markerHeight","12") 
                                    .attr("viewBox","0 0 12 12")  
                                    .attr("refX","6") 
                                    .attr("refY","6") 
                                    .attr("orient","auto");

                        var arrowMarker_2 = defs.append("marker")
                                    .attr("id","arrow2")
                                    .attr("markerUnits","strokeWidth")
                                    .attr("markerWidth","12") 
                                    .attr("markerHeight","12") 
                                    .attr("viewBox","0 0 12 12")  
                                    .attr("refX","6") 
                                    .attr("refY","6") 
                                    .attr("orient","270");

                        var arrow_path = "M2,2 L10,6 L2,10 L6,6 L2,2";  
                        arrowMarker.append("path") 
                                    .attr("d",arrow_path) 
                                    .attr("fill","#000");

                        arrowMarker_2.append("path") 
                                    .attr("d",arrow_path) 
                                    .attr("fill","#000");

                       

                        var rect_color =config[this.getPropertyNamespaceInfo().propertyNamespace + "fondColor"] ||'grey' ;
                        /*
                        var in_rect= g.insert("rect", ":first-child")
                                    .attr('id','rect_fond')
                                    .attr("y",10)
                                    .attr("x", MARGIN_RECT_LEFT + RECT_WIDTH_L + 10)
                                    .attr("width", xScale(xValues[xLength-1]) - RECT_WIDTH_L - 20)
                                    .attr("height",ROW_HEIGHT * data.countData.length + 50)
                                    .style("fill",rect_color)
                                    .style("opacity", .1)    
                                    .style("stroke", "black");
*/
                        var x_title = config[this.getPropertyNamespaceInfo().propertyNamespace + "x_title"] ||'X_Title'

                        var x_axis_title = g.append('text')
                                    .text(x_title)
                                    .style("font-size",18*scale)
                                    .style("font-weight","bold")
                                    .attr("x",MARGIN_RECT_LEFT + X_RANGE_MAX/2 )
                                    .attr("y",-5);
                        
                        var tmp_j;
                         var g = graph.append('g');
                        var x_labels = g.selectAll('text')
                                                .data(xValues)
                                                .enter()
                                                .append('text');

                        x_labels
                            .attr('y', MARGIN_RECT_TOP - DELTA_RECT )
                            .attr('x', function(d) { return xScale(d) + MARGIN_RECT_LEFT + RECT_WIDTH_L/2; })
                            .attr('class2', function(d) { return d+'_value'; })
                            .attr('col_index', function(d,i) {return i;})
                           .attr('class', function(d, i) {
                                                if ( list_sub.indexOf(d)> -1)  
                                                        return "sub-" + String(cols_inverse[d]).replace(/\s+/g,'_');
                                                return String(d).replace(/\s+/g,'_');})
                            .text(function(d,i) { return d})
                            .attr("text-anchor", "middle")
                            .attr('title', function(d) { return d; })
                            .style('fill', "black") 
                            .style("font-size", case_font_size / 2 -4);  

                        for (var j = 0; j < data.countData.length; j++) {
                                    tmp_j=j;
                                    var last_row = data.countData.length - 1

                                    if (j== last_row){
                                                tmp_j= j*1.05 ;
                                    }


                                    var row = data.countData[j];
                                    
                                    // Append a category class
                                    var g = graph.append('g')
                                                .attr('class', 'dimension')
                                                .attr('data-category', row.category);
                               

                                    var rects = g.selectAll('rect')
                                                .data(row['counts'])
                                                .enter()
                                                .append('rect')
                                                .attr("class", function(d) { return String(d[0]).replace(/\s+/g,'_'); });


                                    // Add text
                                    var text = g.selectAll('text')
                                                .data(row['counts'])
                                                .enter()
                                                .append('text');
                                    
                                    // Position and color the numbers 
                                    text
                                                .attr('y', tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + RECT_HEIGHT_L/2 + case_font_size/2 )
                                                .attr('x', function(d, i) { return xScale(d[0]) + MARGIN_RECT_LEFT + RECT_WIDTH_L/2; })
                                                .attr('class2', function(d) { return d[0]+'_value'; })
                                                .attr('class', function(d, i) {
                                                        if ( list_sub.indexOf(d[0])> -1)  
                                                                return "sub-" + String(cols_inverse[d[0]]).replace(/\s+/g,'_') ;
                                                        return String(d[0]).replace(/\s+/g,'_');})
                                                .attr('col_index', function(d) {return xValues.indexOf(d[0]);})
                                                .attr("col", function(d){return d[0]})
                                                .text(roundToThousands)
                                                .attr("text-anchor", "middle")
                                                .attr('title', function(d) { return d[1]; })
                                                .style('fill', "black") 
                                                .style("font-size",case_font_size);  
                            

                                    // Position and color the rects

                                    rects
                                        .attr('x', function(d, i) { 
                                               if ( list_sub.indexOf(d[0])> -1)  
                                                        return xScale(d[0]) + MARGIN_RECT_LEFT + DELTA_RECT/2 ; 
                                                return xScale(d[0]) + MARGIN_RECT_LEFT; })
                                        .attr('y', function(d,i) { 
                                                if ( list_sub.indexOf(d[0])> -1)  
                                                        return tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + DELTA_RECT/2;
                                                return tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP; }) 
                                        .attr('width', function(d, i) {
                                                if ( list_sub.indexOf(d[0])> -1)  
                                                        return RECT_WIDTH_S ;
                                                return RECT_WIDTH_L;})
                                        .attr('col_index', function(d) {return xValues.indexOf(d[0]);})
                                        .attr('height', function(d, i) { 
                                                 if ( list_sub.indexOf(d[0])> -1)  
                                                {
                                                            if ( j == last_row )  return RECT_HEIGHT_L;
                                                            return RECT_HEIGHT_S

                                                }else{

                                                            if ( j == last_row )  return RECT_HEIGHT_XL;
                                                            return RECT_HEIGHT_L
                                                }
                                        })
                                        .attr("col", function(d){return d[0]})
                                        .attr('class', function(d, i) {
                                                if ( list_sub.indexOf(d[0])> -1)  
                                                        return "sub-" + String(cols_inverse[d[0]]).replace(/\s+/g,'_');
                                                return String(d[0]).replace(/\s+/g,'_');})
                                        .attr('rect_name',function(d) { return String(d[0]+j).replace(/\s+/g,'_'); })
                                        .style('fill', cos_color[j]) 
                                        .style("opacity", function(d) {var newOpacity   = list_sub.indexOf(d[0])> -1 ? 0.2 : 1; return newOpacity;})   
                                        .style("stroke", cos_color[j])
                                        .attr("stroke-width",function(d){ return 0.5;})
                                        .style("cursor", function(d) {  if ( list_sub.indexOf(d[0])> -1 || cols[d[0]]["sub"].length == 0.)  return "auto"; return "pointer";})
                                        .attr("active", 1)
                                        .on("click", click);
                              
                               

                                    if ( j >0 && j < last_row){

                                                var dash_line = g.append("line") 
                                                            .attr("class", "dash_line")
                                                            .attr("x1",MARGIN_RECT_LEFT-15).attr("y1",tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP - DELTA_RECT/2 ) 
                                                            .attr("x2",MARGIN_RECT_LEFT + X_RANGE_MAX + RECT_WIDTH_L + (DELTA_RECT - 5 )/2).attr("y2",tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP - DELTA_RECT/2 )
                                                            .attr("stroke","black") 
                                                            .style("stroke-dasharray", ("10,3"))    
                                                            .attr("stroke-width",2);
                                    }

                           
                                    if ( j >= 4 ){
                                        text
                                            .style('fill', "white") ;
                                    }

                                    // Y labels
                                    g.append("rect")
                                        .attr('y', tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP)
                                        .attr('x', MARGIN_RECT_LEFT - 170*scale)
                                        .attr('width', 125 *scale)
                                        .attr('height', RECT_HEIGHT_L)
                                        .style("opacity", 0.5)
                                        .style("fill", "none")
                                        .attr("stroke", function () { if (j == last_row) return "white" ; return "black";} )   
                                        .style("stroke-dasharray", ("10,3"))    
                                        .attr("stroke-width",1);

                                    if (j != last_row) {
                                        g.append("rect")
                                            .attr('y', tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP )
                                            .attr('x',MARGIN_RECT_LEFT - 170*scale)
                                            .attr('width', 30* scale)
                                            .attr('height',30* scale)
                                            .style("fill", cos_color[j]);
                                    } 

                                    g.append('text')
                                        .attr('y', tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + 26*scale)
                                        .attr('x', MARGIN_RECT_LEFT - 165*scale)
                                        .text(function() {
                                            category="";
                                            switch (j) {
                                                case 0:
                                                    category = "A";
                                                    break;
                                                case 1:
                                                    category = "B";
                                                    break;
                                                case 2:
                                                    category = "C";
                                                    break;
                                                case 3:
                                                    category = "D";
                                                    break;
                                                case 4:
                                                    category = "E";
                                                    break;
                                                case 5:
                                                    category = "F";
                                                    break;
                                                case 6:
                                                    category = "G";
                                                    break;
                                                case 7:
                                                    category = "H";
                                                    break;
                                            }
                                            return category;
                                        })
                                        .style('fill', "white")
                                        .style("font-size",26 * scale);  

                                    g.append('text')
                                        .attr('y',function () { if ( j == last_row ) return  tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + RECT_HEIGHT_L/2 + 9*scale;return  tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + RECT_HEIGHT_L/2 + 7*scale;})
                                        .attr('x', function () { if ( j ==last_row ) return MARGIN_RECT_LEFT - 130*scale ; return MARGIN_RECT_LEFT - 160*scale ;})
                                        .attr("text-anchor","mid")
                                        .attr('class', 'label')
                                        .text((row['name']))
                                        .style("font-size",function () { if ( j == last_row )  return 18*scale; return 14*scale;})
                                        .style("font-weight",function () { if ( j == last_row )  return "bold"; return "none";})
                                        .style('fill',cos_color[j]);


                                        var g_dash = graph.insert('g',":first-child")
                                            .attr('class', 'rect_dash');
                                           
                                        var rect_dash = g_dash.selectAll('rect')
                                            .data(list_main)
                                            .enter()
                                            .append('rect');

                                        rect_dash
                                                .attr('x', function(d, i) { return xScale(d) + MARGIN_RECT_LEFT; })
                                                .attr('y', tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP)
                                                .attr('width', function (d) { 
                                                    if (cols[d]["sub"].length == 0 ) return 0;
                                                    if ((list_main.indexOf(d) +1) == list_main.length)
                                                            return  xScale(cols[d]["sub"][cols[d]["sub"].length - 1]) + RECT_WIDTH_L - xScale(d) ;
                                                    return xScale(list_main[list_main.indexOf(d) +1]) - xScale(d)  - DELTA_RECT/2 

                                                })
                                                .attr('col_index', function(d) {return xValues.indexOf(d);})
                                                .attr('class', function(d, i) {return "sub-" + String(d).replace(/\s+/g,'_');})
                                                .attr('height', function () { if ( j == last_row ) return RECT_HEIGHT_XL ; return RECT_HEIGHT_L; })
                                                .style("fill",'#FFF')
                                                .attr("class2","dash")
                                                .style("opacity", 0.2)   
                                                .style("stroke-dasharray", ("10,3"))    
                                                .style("stroke", "black");
                                                  

                        }


                        var line_x_arrow = g.append("line") 
                                    .attr("x1", MARGIN_RECT_LEFT)
                                    .attr("y1", 5) 
                                    .attr("x2", MARGIN_RECT_LEFT + X_RANGE_MAX + RECT_WIDTH_L + 15*scale) 
                                    .attr("y2",5) 
                                    .attr("stroke","black") 
                                    .attr("stroke-width",2) 
                                    .attr("marker-end","url(#arrow)");

                        var line_y_double_arrow = g.append("line") 
                                    .attr("x1",MARGIN_RECT_LEFT - 210*scale ) .attr("y1", MARGIN_RECT_TOP + 20*scale ) 
                                    .attr("x2",MARGIN_RECT_LEFT - 210*scale) .attr("y2", tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP - 50*scale) 
                                    .attr("stroke","black") 
                                    .attr("stroke-width",2) 
                                    .attr("marker-start","url(#arrow2)")
                                    .attr("marker-end","url(#arrow)");
                        var y_title = config[this.getPropertyNamespaceInfo().propertyNamespace + "y_title"] ||'Y_Title'

                        g.append('text')
                                .attr('y',MARGIN_RECT_LEFT - 210*scale - 18*scale)
                                .attr('x',-(tmp_j  * ROW_HEIGHT + MARGIN_RECT_TOP + 40)/2 )
                                .attr('class', 'label')
                                .text(y_title)
                                .style("fill", "black")
                                .style("font-size", 18*scale)
                                .attr("transform", "rotate(-90)");


                        var line_x_bottom = g.append("line") 
                                    .attr("x1",MARGIN_RECT_LEFT)
                                    .attr("y1",  tmp_j  * ROW_HEIGHT + MARGIN_RECT_TOP - 20*scale) 
                                    .attr("x2",  MARGIN_RECT_LEFT + X_RANGE_MAX + RECT_WIDTH_L + 15*scale)
                                    .attr("y2",  tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP - 20*scale ) 
                                    .attr("stroke","black") 
                                    .attr("stroke-width",2);
                                   
                        var fleche = g.append("line") 
                                    .attr("x1",MARGIN_RECT_LEFT - 35 * scale) .attr("y1",tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + RECT_HEIGHT_L/2 + 5*scale) 
                                    .attr("x2",MARGIN_RECT_LEFT - 35 * scale) .attr("y2",tmp_j * ROW_HEIGHT + MARGIN_RECT_TOP + RECT_HEIGHT_L/2 + 5*scale) 
                                    .attr("stroke","black") 
                                    .attr("stroke-width",3* scale)
                                    .attr("marker-start","url(#arrow)");

                        svg.attr("height",(tmp_j + 1)* ROW_HEIGHT + MARGIN_RECT_TOP + 40*scale);
                        svg.attr("width",   MARGIN_RECT_LEFT + X_RANGE_MAX + RECT_WIDTH_L * 2);

                        //in_rect.attr("height",(tmp_j + 1 )* ROW_HEIGHT + MARGIN_RECT_TOP + 20);
                        
                        function click(p){
                                    var element = d3.select(this)
                                    var tmp_col  = element.attr("class").replace(/_/g,' ');
                                    alert(tmp_col)

                                    if (tmp_col.indexOf("sub-") > -1)  return ;
                                    if (cols[tmp_col]["sub"].length == 0) return ;
                                    var last_sub_col = cols[tmp_col]["sub"][cols[tmp_col]["sub"].length - 1 ]
                                    var DIFF = xScale(last_sub_col) - xScale(tmp_col);
                                    var index_X = xValues.indexOf(last_sub_col) ; 
                                    var active = element.attr("active") ;
                                     alert(active)

                                    var  sub_cols=  ".sub-" + String(tmp_col).replace(/\s+/g,'_');
                                     alert(sub_cols)

                                    if (active == 1) {
                                                d3.selectAll("." + String(tmp_col).replace(/\s+/g,'_')).attr("active",0);
                                                
                                                d3.selectAll(sub_cols).style("visibility","hidden")

                                                for ( var i = index_X + 1  ; i < xValues.length; i ++ ){
                                                        var rects = "rect[col_index ='" + i  + "']"
                                                        var texts = "text[col_index ='" + i  + "']"
                                                        var rect_elements = d3.selectAll(rects);
                                                        var text_elements = d3.selectAll(texts);
                                                        var X_rect= d3.select(rects).attr("x") ;
                                                        var X_text= d3.select(texts).attr("x") ;
                                                        rect_elements.attr("x", parseFloat(X_rect) - parseFloat(DIFF))
                                                        text_elements.attr("x", parseFloat(X_text) - parseFloat(DIFF))
                                                }
                                              
                                                var old_x2 = line_x_bottom.attr("x2")
                                                line_x_bottom.attr("x2",parseFloat(old_x2) - parseFloat(DIFF));
                                                old_x2 = line_x_arrow.attr("x2")
                                                line_x_arrow.attr("x2", parseFloat(old_x2) - parseFloat(DIFF));
                                                x_axis_title.attr("x", parseFloat(line_x_arrow.attr("x2"))/2 + parseFloat(line_x_arrow.attr("x1"))/2);
                                                old_x2 = dash_line.attr("x2")
                                                d3.selectAll(".dash_line").attr("x2", parseFloat(old_x2) - parseFloat(DIFF));
                                                
                                    }
                                    else{
                                                
                                                d3.selectAll(sub_cols).style("visibility","visible")
                                                d3.selectAll("." + String(tmp_col).replace(/\s+/g,'_')).attr("active",1);
                                                
                                                for ( var i =  index_X + 1 ; i < xValues.length; i ++ ){
                                                        var rects = "rect[col_index ='" + i  + "']"
                                                        var texts = "text[col_index ='" + i  + "']"
                                                        var rect_elements = d3.selectAll(rects);
                                                        var text_elements = d3.selectAll(texts);
                                                        var X_rect= rect_elements.attr("x") ;
                                                        var X_text= text_elements.attr("x") ;

                                                        rect_elements.attr("x", parseFloat(X_rect) + parseFloat(DIFF))
                                                        text_elements.attr("x", parseFloat(X_text) + parseFloat(DIFF))
                                                }
                                                var old_x2 = line_x_bottom.attr("x2")
                                                line_x_bottom.attr("x2",parseFloat(old_x2) + parseFloat(DIFF));
                                                old_x2 = line_x_arrow.attr("x2")
                                                line_x_arrow.attr("x2", parseFloat(old_x2) + parseFloat(DIFF));
                                                x_axis_title.attr("x", parseFloat(line_x_arrow.attr("x2"))/2 + parseFloat(line_x_arrow.attr("x1"))/2 );
                                                old_x2 = dash_line.attr("x2")
                                                d3.selectAll(".dash_line").attr("x2", parseFloat(old_x2) + parseFloat(DIFF));
                                    }
                        }
                    

        }
    });
});