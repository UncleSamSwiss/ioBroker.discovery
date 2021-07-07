'use strict';

const tools = require('../tools.js');

const adapterName = 'luxtronik2';

function testPort(ip, port, callback) {
    tools.testPort(ip, port, 500, (err, found, ip, port) => {
        callback(found);
    });
}

function detect(ip, device, options, callback) {
    if (device._type !== 'ip') {
        return callback(null, false, ip);
    }
    
    if (tools.findInstance(options,
                           adapterName,
                           obj => obj.native.server === ip || obj.native.server === device._name)) {
        return callback(null, false, ip);
    }

    function createInstance(luxPort) {
        options.log.debug(`${adapterName}: Adding new instance: ${ip}, luxPort: ${luxPort || 'none'}`);
        const instance = {
            _id: tools.getNextInstanceID(adapterName, options),
            common: {
                name: adapterName,
                title: 'Luxtronik2 Heatpump (' + ip + ')'
            },
            native: {
                host: ip,
                port: 8214,
                luxPort,
                password: "",
                refreshInterval: 5,
            },
            comment: {
                add: [ip]
            }
        };
        options.newInstances.push(instance);
        callback(null, true, ip);
    }
    
    tools.httpGet('http://' + ip + ':8214/', (err, data) => {
        if (err === 400) {
            // this is expected for the WebSocket port, so it looks good
            // let's see if we also find one of the Luxtronik ports 8888 or 8889
            testPort(ip, 8888, (found) => {
                if (found) {
                    createInstance(8888);
                } else {
                    testPort(ip, 8889, (found) => {
                        if (found) {
                            createInstance(8889);
                        } else {
                            createInstance();
                        }
                    });
                }
            });
            return;
        }
        
        callback(null, false, ip);
    });
}

exports.detect = detect;
exports.type = ['ip'];
