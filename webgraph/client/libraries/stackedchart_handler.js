async function createStackedchart(root_node_name, start_date, end_date) {

    // set the dimensions and margins of the graph
    var margin = {
            top: 60,
            right: 200,
            bottom: 50,
            left: 50
        },
        width = 700 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    $("#my_dataviz").empty();
    // append the svg object to the body of the page
    var svg = d3.select("#my_dataviz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Parse the Data
    var getJsonStr = `?root_node=${root_node_name}&start_date=${start_date}&end_date=${end_date}`
    await d3.json(`/graph_data${getJsonStr}`).then(function (input_data) {

        //////////
        // GENERAL //
        //////////

        maxEuro = input_data.highest_period_value;
        data = input_data.chart_data;

        // List of groups = header of the csv files
        var keys = input_data.columns

        // color palette
        var color = d3.scaleOrdinal(d3.schemeCategory10)
        //           .domain(keys)
        //            .range(d3.schemeSet2);

        //stack the data?
        var stackedData = d3.stack()
            .keys(keys)
            (data)



        //////////
        // AXIS //
        //////////

        // Add X axis
        var x = d3.scaleLinear()
            .domain(d3.extent(data, function (d) {
                return new Date(d.date);
            }))
            .range([0, width]);


        //console.log(`CHOSEN TIMEFRAME AT INIT TIME ${new Date(x.domain()[0])} - ${new Date(x.domain()[1])} `)

        var xAxis = svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .attr("axis", "x")
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(d3.timeFormat("%m/%Y")))

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([0, maxEuro])
            .range([height, 0]);
        svg.append("g")
            .call(d3.axisLeft(y).ticks(10))
            .attr("axis", "y")



        //////////
        // BRUSHING AND CHART //
        //////////

        // Add a clipPath: everything out of this area won't be drawn.
        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0)
            .attr("y", 0);

        // Add brushing
        var brush = d3.brushX() // Add the brush feature using the d3.brush function
            .extent([
                [0, 0],
                [width, height]
            ]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
            .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

        // Create the scatter variable: where both the circles and the brush take place
        var areaChart = svg.append('g')
            .attr("clip-path", "url(#clip)")

        // Area generator
        var area = d3.area()
            .x(function (d) {
                return x(new Date(d.data.date));
            })
            .y0(function (d) {
                return y(d[0]);
            })
            .y1(function (d) {
                return y(d[1]);
            })

        // Show the areas
        areaChart
            .selectAll("mylayers")
            .data(stackedData)
            .enter()
            .append("path")
            .attr('pointer-events', 'visibleStroke')            
            .attr("class", function (d) {
                class_name = d.key.split(' ').join('_')                
                return "myArea " + class_name
            })
            .style("fill", function (d) {
                c = findColor(d.key);
                return c
                //return color(d.key);
            })
            .attr("d", area)

        // Add the brushing
        areaChart
            .append("g")
            .attr("class", "brush")
            .call(brush);

        var idleTimeout

        function idled() {
            idleTimeout = null;
        }

        // A function that update the chart for given boundaries
        function updateChart() {

            extent = d3.event.selection

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled,
                    350); // This allows to wait a little bit     
                createPage(global_root_node, '', '');
                /*  x.domain(d3.extent(data, function (d) {
                      return new Date(d.date);
                  })) */
            } else {

                var domain = []
                domain[0] = x.invert(extent[0])
                domain[1] = x.invert(extent[1])


                lowest_date = new Date(domain[0])
                highest_date = new Date(domain[1])
                createPageFromChartEvent(lowest_date, highest_date)
                //console.log(`chosen between ${lowest_date}% & ${highest_date}%`)

            }
        }



        //////////
        // HIGHLIGHT GROUP //
        //////////

        // What to do when one group is hovered
        var highlight = function (d) {
            class_name = d.split(' ').join('_')
            // reduce opacity of all groups
            d3.selectAll(".myArea").style("opacity", .1)
            // expect the one that is hovered
            d3.select("." + class_name).style("opacity", 1)
        }

        // And when it is not hovered anymore
        var noHighlight = function (d) {
            d3.selectAll(".myArea").style("opacity", 1)
        }



        //////////
        // LEGEND //
        //////////


        // Add one dot in the legend for each name.
        var size = 10
        posX = width + 20;
        svg.selectAll("myrect")
            .data(keys)
            .enter()
            .append("rect")
            .attr("x", posX)
            .attr("y", function (d, i) {
                return 10 + i * (size + 5)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("width", size)
            .attr("height", size)
            .style("fill", function (d) {
                return findColor(d)
            })
            .on("mouseover", highlight)
            .on("mouseleave", noHighlight)

        // Add one dot in the legend for each name.
        svg.selectAll("mylabels")
            .data(keys)
            .enter()
            .append("text")
            .attr("x", posX + size * 1.2)
            .attr("y", function (d, i) {
                return 10 + i * (size + 5) + (size / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", function (d) {
                return findColor(d)
            })
            .text(function (d) {
                return d
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .on("mouseover", highlight)
            .on("mouseleave", noHighlight)



        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */

        /*

        var mouseG = svg.append("g")
            .attr("class", "mouse-over-effects");

        mouseG.append("path") // this is the black vertical line to follow mouse
            .attr("class", "mouse-line")
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .style("opacity", "0");

        var mousePerLine = mouseG.selectAll('.mouse-per-line')
            .data(data)
            .enter()
            .append("g")
            .attr("class", "mouse-per-line");



        mousePerLine.append("circle")
            .attr("r", 7)
            .style("stroke", function (d) {
                return color(d.name);
            })
            .style("fill", "none")
            .style("stroke-width", "2px")
            .style("opacity", "0");

        mousePerLine.append("text")
            .attr("transform", "translate(10,3)");

        var lines = document.getElementsByClassName('line');

        mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
            .attr('width', width) // can't catch mouse events on a g element
            .attr('height', height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseout', function () { // on mouse out hide line, circles and text
                d3.select(".mouse-line")
                    .style("opacity", "0")
                    .style("stroke", "red")
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "0");
            })
            .on('mouseover', function () { // on mouse in show line, circles and text
                d3.select(".mouse-line")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "1");
            })
            .on('mousemove', function () { // mouse moving over canvas
                var mouse = d3.mouse(this);
                d3.select(".mouse-line")
                    .attr("d", function () {
                        var d = "M" + mouse[0] + "," + height;
                        d += " " + mouse[0] + "," + 0;
                        return d;
                    });
                d3.selectAll(".mouse-per-line")
                    .attr("transform", function (d, i) {
                        console.log(i)

                        var beginning = 0,
                            end = lines[i].getTotalLength(),
                            target = null;

                        while (true) {
                            target = Math.floor((beginning + end) / 2);
                            pos = lines[i].getPointAtLength(target);
                            if ((target === end || target === beginning) && pos.x !== mouse[0]) {
                                break;
                            }
                            if (pos.x > mouse[0]) end = target;
                            else if (pos.x < mouse[0]) beginning = target;
                            else break; //position found
                        }

                        d3.select(this).select('text')
                            .text(y.invert(pos.y).toFixed(2));
                        return "translate(" + mouse[0] + "," + pos.y + ")";
                    });
            });

            */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */
        /* ------------------ TOOL TIP TEST ------------------ */


    })
}