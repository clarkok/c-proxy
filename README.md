# C-Proxy
Self-use remote encryped http proxy forwarder using `socket.io`. You know what 
it is used for.

## Usage
You will need two Linux hosts. One for the remote server, another for the 
local http proxy server(I call it client).

### Configuration
The server and the client use two copies of one config, stored in a json file.

The default configuration is stored in `default_config.json`, you can override it
with you own json file.

There are 6 fields you can config.

 * server: address of the remote server
 * client: address of the http proxy server (the client), used in PAC generating
 * remote_port: port the remote server will listen on
 * local_port: port the local http proxy server will listen on
 * password
 * algorithm: all the algorithms availible for crypto.createCipher are ok
 * timeout: in seconds. time to clear dead requests

### Server
```
node server.js [/path/to/config.json]
```

### Client
```
node client.js [/path/to/config.json]
```

And then set you proxy server to localhost:< local_port >
