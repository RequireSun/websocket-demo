'use strict';

const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const wss = new WebSocket.Server({
	noServer: true,
});

const server = http.createServer((request, response) => {
	const pathObj = url.parse(request.url, true);

	if (/^\/static\//.test(pathObj.pathname)) {
		const staticPath = path.resolve(__dirname, 'public');

		const filePath = path.join(staticPath, pathObj.pathname.replace(/^\/static\//, ''));

		fs.readFile(filePath, 'binary', (err, fileContent) => {
			if (err) {
				console.error('read file error', filePath);
				response.writeHead(404, 'not found');
            	response.end('<h1>404 Not Found</h1>');
			} else {
				console.log('load static', filePath);
				response.write(fileContent, 'binary');
            	response.end();
			}
		});
	}
});

wss.on('connection', (ws, request) => {
	ws.name = `用户${Date.now() % 1000000}`;

	broadcast(wss, ws, `${ws.name}进入房间`, false);

	ws.on('message', (data) => {
		console.log('received', ws.name, '\'s data:', data);

		broadcast(wss, ws, `${ws.name}说: ${data}`, true);
	});
});

wss.on('close', (ws) => {
	broadcast(wss, ws, `${ws.name}离开房间`, false);
});

server.on('upgrade', (request, socket, head) => {
	const pathname = url.parse(request.url).pathname;

	switch (pathname) {
		case '/chatroom':
			wss.handleUpgrade(request, socket, head, (ws) => {
      			wss.emit('connection', ws, request);
    		});
			break;
		default:
			socket.destroy();
			break;
	}
});

server.listen(8080, (err) => {
	if (err) {
		console.error('server started failed');
	} else {
		console.log('server started on port:', 8080);
	}
});

function broadcast(parent, child, data, sendSelf) {
	parent.clients.forEach((client) => {
		// 如果允许发送自己, 直接就过了, 否则要判断是不是自己
		const couldSend = sendSelf || client !== child;

        if (couldSend && client.readyState === WebSocket.OPEN) {
        	client.send(data);
        }
    });
}
