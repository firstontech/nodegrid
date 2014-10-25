/**
 * Created by kavi707 on 9/6/14.
 * @author Kavimal Wijewardana <kavi707@gmail.com>
 */

var logger = require('../utils/log');
var mongo_connection = require('../utils/mongoose_connection');
var connectionObj = mongo_connection.createMongooseConnection();
var bCrypt = require('bcrypt-nodejs');

//Reading the config file
var fs = require('fs');
var configurations = JSON.parse(fs.readFileSync('config.json', encoding="ascii"));

var mongoose = connectionObj.mongooseObj;
var entity = connectionObj.entityObj;

module.exports.createNewSystemUser = function (req, res) {

    //create collection object for system_users
    var system_users = mongoose.model(configurations.USERS_TABLE, entity);

    // name validation
    if (req.body.name != null) {
        var name = req.body.name;

        // username validation
        if (req.body.username != null) {
            var username = req.body.username;

            /******* check relation existance ********/
            var checkSystemUserCollection = mongoose.model(configurations.USERS_TABLE, entity);
            checkSystemUserCollection.find({"data.username": username}, function (systemUserExistenceErr, systemUserRecord) {
                if (systemUserExistenceErr) {
                    logger.info("NodeGrid:system_db_callings/createNewSystemUser - Error occurred at system_users database check. ERROR: " + systemUserExistenceErr);
                    res.send("Error occurred at system_users entity database check: " + systemUserExistenceErr);
                } else {
                    if (systemUserRecord.length == 0) {
                        // password validation
                        if (req.body.password) {
                            var password = bCrypt.hashSync(req.body.password);
                            var currentTimestamp = Math.round((new Date()).getTime() / 1000);

                            var dbObject = {
                                "name": name,
                                "username": username,
                                "password": password,
                                "createdTime": currentTimestamp,
                                "lastAccessedTime": ""
                            };

                            logger.info("NodeGrid:system_db_callings/createNewSystemUser - Created database OBJECT: " + JSON.stringify(dbObject));
                            var newEntry = new system_users({data: dbObject});
                            newEntry.save(function (err, savedUser) {
                                if (err) {
                                    logger.info("NodeGrid:system_db_callings/createNewSystemUser - Error occurred at database insertion. ERROR: " + err);
                                    res.send("Error occurred at database insertion: " + err);
                                } else {
                                    logger.info("NodeGrid:system_db_callings/createNewSystemUser - New system user added successfully. OBJECT: " + savedUser);
                                    res.send(savedUser);
                                }
                            });
                        } else {
                            logger.info("NodeGrid:system_db_callings/createNewSystemUser - User's [password] can't be empty.");
                            res.send("User's [password] can't be empty.");
                        }
                    } else {
                        logger.info("NodeGrid:system_db_callings/createNewSystemUser - Given [username] is already exists");
                        res.send("Given [username] is already exists");
                    }
                }
            });
        } else {
            logger.info("NodeGrid:system_db_callings/createNewSystemUser - User's [username] can't be empty.");
            res.send("User's [username] can't be empty.");
        }
    } else {
        logger.info("NodeGrid:system_db_callings/createNewSystemUser - User's [name] can't be empty.");
        res.send("User's [name] can't be empty.");
    }
};

module.exports.getSystemUser = function (userData, endPoint, callback) {

    //create collection object for system_users
    var system_users = mongoose.model(configurations.USERS_TABLE, entity);

    if (endPoint.toString() === 'USER_ID') {

        system_users.find({"_id": userData}, function (systemUserExistenceErr, systemUserRecord) {
            if (systemUserExistenceErr) {
                logger.info("NodeGrid:system_db_callings/getSystemUser - Error occurred at system_users database check. ERROR: " + systemUserExistenceErr);
                callback(0, "Error occurred at system_users entity database check: " + systemUserExistenceErr);
            } else {
                if (systemUserRecord.length != 0) {
                    logger.info("NodeGrid:system_db_callings/getSystemUser - Successfully data captured");
                    callback(1, systemUserRecord);
                } else {
                    logger.info("NodeGrid:system_db_callings/getSystemUser - No records found from given system userId");
                    callback(0, "No records found from given system userId");
                }
            }
        });
    } else {
        if (endPoint.toString() === 'USERNAME') {

            system_users.find({"data.username": userData}, function (systemUserExistenceErr, systemUserRecord) {
                if (systemUserExistenceErr) {
                    logger.info("NodeGrid:system_db_callings/getSystemUser - Error occurred at system_users database check. ERROR: " + systemUserExistenceErr);
                    callback(0, "Error occurred at system_users entity database check: " + systemUserExistenceErr);
                } else {
                    if (systemUserRecord.length != 0) {
                        logger.info("NodeGrid:system_db_callings/getSystemUser - Successfully data captured");
                        callback(1, systemUserRecord)
                    } else {
                        logger.info("NodeGrid:system_db_callings/getSystemUser - No records found from given system username");
                        callback(0, "No records found from given system username");
                    }
                }
            });
        }
    }

};

module.exports.removeSystemUser = function (req, res) {

    //create collection object for system_users
    var system_users = mongoose.model(configurations.USERS_TABLE, entity);

    var userId = req.params.userId;

    system_users.remove({"_id": userId}, function (systemUserExistenceErr, systemUserDelete) {
        if (systemUserExistenceErr) {
            logger.info("NodeGrid:system_db_callings/removeSystemUser - Error occurred at system_users database check. ERROR: " + systemUserExistenceErr);
            res.send("Error occurred at system_users entity database check: " + systemUserExistenceErr);
        } else {
            logger.info("NodeGrid:system_db_callings/removeSystemUser - System user removed from the collection successfully. STATUS: " + systemUserDelete);
            res.send("System user removed from the collection successfully. STATUS: " + systemUserDelete);
        }
    });
};

