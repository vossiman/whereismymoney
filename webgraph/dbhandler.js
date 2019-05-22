'use strict';

var sqlite3 = require('sqlite3');

module.exports = class dbhandler {

    constructor(db_file_link) {
        this.db_file_link = db_file_link;
        this.db_con = new sqlite3.Database(db_file_link);
    }

    getAsync(sql) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.db_con.get(sql, function (err, row) {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }

    allAsync(sql) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.db_con.all(sql, function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }

    async queryToJSON(sql) {
        var rows = await this.allAsync(sql);
        return rows;
    };
}