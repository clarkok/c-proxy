# C-Proxy
Self-use remote excryped http proxy forwarder with nodejs. You know what it is 
used for.

## Usage
You will need two Linux hosts. One for the remote server, another for the 
local http proxy server(I call it client).

### Configuration
The server and the client use two copy of one config, stored in a json file.

The default configuration is stored in default_config.json, you can override it
with you own json file.

There 6 field you can config.

 * server: address of the remote server
 * remote_port: port the remote server will listen on
 * local_port: port the local http proxy server will listen on
 * password
 * algorithm: all the algorithm availible for crypto.createCipher is ok
 * timeout: for now, leave it alone

### Server
```
node server.js [/path/to/config.json]
```

### Client
```
node client.js [/path/to/config.json]
```

And then set you proxy server to localhost:< local_port >
