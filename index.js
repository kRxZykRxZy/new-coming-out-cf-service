const http = require('http');
const app = require('./src/app/bootstrap.js');
const createTunnelServer = require('./src/app/tunnelServer');

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
const tunnelServer = createTunnelServer(server);
app.locals.tunnelServer = tunnelServer;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
