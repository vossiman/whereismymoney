var express = require('express');
var app = express();
app.use(express.json());

var path = require('path');

var dbhandler = require('./dbhandler.js');
var dbh = new dbhandler('../db/statements_live.db');



const no_category = 'No category'
const const_root_node_name = 'spent'
const const_empty_class1 = 'No category lvl1'
const const_empty_class2 = 'No category lvl2'

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
}

function monthDiff(d1, d2) {
  var months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth() + 1;
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
}



async function getGraphData(mode, request) {
  result = {};

  var sql = buildSQL(mode, request);

  sqlresult = await dbh.queryToJSON(sql);

  var highest_date = null;
  var lowest_date = null;

  columns = [];

  sqlresult.forEach(row => {
    // get highest & lowest date
    // handle dates
    found_date = new Date(`${row.dat_year}-${row.dat_month}-01`);
    if (highest_date == null || highest_date.getTime() < found_date.getTime()) {
      highest_date = found_date;
    }
    if (lowest_date == null || lowest_date.getTime() > found_date.getTime()) {
      lowest_date = found_date;
    }

    // remember all possible classes as column names
    if (columns.indexOf(row.Class) < 0)
      columns.push(row.Class);

  });
  // we always want to show at least one month 
  month_diff = 1
  if (lowest_date != null && highest_date != null)
    month_diff = monthDiff(lowest_date, highest_date) + 2; // difference + starting + ending month
  else // we cancel and return empty if there is no data found
    return {}

  result_arr = []

  //console.log(`${month_diff} --- ${lowest_date} ---- ${highest_date}`)

  iterate_date = lowest_date

  highest_period_value = 0;
  for (i = 0; i < month_diff; i++) {
    period_value = 0;

    new_line = new Object({
      'date': iterate_date
    });

    // iterate through the columns    
    columns.forEach(column => {
      // find the exact entry in the DB result to match back to find value
      found_obj = sqlresult.find(row => {
        if (row.Class == column && parseInt(row.dat_year) == parseInt(iterate_date.getFullYear()) && parseInt(row.dat_month) == parseInt(iterate_date.getMonth() + 1)) {
          return row.value;
        }
      });
      value = 0;
      if (found_obj != undefined)
        value = found_obj.value;
      new_line[column] = value;
      period_value += value;
    });

    // push the objet
    result_arr.push(new_line);

    // and up the iterate date
    iterate_date = new Date(iterate_date.getTime());
    iterate_date.setMonth(iterate_date.getMonth() + 1);

    // if this periods value is the new highscore, we use it
    if (period_value > highest_period_value)
      highest_period_value = period_value;
  }

  result.chart_data = result_arr;
  result.columns = columns;
  result.highest_period_value = highest_period_value;
  result.period_count = month_diff + 1;

  // cummulative sum up the result

  return result;
}

/*
SELECT ifnull(Class1, 'Uncategorized') as Class, dat_year, substr('00'||dat_month,-2) as dat_month, CAST(ABS(Sum(Value)) as INT) as value
              FROM Statements
              WHERE ((OWN_TRANSFER is null) 
              OR (OWN_TRANSFER <= 0))
              AND Value < 0
              GROUP BY Class1, dat_year, dat_month            
              ORDER BY Class1`;
*/

function buildSQL(mode, request) {
  var root_node = request.root_node;

  var select_criteria = '';
  var from_inner_join_accounts=''
  var whereclause_class_filter = ''
  var whereclause_date_filter = ''
  var whereclause_text_filter = ''
  var group_by_class = ''
  var order_by = ''
  var limit_clause = ''

  // ########################## MODE SPECIFIC SELECT AND GROUP BY
  switch (mode) {
    case 'sankey':
      select_criteria = `select ifnull(Class1, 'No category lvl1') as source, ifnull(Class2, 'No category lvl2') as target,
                         CAST(ABS(Sum(Value)) as INT) as value`;
      group_by_class = `GROUP BY 1, 2`;
      order_by = `ORDER BY value DESC`;
      break;
    case 'table':
      select_criteria = ` select ifnull(Class1, 'No category lvl1') as Class1, ifnull(Class2, 'No category lvl2') as Class2,
                          CAST(ABS(Value) as INT) as value, Partnername, text, date_full as date, Accounts.Name as Accountname`;
      from_inner_join_accounts = `INNER JOIN Accounts on Statements.ID_Account = Accounts.ID_Account`
      limit_clause = `LIMIT 200`;
      order_by = `ORDER BY value DESC`;
      break;
    case 'graph':
      // based on the user input, we want lvl 1 or lvl2 category filtered accessed
      var class_nr = 1;
      if (root_node != 'spent' && root_node != null && root_node != undefined && root_node != '')
      {
        class_nr = 2;
        // additional filter on this Class1 choice
      }
        
      select_criteria = `SELECT ifnull(Class${class_nr}, 'No category lvl${class_nr}') as Class, dat_year, substr('00'||dat_month,-2) as dat_month, CAST(ABS(Sum(Value)) as INT) as value`;
      limit_clause = ``;
      group_by_class = `GROUP BY Class${class_nr}, dat_year, dat_month`;
      order_by = `ORDER BY Class${class_nr}`;

      break;

  }

  // ########################## GENERIC FILTERS
  if (request != undefined) {
    // #########
    // # 1 FILTER FOR CATEGORIES / CLASSES
    // #########
    root_node = request.root_node;
    // check if root node was hit
    if (root_node != "" && root_node != undefined && root_node.length < 50 && root_node != const_root_node_name) {
      //check if any undefined classes were hit
      if (root_node == const_empty_class1) {
        whereclause_class_filter = `AND (Class1 is null)`;
      } else if (root_node == const_empty_class2) {
        whereclause_class_filter = `AND (Class2 is null)`;
      } else {
        whereclause_class_filter = `AND (Class1 = '${root_node}' OR Class2 = '${root_node}')`;
      }
    }
    // #########
    // # 2 FILTER TIME BASED
    // #########

      if (request.start_date != undefined && request.end_date != undefined && request.start_date != "" && request.end_date != "" && request.start_date != request.end_date) {
        date_s_arr = request.start_date.split('/');
        date_e_arr = request.end_date.split('/');
        whereclause_date_filter = `AND date(date_full) BETWEEN date('${date_s_arr[1]}-${date_s_arr[0]}-01') AND date('${date_e_arr[1]}-${date_e_arr[0]}-01')`
      }

      if (request.filter_str != undefined && request.filter_str != '') {
        whereclause_text_filter = `AND (Partnername LIKE '%${request.filter_str}%' OR text LIKE '%${request.filter_str}%')`
      }
  }

  var sql = ` ${select_criteria}
              from Statements ${from_inner_join_accounts}
              WHERE ((OWN_TRANSFER is null) 
              OR (OWN_TRANSFER <= 0))
              AND Value < 0
              ${whereclause_class_filter}
              ${whereclause_date_filter}  
              ${whereclause_text_filter}            
              ${group_by_class}
              ${order_by}
              ${limit_clause}`;

  return sql;
}

