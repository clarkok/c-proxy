"use strict";
var common = require('./common.js');

var DEFAULT_CONFIG = require('./default_config.json');

var config_file_path = process.argv.length > 2 ? process.argv[2] : null;
var config = config_file_path ? require(config_file_path) : {};

config.expand(DEFAULT_CONFIG);

var http = require('http');
var url = require('url');

var io = require('socket.io')();

var encrypt = common.Encryptor(config.algorithm, config.password);
var decrypt = common.Decryptor(config.algorithm, config.password);

var encrypt_buffer = common.BufferEncryptor(config.algorithm, config.password);
var decrypt_buffer = common.BufferDecryptor(config.algorithm, config.password);

var verification = encrypt(config.password);

io.on('connection', function (socket) {
  socket.request_pool = {};

  socket.on('vrf', function (data) {
    common.log('Client connection');

    if (verification != data.v)
      socket.emit('rfs', {
        msg : 'Verification Failed'
      });
    else
      socket.emit('ack', {
        msg : 'Hello World'
      });
  });

  socket.on('req-new', function (data) {

    if (verification != data.v)
      return;

    var option = JSON.parse(decrypt(data.o));
    var id = data.id;

    common.log(option.method + ':' + option.hostname + ':' + option.path);

    var req = http.request(option, function (res) {
      res.on('data', function (chunk) {
        socket.emit('res-data', {
          id : id,
          d : encrypt_buffer(chunk)
        });
      });

      res.on('end', function () {
        socket.emit('res-end', {
          id : id
        });

        delete socket.request_pool[id];
      });

      socket.request_pool[id] = {
        last_update : new Date(),
        request : req
      }

      socket.emit('res-stat', {
        id : id,
        c : res.statusCode,
        h : encrypt(JSON.stringify(res.headers))
      });
    });

    socket.request_pool[id] = {
      last_update : new Date(),
      request : req
    };

    req.on('error', function () {
    });
  });

  socket.on('req-data', function (data) {
    if (verification != data.v)
      return;

    var id = data.id;
    var chunk = decrypt_buffer(data.d);

    socket.request_pool[id].request.write(chunk);
    socket.request_pool[id].last_update = new Date();
  });

  socket.on('req-end', function (data) {
    if (verification != data.v)
      return;

    var id = data.id;

    socket.request_pool[id].request.end();
    socket.request_pool[id].last_update = new Date();
  });

  socket.on('error', function () {
    console.log(arguments);
  });
});

io.listen(config.remote_port);
