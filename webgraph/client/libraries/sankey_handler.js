async function createSankey(root_node_name, start_date, end_date) {

    $('div.report_container').empty();

    var units = "Euro";
    var global_highlight_link;

    // set the dimensions and margins of the graph
    var margin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        },
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // format variables
    var formatNumber = d3.format(",.0f"), // zero decimal places
        format = function (d) {
            return formatNumber(d) + " " + units;
        },
        color = d3.scaleOrdinal(d3.schemeCategory10)
        //   .domain([0,500])                              
        .range(["#18c61a", "#9817ff", "#d31911", "#24b7f1", "#fa82ce", "#736c31", "#1263e2", "#18c199", "#ed990a", "#f2917f", "#7b637c", "#a8b311", "#a438c0", "#d00d5e", "#1e7b1d", "#05767b", "#aaa1f9", "#a5aea1", "#a75312", "#026eb8", "#94b665", "#91529e", "#caa74f", "#c90392", "#a84e5d", "#6a4cf1", "#1ac463", "#d89ab1", "#3c764d", "#2dbdc5", "#fb78fa", "#a6a9cd", "#c1383d", "#8b614e", "#73be38", "#ff8d52", "#cea37e", "#b53c7e", "#656d61", "#436f90", "#5e7304", "#82b792", "#fb88a3", "#dd8df2", "#6a5cc0", "#d098d5", "#ac15dc", "#a4543b", "#76b4cc", "#6963a4", "#8e620d", "#77adf8", "#c9a918", "#99537d", "#acaf7d", "#7850d5", "#ae3a9f", "#68bd74", "#e09d60", "#1069cd", "#d50438", "#c03d17", "#79b6af", "#517430", "#db9b94", "#095cf8", "#b1b045", "#c0a4a9", "#bc01c1", "#906033", "#e49c3f", "#8e4db9", "#bb3a64", "#cb1478", "#776b09", "#94b743", "#763eff", "#1a7a3e", "#617046", "#915c62", "#ec8dc0", "#ba22ac", "#437461", "#913ddc", "#4bbda8", "#b4482e", "#a9a5e3", "#78b1e2", "#855b91", "#fc902e", "#2cbada", "#64c104", "#8abb0b", "#3cc441", "#68be5c", "#b9ac66", "#11c37b", "#5e6c7c", "#686690", "#f09469", "#66bc8a", "#736a4e", "#776768", "#c43251", "#c1a0c6", "#a2acb7", "#457713", "#f87fe4", "#c1a693", "#b14949", "#487175", "#eb929c", "#e18fdc", "#326ea4", "#147861", "#9b584f", "#dba103", "#cca567", "#5464b9", "#c797f2", "#94b57c", "#d3084b", "#e09b7e", "#cd2729", "#525ae2", "#a04c8a", "#bb308b", "#1d7489", "#a82bce", "#ee9751", "#a94b70", "#9432ea", "#9c5a24", "#9cb193", "#816722", "#826540", "#fb8b8e", "#696f20", "#33b4ff", "#d3a434", "#7b5aab", "#5b5bd4", "#c22c71", "#ca2f01", "#34792f", "#81bb4c", "#3064d4", "#80ba6d", "#4f68ab", "#b6a5bf", "#8a5d76", "#dc9f50", "#935e41", "#a94491", "#147953", "#8cb1be", "#41c183", "#acb05e", "#53c153", "#54c06c", "#7b618a", "#05bfb6", "#fb85b9", "#eb90b1", "#9a5669", "#9f42b3", "#c0ab3c", "#2f56ff", "#d09fa2", "#60b9be", "#b64708", "#8b4ac7", "#bcaa76", "#a905ea", "#bd9fdc", "#dd94c6", "#e786f9", "#6eb9a0", "#5d6a89", "#ca2844", "#93acdb", "#724ee3", "#bc2998", "#2b6abf", "#9e5a01", "#11776e", "#9441ce", "#98b722", "#ff8a78", "#d70123"])

    // append the svg object to the body of the page
    var svg = d3.select("body div.report_container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Define the div for the tooltip
    /*var div = d3.select("body").append("div")	
            .attr("class", "tooltip")				
            .style("opacity", 0);*/

    var div = d3.select("div.tooltip");
    // Set the sankey diagram properties
    var sankey = d3.sankey()
        .nodeWidth(36)
        .nodePadding(5)
        .size([width, height]);

    var path = sankey.link();

    var post_obj = {};
    post_obj.root_node = root_node_name;
    post_obj.start_date = start_date
    post_obj.end_date = end_date
    $('svg > g').empty();

    // load the data
    // static version under sankey.json or sankey_test.json
    //console.log(root_node_name)
    await d3.json("sankey_data", {
            method: 'POST',
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify(post_obj)
        })
        .then(function (graph) {

            sankey
                .nodes(graph.nodes)
                .links(graph.links)
                .layout(32);

            // add in the links
            var link = svg.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .on("mouseover", function (d) {
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    //div	.html(d.source.name + "<br/>"  + d.target.name + "<br/>"  + d.value)	              
                    div.style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                    div.select("text.tt_class_text").html(d.target.name);
                    div.select("text.tt_money_text").html(d.value);
                })
                .on("mouseout", function (d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                })
                .on('click', function (d) {
                    console.log(d);
                    sankeyClickHandler(d.source.name, d.target.name)
                })
                .attr("class", "link")
                .attr("d", path)
                .style("stroke-width", function (d) {
                    return Math.max(1, d.dy);
                })
                .sort(function (a, b) {
                    return b.dy - a.dy;
                });

            // add the link titles
            /*
    link.append("title")
            .text(function(d) {
                return d.source.name + " → " + 
                    d.target.name + "\n" + format(d.value); });
*/
            // add in the nodes
            var node = svg.append("g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .on("mouseover", function (d) {
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    //div	.html(d.name + "<br/>" + d.value)	
                    div.style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                    div.select("text.tt_class_text").html(d.name);
                    div.select("text.tt_money_text").html(d.value);
                })
                .on("mouseout", function (d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                })
                .on('click', function (d) {
                    sankeyClickHandler(d.name)
                })
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.drag()
                    .subject(function (d) {
                        return d;
                    })
                    .on("start", function () {
                        this.parentNode.appendChild(this);
                    })
                    .on("drag", dragmove));

            // add the rectangles for the nodes
            node.append("rect")
                .attr("height", function (d) {
                    return d.dy;
                })
                .attr("width", sankey.nodeWidth())
                .style("fill", 
                    function (d) {
                        col = color(d.name)
                        if (class_color_map[d.name] == undefined) {
                            class_color_map[d.name] = col
                            return col;
                        } else {
                            return class_color_map[d.name];
                        }

                    })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
            /*   .text(function(d) { 
                   return d.name + "\n" + format(d.value); })*/
            ;

            // add in the title for the nodes
            node.append("text")
                .attr("x", -6)
                .attr("y", function (d) {
                    return d.dy / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("transform", null)
                .text(function (d) {
                    return d.name;
                })
                .filter(function (d) {
                    return d.x < width / 2;
                })
                .attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", "start");

            // the function for moving the nodes
            function dragmove(d) {
                d3.select(this)
                    .attr("transform",
                        "translate(" +
                        d.x + "," +
                        (d.y = Math.max(
                            0, Math.min(height - d.dy, d3.event.y))) + ")");
                sankey.relayout();
                link.attr("d", path);
            }
        });
}