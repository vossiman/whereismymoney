async function createTable(root_node_name, start_date, end_date, filter_str) {
    // find date/time picker input       

    var getJsonStr = `?root_node=${root_node_name}&start_date=${start_date}&end_date=${end_date}&filter_str=${filter_str}`

    from_date = new Date('2050-12-31')
    to_date = new Date('2012-01-01')
    sum = 0
    
    $.getJSON("/table_data" + getJsonStr, async function (data) {
        $('table.table > tbody').empty();

        data.table.forEach(await async function(element, i)  {
            //get colors for pills/badges
            
            class1_color = findColor(element.class1, true)   
            class2_color = findColor(element.class2, true) 
            

            // calculate from & to date and sum up results
            newDate = new Date(element.date);
            if (from_date == '' || newDate.getTime() < from_date.getTime())
                from_date = newDate
            if (to_date == '' || newDate.getTime() > to_date.getTime())
                to_date = newDate
            
            sum += element.value         
            
            if (element.text=="repayment Roland Gaal") {
                console.log('repayment here')
            }
                    
            htmlStr = `<tr>
                            <td>${element.date}</td>
                            <td>${element.accountname}</td>
                            <td>${element.partnername}</td>
                            <td>${element.text}</td>
                            <td><span class="badge badge-pill badge-dark" style="background-color:${class1_color}">${element.class1}</span></td>
                            <td><span class="badge badge-pill badge-dark" style="background-color:${class2_color}">${element.class2}</span></td>
                            <td>${iterIntToFormatStr(element.value)}&nbsp;€</td>
                        </tr>`
                        //console.log(htmlStr) 
            row = $('table.table > tbody').append(htmlStr);
        });

       
       $('text.stat.start_date').text(from_date.austrianDate())
       $('text.stat.end_date').text(to_date.austrianDate())
       $('text.stat.sum_value').text(iterIntToFormatStr(sum))

    });
}