async function readFromDB(mode, request) {
  sql = buildSQL(mode, request);
  //console.log(`used SQL\n${sql}`);
  rows = await dbh.allAsync(sql);
  rowCount = rows.length;
  var returnObj = {}

  switch (mode) {
    case 'sankey':
      var db_result = [];
      for (i = 0; i < rowCount; i++) {
        var new_entry = {
          'source': rows[i].source,
          'target': rows[i].target,
          'value': rows[i].value
        };
        db_result.push(new_entry);
      }

      var sankey = {};
      sankey.nodes = createNodes(db_result);
      sankey.links = createLinks(sankey.nodes, db_result);
      returnObj = sankey;
      break;
    case 'table':
    //console.log(sql);
      var table = []
      for (i = 0; i < rowCount; i++) {
        var row = {
          'date': rows[i].date,
          'text': rows[i].text,
          'partnername': rows[i].Partnername,
          'value': rows[i].value,
          'class1' : rows[i].Class1,
          'class2' : rows[i].Class2,
          'accountname' : rows[i].Accountname
        };
        table.push(row);
      }
      returnObj = {
        table
      }
      break;
  }

  return returnObj;
}

function createNodes(db_result) {

  var nodes = [{
    "name": const_root_node_name
  }];

  db_result.forEach(function (d) {
    if (d.source == undefined)
      d.source = no_category
    if (d.target == undefined) {
      d.target = no_category
    }
    nodes.push({
      "name": d.source
    });
    nodes.push({
      "name": d.target
    });
  });

  var obj = {};

  for (var i = 0, len = nodes.length; i < len; i++)
    obj[nodes[i]['name']] = nodes[i];

  new_nodes = new Array();
  for (var key in obj)
    new_nodes.push(obj[key]);

  var countNodes = new_nodes.length;
  for (var i = 0; i < countNodes; i++) {
    new_nodes[i].node = i;
  }

  return new_nodes;
}

function createLinks(nodes, links) {
  var new_links = []

  // add root links from income
  var src_index = 0;

  var links_copy = links.map(function (link) {
    // create root node entries           
    var link_id = nodes.map(e => e.name).indexOf(link.source);
    var obj = {
      source: 0,
      target: link_id,
      value: link.value
    };
    return obj;
  });
  //.filter(unique);
  // console.log('---------------------------------------------------------------------');
  // console.log('links_copy', links_copy);

  var links_root_unique = [];
  links_copy.forEach(function (link, i) {
    var node_in_list = links_root_unique.map(e => e.target).indexOf(link.target);
    //console.log('node ', link.target, ' - ', 'node_in_list ', node_in_list);
    if (node_in_list < 0) {
      if (link.target > 0)
        links_root_unique.push({
          source: 0,
          target: link.target,
          value: link.value
        });
    } else {
      links_root_unique.filter(function (x) {
        if (x.target == link.target)
          x.value += link.value;
        return x;
      });
    }
  });
  //console.log('---------------------------------------------------------------------');
  //console.log('links_root_unique ', links_root_unique);

  links_root_unique.forEach(function (d, i) {
    new_links.push({
      'source': d.source,
      'target': d.target,
      'value': d.value
    })
  });

  // add links based on sql query   
  links.forEach(function (d, i) {
    //console.log((links[i].source),' --> ', (links[i].target), ' = ',links[i].value);
    var src_index = nodes.map(e => e.name).indexOf(links[i].source);
    var tgt_index = nodes.map(e => e.name).indexOf(links[i].target);
    new_links.push({
      'source': src_index,
      'target': tgt_index,
      'value': links[i].value
    })

  });
  return new_links;
}


app.post('/sankey_data', async (req, res, next) => {
  const json_obj = await readFromDB('sankey', req.body);
  res.json(json_obj);
});

app.get('/table_data', async (req, res, next) => {
  console.log(req.query)
  const json_obj = await readFromDB('table', req.query);
  res.json(json_obj);
});

app.get('/graph_data', async (req, res, next) => {
  const json_obj = await getGraphData('graph', req.query);
  res.json(json_obj);
});


app.get('/', function (req, res) {
  res.redirect('index.html');
});

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname + '/client' + req.url));
});

const server = app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  server.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}