module.exports.saveNewToken = function (tokenObj, callback) {

    //create collection object for tokens
    var tokens = mongoose.model(configurations.TOKEN_TABLE, entity);

    var newEntity = new tokens({ data: tokenObj });
    newEntity.save(function (err, savedToken) {
        if (err) {
            logger.info("NodeGrid:system_db_callings/saveNewToken - New token adding failed. ERROR: " + err);
            callback(err);
        } else {
            logger.info("NodeGrid:system_db_callings/saveNewToken - New token added successfully. OBJECT: " + JSON.stringify(savedToken));
            callback(savedToken);
        }
    });
};

module.exports.updateExpiredToken = function (oldTokenObject, newAccessToken, newCreatedTime, callback) {

    var newTokenObject = oldTokenObject;
    newTokenObject.data.accessToken = newAccessToken;
    newTokenObject.data.createdTime = newCreatedTime;
    newTokenObject.data.expiringTime = newCreatedTime + (3600 * 24);

    updateTokenObject(newTokenObject, "valid", function (status, response) {
        if (status == 1) {
            logger.info("NodeGrid:system_db_callings/updateExpiredToken - AccessToken updated successfully. OBJECT: " + JSON.stringify(response));
            callback("AccessToken updated successfully. OBJECT: " + JSON.stringify(response));
        } else {
            logger.info("NodeGrid:system_db_callings/updateExpiredToken - AccessToken object updating failed. ERROR: " + response);
            callback("AccessToken object updating failed. ERROR: " + response);
        }
    });
};

module.exports.checkTokenExistence = function (userId, callback) {

    //create collection object for tokens
    var tokens = mongoose.model(configurations.TOKEN_TABLE, entity);
    tokens.find({"data.userId": userId}, function (tokenExistenceErr, tokenRecord) {
        if (tokenExistenceErr) {
            logger.info("NodeGrid:system_db_callings/checkTokenExistence - Error occurred at tokens database check. ERROR: " + tokenExistenceErr);
            callback(0, "Error occurred at tokens entity database check: " + tokenExistenceErr);
        } else {
            if (tokenRecord.length == 0) {
                logger.info("NodeGrid:system_db_callings/checkTokenExistence - No created tokens");
                callback(1, "no created tokens");
            } else {
                if (tokenRecord[0].data.status == 'expired') {
                    logger.info("NodeGrid:system_db_callings/checkTokenExistence - Token expired");
                    callback(2, tokenRecord)
                } else {
                    logger.info("NodeGrid:system_db_callings/checkTokenExistence - Valid token already exist for given userId");
                    callback(0, tokenRecord);
                }
            }
        }
    });
};

module.exports.checkTokenValidity = function (accessToken, callback) {

    var currentTimestamp = Math.round((new Date()).getTime() / 1000);

    //create collection object for tokens
    var tokens = mongoose.model(configurations.TOKEN_TABLE, entity);
    tokens.find({"data.accessToken": accessToken, "data.status": "valid"}, function (tokenExistenceErr, tokenRecord) {
        if (tokenExistenceErr) {
            logger.info("NodeGrid:system_db_callings/checkTokenValidity - Error occurred at tokens database check. ERROR: " + tokenExistenceErr);
            callback(0, "Error occurred at tokens entity database check: " + tokenExistenceErr);
        } else {
            if (tokenRecord.length != 0) {

                var tokenExpiringTime = tokenRecord[0].data.expiringTime;
                if (tokenExpiringTime > currentTimestamp) {
                    callback(1, JSON.stringify(tokenRecord));
                } else {
                    updateTokenObject(tokenRecord[0], "expired", function (status, response) {
                        if (status == 1) {
                            callback(3, "Given token is expired. OBJECT: " + JSON.stringify(response));
                        } else {
                            callback(3, "Given token is expired. Token object updating failed. ERROR: " + response);
                        }
                    });
                }
            } else {
                callback(2, "No records from given token");
            }
        }
    });
};

function updateTokenObject(tokenRecord, status, callback) {

    //create collection object for tokens
    var tokens = mongoose.model(configurations.TOKEN_TABLE, entity);

    var tokenObjectId = tokenRecord._id;
    var tokenObject = tokenRecord;
    tokenObject.data.status = status;

    //TODO: New object is created, need to update the object in the database
    tokens.remove({"_id": tokenObjectId}, function (tokenRemoveErr, tokenDelete) {
        if (tokenRemoveErr) {
            logger.info("NodeGrid:system_db_callings/updateTokenObject - Error occurred at token database check. ERROR: " + tokenRemoveErr);
        } else {
            var newEntity = new tokens(tokenObject);
            newEntity.save(function (err, savedToken) {
                if (err) {
                    logger.info("NodeGrid:system_db_callings/updateTokenObject - Token update failed. ERROR: " + err);
                    callback(0, err);
                } else {
                    logger.info("NodeGrid:system_db_callings/updateTokenObject - Token updated successfully. OBJECT: " + JSON.stringify(savedToken));
                    callback(1, savedToken);
                }
            });
        }
    });
}