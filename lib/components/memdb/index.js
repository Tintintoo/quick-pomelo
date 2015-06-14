'use strict';

var path = require('path');
var requireChildren = require('../../utils/require-children');
var memdb = require('memdb-client');
var P = memdb.Promise;
var logger = memdb.logger.getLogger('memdb-client', __filename);

var DEFAULT_MODELS_PATH = 'app/models';

var MemDB = function(app, opts){
    this.app = app;
    this.config = app.get('memdbConfig') || opts || {};
    this.config.modelsPath = this.config.modelsPath || DEFAULT_MODELS_PATH;
};

var proto = MemDB.prototype;

proto.name = 'memdb';

proto.start = function(cb){
    return P.bind(this)
    .then(function(){
        var basePath = path.join(this.app.getBase(), this.config.modelsPath);
        return this.loadModels(basePath);
    })
    .then(function(){
        return this.goose.connect(this.config);
    })
    .nodeify(cb);
};

proto.stop = function(force, cb){
    this.unregisterModels();

    return P.bind(this)
    .then(function(){
        return this.goose.disconnect();
    })
    .nodeify(cb);
};

proto.loadModels = function(basePath){
    var modules = requireChildren(module, basePath);

    var self = this;
    Object.keys(modules).forEach(function(name){
        modules[name](self.app);
    });

    var mdbgoose = this.goose;
    for(var name in mdbgoose.models){
        this.app.models[name] = mdbgoose.model(name);
    }
};

// Unregister mongoose models
// WARN: It is not a official supported behavier
proto.unregisterModels = function(){
    var models = this.goose.connection.models;
    Object.keys(models).forEach(function(name){
        delete models[name];
    });
};

Object.defineProperty(proto, 'goose', {
    get : function(){
        return memdb.goose;
    }
});

module.exports = function(app, opts){
    var db = new MemDB(app, opts);
    app.set(db.name, db, true);
    app.set('models', {}, true);
    return db;
};