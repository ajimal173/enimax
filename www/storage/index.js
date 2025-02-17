var offlineDB;
let db;
let downloadedSqlite;
// @ts-ignore
offlineDB = new Dexie("database");
offlineDB.version(1.4).stores({
    vid: "++id,cur_time, ep, name,time1,time2,image,curlink,main_link,times,comp,parent_name",
    playlist: "++id,room_name",
    playlistOrder: "++id, order"
});
var downloadedDB;
// @ts-ignore
downloadedDB = new Dexie("downloaded");
downloadedDB.version(1.5).stores({
    vid: "++id,cur_time, ep, name,time1,time2,image,curlink,main_link,times,comp,parent_name",
    playlist: "++id,room_name",
    playlistOrder: "++id, order",
    keyValue: "++id, key, value"
});
let initQueries = [
    "CREATE TABLE IF NOT EXISTS `playlist` (`id` INTEGER PRIMARY KEY,`room_name` text NOT NULL)",
    "CREATE TABLE IF NOT EXISTS `playlistOrder` (`id` INTEGER PRIMARY KEY, `order1` text NOT NULL)",
    "CREATE TABLE IF NOT EXISTS `video` (`id` INTEGER PRIMARY KEY,`cur_time` float(12,3) NOT NULL,`ep` float(12,3) NOT NULL,`name` text NOT NULL,`time1` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,`time2` int DEFAULT NULL,`image` text,`curlink` text,`comp` int NOT NULL DEFAULT '0',`main_link` text,`times` int NOT NULL DEFAULT '0',`parent_name` text);",
    "CREATE INDEX IF NOT EXISTS video_idx_name ON video (name)",
    "ALTER TABLE `video` ADD `parent_name` text;"
];
async function batchInsert(command) {
    return new Promise(function (resolve, reject) {
        downloadedSqlite.sqlBatch(command, function () {
            resolve("Done!");
        }, function (error) {
            reject(error);
        });
    });
}
let actionDexie;
let actionSQLite;
async function dexieToSQLite() {
    alert("This may take a while. DO NOT EXIT this page until you receive a message that says that you can.");
    try {
        let currentDB = await downloadedDB.vid.toArray();
        let command = [
            initQueries[2]
        ];
        for (let i = 0; i < currentDB.length; i++) {
            let currentRow = currentDB[i];
            let fieldNames = [];
            let fieldValues = [];
            let questionMarks = [];
            let flag = false;
            for (const x in currentRow) {
                if (x == "id") {
                    continue;
                }
                flag = true;
                fieldNames.push(x);
                questionMarks.push("?");
                fieldValues.push(currentRow[x]);
            }
            if (flag) {
                fieldNames = fieldNames.join(",");
                questionMarks = questionMarks.join(",");
                command.push([`INSERT INTO video (${fieldNames}) VALUES (${questionMarks})`, fieldValues]);
            }
        }
        await batchInsert(command);
        currentDB = await downloadedDB.playlist.toArray();
        command = [
            initQueries[0]
        ];
        for (let i = 0; i < currentDB.length; i++) {
            let currentRow = currentDB[i];
            let fieldNames = [];
            let fieldValues = [];
            let questionMarks = [];
            let flag = false;
            for (const x in currentRow) {
                if (x == "id") {
                    continue;
                }
                flag = true;
                fieldNames.push(x);
                questionMarks.push("?");
                fieldValues.push(currentRow[x]);
            }
            if (flag) {
                fieldNames = fieldNames.join(",");
                questionMarks = questionMarks.join(",");
                command.push([`INSERT INTO playlist (${fieldNames}) VALUES (${questionMarks})`, fieldValues]);
            }
        }
        await batchInsert(command);
        alert("Done! You can now safely reload the page.");
        window.location.reload();
    }
    catch (err) {
        console.error(err);
        alert("Some unexpected error has occurred. Contact the developer.");
    }
}
function getDB() {
    return db;
}
let actions;
async function SQLInit() {
    // @ts-ignore
    db = window.parent.sqlitePlugin.openDatabase({
        name: 'data4.db',
        location: 'default',
    });
    for (let i = 0; i < initQueries.length; i++) {
        try {
            let temp = await mysql_query(initQueries[i], [], db);
        }
        catch (err) {
            console.error(err);
        }
    }
}
async function SQLInitDownloaded() {
    // @ts-ignore
    downloadedSqlite = window.parent.sqlitePlugin.openDatabase({
        name: 'downloaded.db',
        location: 'default',
    });
    for (let i = 0; i < initQueries.length; i++) {
        try {
            let temp = await mysql_query(initQueries[i], [], downloadedSqlite);
        }
        catch (err) {
            console.error(err);
        }
    }
}
async function mysql_query(command, inputs, currentDB, lastID = false) {
    return new Promise(function (resolve, reject) {
        try {
            currentDB.transaction(function (tx) {
                tx.executeSql(command, inputs, function (tx, rs) {
                    try {
                        if (lastID) {
                            resolve(rs);
                        }
                        else {
                            let result = [];
                            let temp = rs.rows;
                            for (let i = 0; i < temp.length; i++) {
                                result.push(temp.item(i));
                            }
                            resolve(result);
                        }
                    }
                    catch (err) {
                        reject(err);
                    }
                }, function (tx, error) {
                    reject(error);
                });
            }, function (error) {
                reject(error);
            }, function () {
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
let downloadedStorage = localStorage.getItem("offline") === 'true';
function timern() {
    return Math.floor((new Date()).getTime() / 1000);
}
function sendNoti(x) {
    return new notification(document.getElementById("noti_con"), {
        "perm": x[0],
        "color": x[1],
        "head": x[2],
        "notiData": x[3]
    });
}
function toFormData(x) {
    var form = new FormData();
    for (const value in x) {
        form.append(value, x[value]);
    }
    return form;
}
function makeRequest(method, url, form, timeout, shouldRedirect) {
    return new Promise(function (resolve, reject) {
        let formation = {};
        formation.method = method;
        if (method == "POST") {
            formation.body = toFormData(form);
        }
        if (token) {
            formation.headers = {};
            formation.headers["x-session"] = token;
        }
        let controller, timeoutId;
        if (timeout) {
            controller = new AbortController();
            timeoutId = setTimeout(() => {
                controller.abort();
            }, 3000);
            formation.signal = controller.signal;
        }
        fetch(url, formation).then(response => response.json()).then(function (x) {
            if (timeout) {
                clearTimeout(timeoutId);
            }
            if (x.status == 200) {
                resolve(x);
            }
            else if (shouldRedirect && "errorCode" in x && x["errorCode"] == 70001) {
                window.parent.postMessage({ "action": 21, data: "" }, "*");
                reject(new Error(x.message));
            }
            else {
                reject(new Error(x.message));
            }
        }).catch(function (error) {
            reject(new Error(error.message + " : " + url));
        });
    });
}
async function apiCall(method, form, callback, args = [], timeout = false, shouldRedirect = true) {
    try {
        let url = `${config.remote}/api`;
        let response;
        if (localStorage.getItem("offline") === 'true') {
            response = await actionSQLite[form.action]({ "body": form }, true);
        }
        else if (config.local) {
            if (config.chrome) {
                response = await actionDexie[form.action]({ "body": form });
            }
            else {
                response = await actionSQLite[form.action]({ "body": form });
            }
        }
        else {
            response = await makeRequest(method, url, form, timeout, shouldRedirect);
        }
        if (response.status == 200) {
            args.push(response);
            callback.apply(null, args);
        }
        else {
            sendNoti([2, null, "Alert", response.message]);
        }
        return response;
    }
    catch (err) {
        let isAbort = false;
        try {
            if (err.name == "AbortError") {
                isAbort = true;
            }
        }
        catch (err) {
        }
        if (!isAbort) {
            throw err;
            // sendNoti([2, null, "Alert", err]);
        }
    }
}
(function () {
    const updateTime = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("time" in req.body && "name" in req.body && "ep" in req.body) {
                var cur = req.body.time;
                var name = req.body.name;
                var ep = parseFloat(req.body.ep);
                let nameUm;
                if ("nameUm" in req.body) {
                    nameUm = req.body.nameUm;
                }
                else {
                    nameUm = req.body.name;
                }
                var getcount = await mysql_query("SELECT count(*) as count from video where ep=? and name=?", [ep, name], currentDB);
                if (getcount[0].count >= 1) {
                    var update = await mysql_query("UPDATE video set cur_time=?,time2=?, times=times+1 where ep=? and name=?", [cur, timern(), ep, name], currentDB);
                    let executed = false;
                    if ("prog" in req.body) {
                        let duration = parseInt(req.body.prog);
                        let current = parseInt(cur);
                        if (!isNaN(duration) && !isNaN(current) && duration != 0) {
                            await mysql_query("UPDATE video set time2=?, parent_name=? where ep=0 and name=?", [timern(), JSON.stringify([current, duration]), nameUm], currentDB);
                            executed = true;
                        }
                    }
                    if (!executed) {
                        await mysql_query("UPDATE video set time2=? where ep=0 and name=?", [timern(), nameUm], currentDB);
                    }
                }
                else {
                    var insert = await mysql_query("INSERT INTO video (ep,cur_time,name,time2) VALUES (?,?,?,?,?)", [ep, cur, name, timern()], currentDB);
                }
                return { "status": 200, "message": "done" };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getShowInfo = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("fallbackDuration" in req.body) {
                return getDurationInfo(req);
            }
            else if ("cur" in req.body && "name" in req.body && "ep" in req.body) {
                var cur = req.body.cur;
                var name = req.body.name;
                var nameUm;
                if ("nameUm" in req.body) {
                    nameUm = req.body.nameUm;
                }
                else {
                    nameUm = req.body.name;
                }
                var ep = parseFloat(req.body.ep);
                if (cur.toLowerCase().substring(0, 7) == "?watch=" && cur.toLowerCase().indexOf("javascript") == -1) {
                    var response = {};
                    var getdata = await mysql_query("SELECT cur_time as current, main_link as mainLink from video where ep=0 and name=? LIMIT 1", [nameUm], currentDB);
                    if (getdata.length == 0) {
                        await mysql_query("INSERT INTO video (ep,cur_time,name,curlink,time2) VALUES (0,?,?,?,?)", [ep, nameUm, cur, timern()], currentDB);
                    }
                    else {
                        response.mainLink = getdata[0].mainLink;
                    }
                    var getdata = await mysql_query("SELECT cur_time as curtime from video where ep=? and name=? LIMIT 1", [ep, name], currentDB);
                    if ("duration" in req.body && !isNaN(parseInt(req.body.duration))) {
                        let dur = parseInt(req.body.duration);
                        await mysql_query("UPDATE video set cur_time=?,curlink=?,time2=?,parent_name=? where name=? and ep=0", [ep, cur, timern(), JSON.stringify([getdata[0].curtime, dur]), nameUm], currentDB);
                    }
                    else {
                        await mysql_query("UPDATE video set cur_time=?,curlink=?,time2=?,parent_name=? where name=? and ep=0", [ep, cur, timern(), JSON.stringify([-1, -1]), nameUm], currentDB);
                    }
                    if ("duration" in req.body) {
                        let dur = parseInt(req.body.duration);
                        if (isNaN(dur)) {
                            return { "status": 400, "message": "Duration can't be NaN" };
                        }
                        else {
                            if (getdata.length != 0) {
                                await mysql_query("UPDATE video set comp=?, main_link=? where name=? and ep=?", [dur, cur, name, ep], currentDB);
                                await mysql_query("UPDATE video set parent_name=? where name=? and ep=? and parent_name is NULL", [nameUm, name, ep], currentDB);
                            }
                            else {
                                await mysql_query("INSERT INTO video (ep,cur_time,name,comp, main_link, parent_name) VALUES (?,?,?,?,?,?)", [ep, 0, name, dur, cur, nameUm], currentDB);
                            }
                        }
                    }
                    else {
                        if (getdata.length != 0) {
                            response.time = getdata[0].curtime;
                        }
                        else {
                            response.time = 0;
                            await mysql_query("INSERT INTO video (ep,cur_time,name) VALUES (?,?,?)", [ep, 0, name], currentDB);
                        }
                    }
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use this link" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getDurationInfo = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("name" in req.body) {
                let name = req.body.name;
                let getdata = await mysql_query("SELECT cur_time as curtime, comp as duration, main_link as name, ep from video where parent_name=?", [name], currentDB);
                return { "status": 200, "data": getdata };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (err) {
            console.error(err);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getUserInfo = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            var response = [
                [],
                [],
                []
            ];
            var getData = await mysql_query("SELECT DISTINCT(name) as b,cur_time as a,image,time2,curlink,comp,main_link,parent_name from video where ep=0  and curlink IS NOT NULL ORDER BY time2 DESC", [], currentDB);
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    let temp = [];
                    temp.push(getData[i]["b"], getData[i]["a"], getData[i]["image"], getData[i]["curlink"], getData[i]["comp"], getData[i]["main_link"], getData[i]["parent_name"]);
                    response[0].push(temp);
                }
            }
            var getData = await mysql_query("SELECT id,room_name FROM playlist", [], currentDB);
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    response[1].push(getData[i]["room_name"], getData[i]["id"]);
                }
            }
            var getData = await mysql_query("SELECT order1 FROM playlistOrder LIMIT 1", [], currentDB);
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    response[2] = [getData[i]["order1"]];
                }
            }
            return { "status": 200, "message": "done", "data": response };
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const updateImage = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("img" in req.body && "name" in req.body) {
                var name = req.body.name;
                var img = req.body.img;
                var main_link = "";
                if ("url" in req.body) {
                    main_link = req.body.url;
                }
                var response = {};
                if (img.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().substring(0, 7) == "?watch=") {
                    var getData = await mysql_query("SELECT image from video where ep=0 and name=? LIMIT 1", [name], currentDB);
                    if (getData.length == 0) {
                        await mysql_query("INSERT INTO video (ep,cur_time,name,image,main_link) VALUES (0,1,?,?,?)", [name, img, main_link], currentDB);
                    }
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use the keyword 'javascript' in the URL." };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const deleteShow = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("name" in req.body) {
                var name = req.body.name;
                var response = {};
                if (isDownloaded) {
                    try {
                        // @ts-ignore
                        await window.parent.removeDirectory(`${req.body.isManga === true ? "manga/" : ""}${name}`);
                    }
                    catch (err) {
                        alert("Could not delete the files. You have to manually delete it by going to the show's page.");
                    }
                }
                await mysql_query("DELETE FROM video where ep=0 and name=?", [name], currentDB);
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeState = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("state" in req.body && "name" in req.body && !isNaN(parseInt(req.body.state))) {
                var state = parseInt(req.body.state);
                var name = req.body.name;
                await mysql_query("UPDATE video SET comp=? where ep=0 and name=?", [state, name], currentDB);
                var response = {};
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const updateImageManual = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("img" in req.body && "name" in req.body) {
                var img = req.body.img;
                var name = req.body.name;
                var response = {};
                if (img.toLowerCase().indexOf("javascript") == -1) {
                    await mysql_query("UPDATE video set image=? where name=? and ep=0", [img, name], currentDB);
                    response.image = img;
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't have the keyword 'javascript' in the url." };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const addRoom = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("room" in req.body) {
                var room_name = req.body.room;
                let getData = await mysql_query("INSERT INTO playlist (room_name) VALUES (?)", [room_name], currentDB, true);
                var response = {};
                response.lastId = getData.insertId;
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const deleteRoom = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("id" in req.body && !isNaN(parseInt(req.body.id))) {
                var id_room = parseInt(req.body.id);
                await mysql_query("DELETE FROM playlist where id=?", [id_room], currentDB);
                var response = {};
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeOrder = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("order" in req.body) {
                var order = req.body.order;
                order = order.split(",");
                var check = 0;
                for (var i = 0; i < order.length; i++) {
                    if (isNaN(parseInt(order[i]))) {
                        check = 1;
                        break;
                    }
                }
                var response = {};
                if (check == 0) {
                    await mysql_query("INSERT INTO playlistOrder (id,order1) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET order1=?", ["0", req.body.order, req.body.order], currentDB);
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "Bad request" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeMainLink = async function (req, isDownloaded) {
        let currentDB = db;
        if (isDownloaded) {
            currentDB = downloadedSqlite;
        }
        try {
            if ("url" in req.body && "name" in req.body) {
                var main_link = req.body.url;
                var name = req.body.name;
                var response = {};
                if (main_link.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().substring(0, 7) == "?watch=") {
                    await mysql_query("UPDATE video set main_link=? where name=? and ep=0", [main_link, name], currentDB);
                    response.url = main_link;
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use the keyword 'javascript' in the URL. Also, you have to start the url with '?watch='" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    actionSQLite = {
        1: updateTime,
        2: getShowInfo,
        4: getUserInfo,
        5: updateImage,
        6: deleteShow,
        7: changeState,
        9: updateImageManual,
        10: addRoom,
        12: deleteRoom,
        13: changeOrder,
        14: changeMainLink
    };
})();
(function () {
    const updateTime = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("time" in req.body && "name" in req.body && "ep" in req.body) {
                var cur = req.body.time;
                var name = req.body.name;
                var ep = parseFloat(req.body.ep);
                let nameUm;
                if ("nameUm" in req.body) {
                    nameUm = req.body.nameUm;
                }
                else {
                    nameUm = req.body.name;
                }
                var count = await db.vid.filter((data) => (data.ep == ep && data.name == name)).count();
                if (count >= 1) {
                    await db.vid.where({ ep: ep, name: name }).modify({ cur_time: cur, time2: timern() });
                    let executed = false;
                    if ("prog" in req.body) {
                        let duration = parseInt(req.body.prog);
                        let current = parseInt(cur);
                        if (!isNaN(duration) && !isNaN(current) && duration != 0) {
                            await db.vid.where({ ep: 0, name: nameUm }).modify({ time2: timern(), parent_name: JSON.stringify([current, duration]) });
                            executed = true;
                        }
                    }
                    if (!executed) {
                        await db.vid.where({ ep: 0, name: nameUm }).modify({ time2: timern() });
                    }
                }
                else {
                    await db.vid.add({ ep: ep, cur_time: cur, name: name, time2: timern() });
                }
                return { "status": 200, "message": "done" };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getShowInfo = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("fallbackDuration" in req.body) {
                return getDurationInfo(req);
            }
            else if ("cur" in req.body && "name" in req.body && "ep" in req.body) {
                var cur = req.body.cur;
                var name = req.body.name;
                var nameUm;
                if ("nameUm" in req.body) {
                    nameUm = req.body.nameUm;
                }
                else {
                    nameUm = req.body.name;
                }
                var ep = parseFloat(req.body.ep);
                if (cur.toLowerCase().substring(0, 7) == "?watch=" && cur.toLowerCase().indexOf("javascript") == -1) {
                    var response = {};
                    let getdata = await db.vid.filter((data) => (data.ep == 0 && data.name == nameUm)).toArray();
                    if (getdata.length == 0) {
                        await db.vid.add({ ep: 0, cur_time: ep, name: nameUm, curlink: cur, time2: timern() });
                    }
                    else {
                        response.mainLink = getdata[0].main_link;
                    }
                    getdata = await db.vid.where({
                        ep: ep,
                        name: name
                    }).toArray();
                    if ("duration" in req.body && !isNaN(parseInt(req.body.duration))) {
                        let dur = parseInt(req.body.duration);
                        await db.vid.where({ ep: 0, name: nameUm }).modify({ cur_time: ep, curlink: cur, time2: timern(), parent_name: JSON.stringify([getdata[0].cur_time, dur]) });
                    }
                    else {
                        await db.vid.where({ ep: 0, name: nameUm }).modify({ cur_time: ep, curlink: cur, time2: timern(), parent_name: JSON.stringify([-1, -1]) });
                    }
                    if ("duration" in req.body) {
                        let dur = parseInt(req.body.duration);
                        if (isNaN(dur)) {
                            return { "status": 400, "message": "Duration can't be NaN" };
                        }
                        else {
                            if (getdata.length != 0) {
                                await db.vid.where({ ep: ep, name: name }).modify({ comp: dur, main_link: cur });
                                await db.vid.where({ ep: ep, name: name }).modify({ parent_name: nameUm });
                            }
                            else {
                                await db.vid.add({ ep: ep, cur_time: 0, name: name, comp: dur, main_link: cur, parent_name: nameUm });
                            }
                        }
                    }
                    else {
                        if (getdata.length != 0) {
                            response.time = getdata[0].cur_time;
                        }
                        else {
                            response.time = 0;
                            await db.vid.add({ ep: ep, cur_time: 0, name: name });
                        }
                    }
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use this link" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getDurationInfo = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("name" in req.body) {
                let name = req.body.name;
                let getdata = await db.vid.where({
                    "parent_name": name
                }).toArray();
                return { "status": 200, "data": getdata, "dexie": true };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (err) {
            console.error(err);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const getUserInfo = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            var response = [
                [],
                [],
                []
            ];
            var getData = await db.vid.filter((data) => ("curlink" in data &&
                data.ep == 0)).reverse().sortBy('time2');
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    if (!("comp" in getData[i])) {
                        getData[i]["comp"] = 0;
                    }
                    let temp = [];
                    temp.push(getData[i]["name"], getData[i]["cur_time"], getData[i]["image"], getData[i]["curlink"], getData[i]["comp"], getData[i]["main_link"], getData[i]["parent_name"]);
                    response[0].push(temp);
                }
            }
            getData = await db.playlist.filter((data) => (true)).toArray();
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    response[1].push(getData[i]["room_name"], getData[i]["id"]);
                }
            }
            getData = await db.playlistOrder.limit(1).filter((data) => (true)).toArray();
            if (getData.length > 0) {
                for (var i = 0; i < getData.length; i++) {
                    response[2] = [getData[i]["order"]];
                }
            }
            return { "status": 200, "message": "done", "data": response };
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const updateImage = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("img" in req.body && "name" in req.body) {
                var name = req.body.name;
                var img = req.body.img;
                var main_link = "";
                if ("url" in req.body) {
                    main_link = req.body.url;
                }
                var response = {};
                if (img.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().substring(0, 7) == "?watch=") {
                    let getData = await db.vid.where({
                        ep: 0,
                        name: name
                    }).toArray();
                    if (getData.length == 0) {
                        await db.vid.add({
                            "ep": 0,
                            "cur_time": 1,
                            "name": name,
                            "image": img,
                            "main_link": main_link
                        });
                    }
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use the keyword 'javascript' in the URL." };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const deleteShow = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("name" in req.body) {
                var name = req.body.name;
                var response = {};
                if (db == downloadedDB) {
                    try {
                        // @ts-ignore
                        await window.parent.removeDirectory(`${name}`);
                    }
                    catch (err) {
                        alert("Could not delete the files. You have to manually delete it by going to the show's page.");
                    }
                }
                await db.vid.filter((x) => (x.ep == 0 &&
                    x.name == name)).delete();
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeState = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("state" in req.body && "name" in req.body && !isNaN(parseInt(req.body.state))) {
                var state = parseInt(req.body.state);
                var name = req.body.name;
                await db.vid.where({
                    ep: 0,
                    name: name
                }).modify({
                    comp: state
                });
                var response = {};
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const updateImageManual = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("img" in req.body && "name" in req.body) {
                var img = req.body.img;
                var name = req.body.name;
                var response = {};
                if (img.toLowerCase().indexOf("javascript") == -1) {
                    await db.vid.where({
                        name: name,
                        ep: 0
                    }).modify({
                        image: img
                    });
                    response.image = img;
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't have the keyword 'javascript' in the url." };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const addRoom = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("room" in req.body) {
                var room_name = req.body.room;
                let lastId = await db.playlist.add({ room_name });
                var response = {};
                response.lastId = lastId;
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const deleteRoom = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("id" in req.body && !isNaN(parseInt(req.body.id))) {
                var id_room = parseInt(req.body.id);
                await db.playlist.delete(id_room);
                var response = {};
                return { "status": 200, "message": "done", "data": response };
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeOrder = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("order" in req.body) {
                var order = req.body.order;
                order = order.split(",");
                var check = 0;
                for (var i = 0; i < order.length; i++) {
                    if (isNaN(parseInt(order[i]))) {
                        check = 1;
                        break;
                    }
                }
                var response = {};
                if (check == 0) {
                    db.playlistOrder.put({ "id": 0, "order": req.body.order });
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "Bad request" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    const changeMainLink = async function (req, offline = true) {
        let db = offlineDB;
        if (!offline || downloadedStorage) {
            db = downloadedDB;
        }
        try {
            if ("url" in req.body && "name" in req.body) {
                var main_link = req.body.url;
                var name = req.body.name;
                var response = {};
                if (main_link.toLowerCase().indexOf("javascript") == -1 && main_link.toLowerCase().substring(0, 7) == "?watch=") {
                    await db.vid.where({
                        name: name,
                        ep: 0
                    }).modify({
                        main_link: main_link
                    });
                    response.url = main_link;
                    return { "status": 200, "message": "done", "data": response };
                }
                else {
                    return { "status": 400, "message": "You can't use the keyword 'javascript' in the URL. Also, you have to start the url with '?watch='" };
                }
            }
            else {
                return { "status": 400, "message": "Bad request" };
            }
        }
        catch (error) {
            console.error(error);
            return { "status": 500, "errorCode": 10000, "message": "Database error." };
        }
    };
    actionDexie = {
        1: updateTime,
        2: getShowInfo,
        4: getUserInfo,
        5: updateImage,
        6: deleteShow,
        7: changeState,
        9: updateImageManual,
        10: addRoom,
        12: deleteRoom,
        13: changeOrder,
        14: changeMainLink
    };
})();
