var global_root_node = ''
var global_start_date = new Date()
var global_end_date = new Date()
var global_text_filter = ''

var class_color_map = [] // global array

Date.prototype.austrianDate = function () {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();

    return [(dd > 9 ? '' : '0') + dd,
        (mm > 9 ? '' : '0') + mm,
        this.getFullYear()
    ].join('.');
};

function stackTrace(opt_message) {
    msg = (opt_message == undefined) ? '' : `${opt_message}\n`
    var err = new Error();
    return `${msg}${err.stack}`;
}

function findColor(nodeText, pure = false) {
    if (pure && class_color_map['nodeText'] != undefined)
        return class_color_map['nodeText']

    if (nodeText == undefined || nodeText == '')
        console.log(stackTrace())

    rectNode = $(`g > text:contains('${nodeText}')`).prev()

    if (rectNode == undefined)
        console.log(stackTrace())

    styleStr = rectNode.attr("style")
    if (styleStr == undefined)
        throw new Error('styleStr not defined')
    // string looks like this --> "fill: rgb(255, 127, 14); stroke: rgb(125, 62, 7);"
    // "fill: " == 6 chars & find the closing ");" (with a hack .. close brackets didnt work in search wtf..)   
    start = 6
    end = styleStr.search('; stroke')
    retStr_unclean = styleStr.substring(start, end)
    retStr = retStr_unclean.replace(' ', '')
    col = d3.color(retStr)
    if (pure) {
        ret = retStr.replace(/[^a-z0-9\(\,\)]*/g, "") // getting rid of special characters
        return ret
    } else {
        return col
    }
 
}

function iterIntToFormatStr(number, iterNr, iterStr) {
    if (number < 1000)
        return String(number)

    var group = 1

    if (iterNr != undefined)
        group = iterNr

    var str = ''
    if (iterStr != undefined) {
        str = iterStr
    } else {
        str = String(number)
    }
    var new_size = number * (group)
    if (number >= Math.pow(1000, group)) {

        // split an länge - (3*iterNr)
        slice_start = str.length - (3 * group) - (group - 1)
        slice_end = str.length
        slice_1 = str.slice(0, slice_start)
        slice_2 = str.slice(slice_start, slice_end)
        new_str = [slice_1, slice_2].join('.')
        return iterIntToFormatStr(number, group + 1, new_str)
    } else {
        return iterStr
    }
}

$(document).ready(function () {

    $('.search_form').val('');

    // date picker init
    $('#sandbox-container .input-daterange').datepicker({
        format: "mm/yyyy",
        startView: 1,
        minViewMode: 1,
        maxViewMode: 2,
        autoclose: true,
        startDate: '01/2012',
        endDate: new Date('now')
    });

    // attach to render button event
    $('button.reset_button').click(function (e) {
        $('.search_form').val('');
        global_text_filter = ''
        createTable(global_root_node, global_start_date, global_end_date, global_text_filter);
    });


    //if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
    $('.search_form').keyup(delay(function (e) {
        filterTable(this.value);
    }, 500));

    createPage();
});

function delay(callback, ms) {
    var timer = 0;
    return function () {
        var context = this,
            args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            callback.apply(context, args);
        }, ms || 0);
    };
}

function sankeyClickHandler(node_name, highlight_link_name) {
    // set if a & which link needs to be highlighted
    if (highlight_link_name != undefined && highlight_link_name != "" && highlight_link_name != null) {
        global_highlight_link = highlight_link_name;
    }
    // send new querys to server
    createPage(node_name);
}

function createPageFromChartEvent(from_date, to_date) {
    node_name = global_root_node

    from_month = from_date.getMonth() + 1
    if (from_month < 10)
        from_month = `0${from_month}`

    to_date.setMonth(to_date.getMonth() + 1)
    to_month = to_date.getMonth() + 1
    if (to_month < 10)
        to_month = `0${to_month}`



    start_date = `${from_month}/${from_date.getFullYear()}`
    end_date = `${to_month}/${to_date.getFullYear()}`

    createPage(node_name, start_date, end_date);

}

function filterTable(input_str) {
    var filter_str = ''
    if (input_str != undefined) {
        filter_str = input_str;
    }
    global_text_filter = filter_str;
    createTable(global_root_node, global_start_date, global_end_date, filter_str);
}

async function createPage(node_name, from_date, to_date, filter_str) {

    var filter = ''
    if (filter_str != undefined) {
        filter = filter_str;
    } else {
        filter = global_text_filter
    }

    var root_node = ''
    if (node_name != undefined) {
        root_node = node_name;
    } else {
        root_node = global_root_node
    }

    start_date = ''
    end_date = ''

    if (from_date != undefined) {
        start_date = from_date;
    } else {
        start_date = global_start_date

    }

    if (to_date != undefined) {
        end_date = to_date;
    } else {
        end_date = global_end_date
    }

    //console.log(`root node: ${root_node} - dates between ${start_date} & ${end_date}`)

    global_root_node = root_node;
    global_start_date = start_date
    global_end_date = end_date
    global_text_filter = filter
    //var start_date = $("#sandbox-container .input-daterange [name*='start']").val();
    //var end_date = $("#sandbox-container .input-daterange [name*='end']").val();

    await createSankey(root_node, start_date, end_date);
    await createTable(root_node, start_date, end_date, filter);
    await createStackedchart(root_node, start_date, end_date);
}