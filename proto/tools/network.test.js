'use strict';

// 本地内存传输冒烟测试：执行项目真实的生成协议、网络管理器和事件管理器。
// 仅替换 Cocos 的模块入口与 WebSocket 传输，不连接真实服务器。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// 用任意精度多项式独立计算BPHash，最后才截为32位，避免复用运行时的位移实现。
function referenceBPHash(bytes, len = bytes.length) {
    let polynomial = 0n;
    for (let index = 0; index < len; index++) {
        const signedByte = BigInt.asIntN(8, BigInt(bytes[index]));
        polynomial ^= signedByte * (128n ** BigInt(len - index - 1));
    }
    const unsigned = polynomial & 0xFFFFFFFFn;
    return Number(unsigned >= 0x80000000n ? unsigned - 0x100000000n : unsigned);
}

// 旧无符号byte参考仅用于精确复现本次客户端与Java服务端的差异。
function referenceUnsignedBPHash(bytes) {
    const polynomial = Array.from(bytes).reduce((value, byte, index) =>
        value ^ (BigInt(byte) * (128n ** BigInt(bytes.length - index - 1))), 0n);
    return Number(BigInt.asIntN(32, polynomial));
}

function bigEndianHashBytes(hash) {
    const unsigned = BigInt(hash) & 0xFFFFFFFFn;
    return [24n, 16n, 8n, 0n].map(shift => Number((unsigned >> shift) & 0xFFn));
}

function assertBodyHash(frame) {
    const bodyWithoutHash = frame.subarray(8, -4);
    const expected = referenceBPHash(bodyWithoutHash);
    assert.equal(new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
        .getInt32(frame.length - 4, false), expected);
    assert.deepEqual([...frame.subarray(-4)], bigEndianHashBytes(expected));
    return expected;
}

function loadTypeScript(relativePath, bindings, exportNames) {
    const filename = path.join(PROJECT_ROOT, relativePath);
    let source = fs.readFileSync(filename, 'utf8')
        .replace(/^\s*import\s+[^\r\n]*;\s*$/gm, '')
        .replace(/^\s*@ccclass\([^\r\n]*\)\s*$/gm, '');
    source = stripTypeScriptTypes(source, { mode: 'transform' })
        .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
        .replace(/\bexport\s+(?=(?:class|const|let|var|function)\b)/g, '');
    return new Function(...Object.keys(bindings), source + '\nreturn { '
        + exportNames.join(', ') + ' };\n//# sourceURL=' + filename.replace(/\\/g, '/'))
        (...Object.values(bindings));
}

function createRuntime() {
    const warnings = [];
    class MemoryWebSocket {
        static OPEN = 1;
        static CLOSED = 3;
        static instances = [];

        constructor(url) {
            this.url = url;
            this.readyState = 0;
            this.sent = [];
            MemoryWebSocket.instances.push(this);
            queueMicrotask(() => {
                if (this.readyState === MemoryWebSocket.CLOSED) return;
                this.readyState = MemoryWebSocket.OPEN;
                this.onopen?.({});
            });
        }

        send(data) {
            assert.equal(this.readyState, MemoryWebSocket.OPEN);
            const bytes = ArrayBuffer.isView(data)
                ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                : new Uint8Array(data);
            this.sent.push(Uint8Array.from(bytes));
        }

        receive(bytes) {
            this.onmessage?.({ data: Uint8Array.from(bytes).buffer });
        }

        close() {
            if (this.readyState === MemoryWebSocket.CLOSED) return;
            this.readyState = MemoryWebSocket.CLOSED;
            this.onclose?.({ code: 1000, reason: 'local smoke test finished' });
        }
    }

    const { $root, pbType } = loadTypeScript('assets/script/WebSocket/proto/ProtoDefined.ts', {
        $protobuf: require('protobufjs/minimal.js'),
    }, ['$root', 'pbType']);
    const messageTypes = loadTypeScript('assets/script/WebSocket/ProtoMessageType.ts', {}, [
        'ProtoRequestType', 'ProtoServerMessageType',
    ]);
    const generatedRoutes = loadTypeScript('assets/script/WebSocket/ProtoRoutes.ts', {}, [
        'PROTO_ROUTES', 'PROTO_ROUTES_TEST_ONLY',
    ]);
    const { ProtoConfig } = loadTypeScript('assets/script/WebSocket/ProtoConfig.ts', {
        ...messageTypes, ...generatedRoutes,
    }, ['ProtoConfig']);
    const { EventManager } = loadTypeScript('assets/script/Common/EventManager.ts', {}, ['EventManager']);
    const { ProtoNetworkMgr } = loadTypeScript('assets/script/WebSocket/ProtoNetworkMgr.ts', {
        ...messageTypes,
        protoCodecs: pbType,
        ProtoConfig,
        EventManager,
        _decorator: { ccclass: () => value => value },
        warn: (...args) => warnings.push(args.join(' ')),
        log: () => {},
        WebSocket: MemoryWebSocket,
    }, ['ProtoNetworkMgr']);
    const network = ProtoNetworkMgr.instance;
    network.setReconnectConfig(0, 0);
    network.setHeartbeatConfig(60000);
    const rawFrame = (route, payload, sn = 0, hashCode) =>
        makeRawServerFrame(route, payload, sn, hashCode, ProtoConfig.PROTO);
    const serverPacket = (route, body, sn = 0, hashCode) => {
        const messageName = Object.values(messageTypes.ProtoServerMessageType).find(name => {
            const candidate = generatedRoutes.PROTO_ROUTES[name];
            return route && candidate && candidate.commandId === route.commandId
                && candidate.moduleId === route.moduleId;
        });
        const codec = messageName ? pbType[messageName.split('.').pop()] : null;
        const payload = pbType.Result.encode(pbType.Result.create({
            code: 0, content: { type_url: codec ? codec.getTypeUrl() : '', value: body },
        })).finish();
        return rawFrame(route, payload, sn, hashCode);
    };
    return { protoRoot: $root, pbType, ...messageTypes, ...generatedRoutes, ProtoConfig, EventManager,
        network, ProtoNetworkMgr, MemoryWebSocket, warnings, rawFrame, serverPacket };
}

async function connectRuntime(t) {
    const runtime = createRuntime();
    t.after(() => runtime.network.disconnect());
    assert.equal(await runtime.network.connect('ws://proto-memory.test'), true);
    runtime.socket = runtime.MemoryWebSocket.instances.at(-1);
    assert.equal(runtime.network.isOnline(), true);
    assert.equal(runtime.socket.binaryType, 'arraybuffer');
    return runtime;
}

function createLoginManager(runtime, options = {}) {
    const now = options.now ?? 1793980800123;
    const sys = {
        OS: { IOS: 'iOS', ANDROID: 'Android', WINDOWS: 'Windows' },
        os: 'Android',
        osVersion: '15.0',
        NetworkType: { 0: 'NONE', 1: 'LAN', 2: 'WWAN', NONE: 0, LAN: 1, WWAN: 2 },
        getNetworkType: () => 1,
        ...options.sys,
    };
    const { LoginMgr } = loadTypeScript('assets/script/GamePlay/Login/LoginMgr.ts', {
        _decorator: { ccclass: () => value => value, property: () => {} },
        Component: class {},
        Node: class {},
        BaseMgr: class {},
        ProtoRequestType: runtime.ProtoRequestType,
        ProtoServerMessageType: runtime.ProtoServerMessageType,
        ProtoNetworkMgr: { instance: runtime.network },
        GameWebSocket: { getInstance: () => ({ NetWork: options.fallback ? null : runtime.network }) },
        sys,
        Date: class extends Date { static now() { return now; } },
        warn: (...args) => runtime.warnings.push(args.join(' ')),
    }, ['LoginMgr']);
    return { manager: new LoginMgr(), sys, now };
}

function makeRawServerFrame(route, body, sn = 0, hashCode, protocol) {
    assert.ok(route, '测试消息必须在 proto/routes.json 中配置路由');
    assert.ok(protocol, '服务端测试包必须使用当前运行时的协议配置');
    const packet = new Uint8Array(22 + body.length + 4);
    const view = new DataView(packet.buffer);
    packet.set([3, 0x6D, 0x6A, 0x67]);
    view.setInt32(4, 14 + body.length + 4, false);
    view.setUint8(8, protocol.FORMAT);
    view.setInt32(9, protocol.STATE, false);
    view.setInt32(13, sn, false);
    view.setInt32(17, route.commandId, false);
    view.setUint8(21, route.moduleId);
    packet.set(body, 22);
    const actualHash = hashCode === undefined ? referenceBPHash(packet.subarray(8, -4)) : hashCode;
    view.setInt32(22 + body.length, actualHash, false);
    return packet;
}

test('公开BPHash符合固定向量、前缀长度、高位和零字节以及32位有符号溢出', () => {
    const { network } = createRuntime();
    const vectors = [
        { bytes: [], expected: 0 },
        { bytes: [0, 0, 0, 0], expected: 0 },
        { bytes: [1, 2, 3], expected: 16643 },
        { bytes: [10, 1, 65], expected: 164033 }, // HelloReq { content: 'A' }
        { bytes: [128], expected: -128 },
        { bytes: [255], expected: -1 },
        { bytes: [128, 255, 0, 1], expected: 268419073 },
        { bytes: [255, 255, 255, 255, 255], expected: -266354561 },
        { bytes: [1, 2, 3, 4, 5, 6, 7, 8], expected: 1084326792 },
        { bytes: [0, 128, 0, 255, 0, 1], expected: -16383 },
    ];
    for (const { bytes, expected } of vectors) {
        const input = Uint8Array.from(bytes);
        assert.equal(referenceBPHash(input), expected);
        assert.equal(network.BPHash(input, input.length), expected,
            'BPHash向量 ' + JSON.stringify(bytes));
    }
    const prefix = Uint8Array.from([1, 2, 3, 255, 128]);
    assert.equal(network.BPHash(prefix, 0), 0);
    assert.equal(network.BPHash(prefix, 1), 1);
    assert.equal(network.BPHash(prefix, 3), 16643);
    assert.equal(network.BPHash(prefix, 4), -2130305);
    assert.equal(network.BPHash(prefix, 5), 272678912);
    assert.notEqual(referenceBPHash(prefix), 16643, '前缀测试必须区分忽略len的实现');
    const offsetView = Uint8Array.from([9, 128, 255, 0, 1, 7]).subarray(1, 5);
    assert.equal(network.BPHash(offsetView, offsetView.length), 268419073);
    const overflowInput = Uint8Array.from({ length: 257 }, (_, index) => (index * 73 + 128) % 256);
    assert.equal(network.BPHash(overflowInput, overflowInput.length), referenceBPHash(overflowInput));
    assert.equal(network.BPHash(overflowInput, 129), referenceBPHash(overflowInput, 129));
});

test('BPHash从偏移8覆盖14字节信息头和protobuf，排除8包头与末尾4字节hash', async t => {
    const { network, socket, pbType, ProtoConfig, ProtoRequestType, warnings } = await connectRuntime(t);
    const name = ProtoRequestType.HelloReq;
    const originalRoute = ProtoConfig.PROTO_ROUTES[name];
    assert.ok(originalRoute);
    const requestData = { content: 'x' };
    const body = pbType.HelloReq.encode(pbType.HelloReq.create(requestData)).finish();
    assert.equal(body.length, 3);
    const hashCalls = [];
    const originalBPHash = network.BPHash;
    network.BPHash = function(bytes, len) {
        hashCalls.push({ bytes: Uint8Array.from(bytes), len });
        return originalBPHash.call(this, bytes, len);
    };
    t.after(() => { network.BPHash = originalBPHash; });
    const changedModuleId = (originalRoute.moduleId + 1) % 256;
    network.send(name, requestData);
    try {
        ProtoConfig.PROTO_ROUTES[name] = { ...originalRoute, moduleId: changedModuleId };
        network.send(name, requestData);
        ProtoConfig.PROTO_ROUTES[name] = {
            commandId: originalRoute.commandId ^ 1, moduleId: changedModuleId,
        };
        network.send(name, requestData);
    } finally {
        ProtoConfig.PROTO_ROUTES[name] = originalRoute;
    }
    assert.equal(socket.sent.length, 3);
    assert.equal(hashCalls.length, 3);
    const hashes = [];
    socket.sent.forEach((frame, index) => {
        const view = new DataView(frame.buffer);
        assert.equal(view.getInt32(13, false), index + 1);
        assert.deepEqual([...frame.subarray(22, -4)], [...body]);
        assert.equal(hashCalls[index].len, view.getInt32(4, false) - 4);
        assert.equal(hashCalls[index].len, 17);
        assert.deepEqual([...hashCalls[index].bytes], [...frame.subarray(8, -4)],
            '真实BPHash第1参数应仅含14信息头和protobuf，不能传整包后仅修改len');
        hashes.push(assertBodyHash(frame));
    });
    assert.notEqual(hashes[0], hashes[1], '短protobuf之前的模块号变化必须计入hash');
    assert.notEqual(hashes[1], hashes[2], '指令ID的末字节变化必须计入hash');
    assert.ok(hashes.some(hash => hash !== referenceBPHash(body)),
        '测试向量必须区分只计算protobuf的错误实现');
    const frame = socket.sent[2];
    const changedView = new DataView(frame.buffer);
    assert.equal(changedView.getInt32(17, false), originalRoute.commandId ^ 1);
    assert.equal(changedView.getUint8(21), changedModuleId);
    const tailChanged = Uint8Array.from(frame);
    tailChanged.fill(0xDD, tailChanged.length - 4);
    assert.deepEqual([...tailChanged.subarray(8, -4)], [...frame.subarray(8, -4)]);
    assert.equal(referenceBPHash(tailChanged.subarray(8, -4)), hashes[2],
        '修改4字节hash尾不能改变参与计算的包体');
    const headerChanged = Uint8Array.from(frame);
    headerChanged.fill(0xCC, 0, 8);
    assert.deepEqual([...headerChanged.subarray(8, -4)], [...frame.subarray(8, -4)],
        '修改8字节包头不能改变BPHash输入');
    assert.equal(referenceBPHash(headerChanged.subarray(8, -4)), hashes[2]);
    assert.deepEqual(warnings, []);
});

test('真实网络管理器经生成路由完成 Hello 请求、模拟回包及 int64 事件派发', async t => {
    const runtime = await connectRuntime(t);
    const { network, socket, ProtoConfig, ProtoRequestType, ProtoServerMessageType, pbType, EventManager, serverPacket } = runtime;
    const reqName = ProtoRequestType.HelloReq;
    const respName = ProtoServerMessageType.HelloResp;
    const reqRoute = ProtoConfig.PROTO_ROUTES[reqName];
    const respRoute = ProtoConfig.PROTO_ROUTES[respName];
    assert.ok(reqRoute);
    assert.ok(respRoute);
    // 确认运行时确实使用本次工具生成的路由表。
    assert.equal(ProtoConfig.PROTO_ROUTES, runtime.PROTO_ROUTES);

    const received = [];
    EventManager.Instance.addListener(respName, event => received.push(event), received);
    network.send(reqName, { content: 'Proto 自动化流程测试' });
    assert.equal(socket.sent.length, 1);
    const request = socket.sent[0];
    const view = new DataView(request.buffer);
    assert.deepEqual([...request.subarray(0, 4)], [3, 0x6D, 0x6A, 0x67]);
    assert.equal(view.getInt32(4, false), request.length - 8);
    assert.equal(view.getUint8(8), ProtoConfig.PROTO.FORMAT);
    assert.equal(view.getInt32(9, false), ProtoConfig.PROTO.STATE);
    assert.equal(view.getInt32(13, false), 1);
    assert.equal(view.getInt32(17, false), reqRoute.commandId);
    assert.equal(view.getUint8(21), reqRoute.moduleId);
    assertBodyHash(request);

    // 模拟服务器解码真实客户端包体，再使用生成的响应类编码回包。
    const decodedRequest = pbType.HelloReq.decode(request.subarray(22, -4));
    assert.equal(decodedRequest.content, 'Proto 自动化流程测试');
    const serverTime = '9007199254740993';
    const body = pbType.HelloResp.encode(pbType.HelloResp.fromObject({
        content: 'echo:' + decodedRequest.content, serverTime,
    })).finish();
    const responsePacket = serverPacket(respRoute, body, 1);
    socket.receive(responsePacket);
    assert.equal(received.length, 1);
    assert.equal(received[0].detail.content, 'echo:Proto 自动化流程测试');
    assert.equal(received[0].detail.serverTime, serverTime);
    assert.deepEqual(received[0].header, {
        format: ProtoConfig.PROTO.FORMAT, state: ProtoConfig.PROTO.STATE, sn: 1,
        commandId: respRoute.commandId, moduleId: respRoute.moduleId,
        hashCode: referenceBPHash(responsePacket.subarray(8, -4)),
    });
    assert.deepEqual(runtime.warnings, []);
});

test('真实网络管理器将含 repeated 公共结构的 GM 通知派发到真实 EventManager', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType, EventManager, warnings, serverPacket } = await connectRuntime(t);
    const name = ProtoServerMessageType.NtfGMCMDInit;
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const expected = {
        enabled: true,
        cmds: [{ category: '测试', desc: '增加道具', cmd: 'addItem', args: ['道具 ID', '数量'] }],
    };
    const body = pbType.NtfGMCMDInit.encode(pbType.NtfGMCMDInit.fromObject(expected)).finish();
    const packet = serverPacket(ProtoConfig.PROTO_ROUTES[name], body);
    socket.receive(packet);
    assert.equal(received.length, 1);
    assert.deepEqual(received[0].detail, expected);
    assert.equal(received[0].header.hashCode, referenceBPHash(packet.subarray(8, -4)));
    assert.deepEqual(warnings, []);
});

test('源com.message.User统一由pbType.User编解码，保留完整事件路由和int64精度', async t => {
    const { network, socket, protoRoot, pbType, ProtoConfig, ProtoRequestType,
        ProtoServerMessageType, EventManager, warnings, serverPacket } = await connectRuntime(t);
    const name = 'com.message.User';
    assert.equal(ProtoRequestType.User, name);
    assert.equal(ProtoServerMessageType.User, name);
    assert.equal(protoRoot.pbType, pbType);
    assert.deepEqual(Object.keys(protoRoot), ['pbType']);
    assert.equal(typeof pbType.HelloReq.encode, 'function');
    assert.equal(typeof pbType.User.encode, 'function');
    const route = ProtoConfig.PROTO_ROUTES[name];
    assert.ok(route);
    const received = [];
    const simpleNameReceived = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    EventManager.Instance.addListener('User', event => simpleNameReceived.push(event), simpleNameReceived);

    const id = '9007199254740993';
    network.send(ProtoRequestType.User, {
        id: require('long').fromString(id), name: '跨命名空间用户',
    });
    assert.equal(socket.sent.length, 1, '完整限定名应能定位生成的 User 编码器');
    const request = socket.sent[0];
    const view = new DataView(request.buffer);
    assert.equal(view.getInt32(4, false), request.length - 8);
    assert.equal(view.getInt32(13, false), 1);
    assert.equal(view.getInt32(17, false), route.commandId);
    assert.equal(view.getUint8(21), route.moduleId);
    assertBodyHash(request);
    const serverDecoded = pbType.User.decode(request.subarray(22, -4));
    assert.equal(serverDecoded.id.toString(), id);
    assert.equal(serverDecoded.name, '跨命名空间用户');

    // 同一个 protobuf 类型在两条消息方向上使用同一路由，不依赖 Req/Resp 后缀。
    const response = pbType.User.encode(pbType.User.fromObject({
        id: serverDecoded.id.toString(), name: 'echo:' + serverDecoded.name,
    })).finish();
    const responsePacket = serverPacket(route, response, 1);
    socket.receive(responsePacket);
    assert.equal(received.length, 1);
    assert.deepEqual(received[0].detail, { id, name: 'echo:跨命名空间用户' });
    assert.deepEqual(received[0].header, {
        format: ProtoConfig.PROTO.FORMAT, state: ProtoConfig.PROTO.STATE, sn: 1,
        commandId: route.commandId, moduleId: route.moduleId,
        hashCode: referenceBPHash(responsePacket.subarray(8, -4)),
    });
    assert.equal(simpleNameReceived.length, 0, '跨包事件应保留完整限定名');
    assert.deepEqual(warnings, []);
});

test('源登录协议经统一pbType编解码，保留完整路由、snake_case字段及Account引用', async t => {
    const { network, socket, pbType, ProtoConfig, ProtoRequestType, ProtoServerMessageType,
        EventManager, warnings, serverPacket } = await connectRuntime(t);
    const reqName = ProtoRequestType.AccountLoginReq;
    const respName = ProtoServerMessageType.AccountLoginResp;
    assert.equal(reqName, 'com.game.hjwz.message.AccountLoginReq');
    assert.equal(respName, 'com.game.hjwz.message.AccountLoginResp');
    const reqRoute = ProtoConfig.PROTO_ROUTES[reqName];
    const respRoute = ProtoConfig.PROTO_ROUTES[respName];
    assert.ok(reqRoute);
    assert.ok(respRoute);
    assert.equal(typeof pbType.AccountLoginReq.encode, 'function');
    assert.equal(typeof pbType.AccountLoginResp.encode, 'function');
    assert.equal(typeof pbType.Account.encode, 'function');
    const timestamp = '9007199254740993';
    network.send(reqName, {
        account_name: '登录测试账号', device_model: 'Node Test', client_ver: '1.0',
        channel: 'test', timestamp: require('long').fromString(timestamp),
    });
    assert.equal(socket.sent.length, 1);
    const request = socket.sent[0];
    const view = new DataView(request.buffer);
    assert.equal(view.getInt32(4, false), request.length - 8);
    assert.equal(view.getInt32(17, false), reqRoute.commandId);
    assert.equal(view.getUint8(21), reqRoute.moduleId);
    assertBodyHash(request);
    const serverDecoded = pbType.AccountLoginReq.decode(request.subarray(22, -4));
    assert.equal(serverDecoded.account_name, '登录测试账号');
    assert.equal(serverDecoded.device_model, 'Node Test');
    assert.equal(serverDecoded.client_ver, '1.0');
    assert.equal(serverDecoded.channel, 'test');
    assert.equal(serverDecoded.timestamp.toString(), timestamp);

    const expectedAccount = {
        id: '9007199254740995', account_name: serverDecoded.account_name,
        state: 'NORMAL', created_time: timestamp,
    };
    const response = pbType.AccountLoginResp.encode(pbType.AccountLoginResp.fromObject({
        account: { ...expectedAccount, state: pbType.AccountState.NORMAL },
    })).finish();
    const received = [];
    const simpleNameReceived = [];
    EventManager.Instance.addListener(respName, event => received.push(event), received);
    EventManager.Instance.addListener('AccountLoginResp', event => simpleNameReceived.push(event), simpleNameReceived);
    const responsePacket = serverPacket(respRoute, response, 1);
    assertBodyHash(responsePacket);
    socket.receive(responsePacket);
    assert.equal(received.length, 1);
    assert.deepEqual(received[0].detail, { account: expectedAccount });
    assert.equal(received[0].header.commandId, respRoute.commandId);
    assert.equal(received[0].header.moduleId, respRoute.moduleId);
    assert.equal(received[0].header.hashCode, referenceBPHash(responsePacket.subarray(8, -4)));
    assert.equal(simpleNameReceived.length, 0);
    assert.deepEqual(warnings, []);
});

test('真实LoginMgr将trim账号及覆盖元数据编码发送，禁止options篡改account_name并保留Long', async t => {
    const runtime = await connectRuntime(t);
    const { manager } = createLoginManager(runtime);
    const timestamp = '9007199254740993';
    const metadata = {
        device_model: '测试设备', channel: '测试渠道', client_ver: '2.1.0', token: 'local-test-token',
        sdk_ver: 'sdk-2', login_addr: 'https://login.test', reg_channel: 'register', login_channel: 'login',
        os_name: 'override-os', os_ver: 'override-ver', network: 'CUSTOM', os_type: 0,
        timestamp: require('long').fromString(timestamp), account_name: '不得覆盖真实账号',
    };
    manager.sendLoginReq(' \n 登录账号\t ', metadata);
    assert.equal(runtime.socket.sent.length, 1);
    const frame = runtime.socket.sent[0];
    const route = runtime.ProtoConfig.PROTO_ROUTES[runtime.ProtoRequestType.AccountLoginReq];
    const view = new DataView(frame.buffer);
    assert.equal(view.getInt32(17, false), route.commandId);
    assert.equal(view.getUint8(21), route.moduleId);
    assertBodyHash(frame);
    const decoded = runtime.pbType.AccountLoginReq.decode(frame.subarray(22, -4));
    const plain = runtime.pbType.AccountLoginReq.toObject(decoded, { longs: String });
    assert.deepEqual(plain, { ...metadata, account_name: '登录账号', timestamp });
    assert.equal(decoded.timestamp.toString(), timestamp);
    assert.deepEqual(runtime.warnings, []);
});

test('真实LoginMgr拒绝空或非string用户名，不发送、不排队且不自动建立连接', async t => {
    const runtime = createRuntime();
    t.after(() => runtime.network.disconnect());
    const { manager } = createLoginManager(runtime);
    const invalidNames = ['', ' \t\n ', null, undefined, 0, {}, []];
    invalidNames.forEach(name => manager.sendLoginReq(name));
    assert.equal(runtime.MemoryWebSocket.instances.length, 0);
    assert.equal(runtime.warnings.length, invalidNames.length);
    assert.ok(!runtime.warnings.some(message => message.includes('message queued')));
    assert.equal(await runtime.network.connect('ws://proto-memory.test'), true);
    assert.equal(runtime.MemoryWebSocket.instances.at(-1).sent.length, 0,
        '连接后也不应flush任何无效用户名请求');
});

test('真实LoginMgr在NetWork未初始化时沿用singleton队列，手动连接后flush账号和默认环境信息', async t => {
    const runtime = createRuntime();
    t.after(() => runtime.network.disconnect());
    const { manager, sys, now } = createLoginManager(runtime, { fallback: true });
    manager.sendLoginReq('  queued-account  ');
    assert.equal(runtime.MemoryWebSocket.instances.length, 0, '登录发送不应自动connect');
    assert.equal(runtime.network.isOnline(), false);
    assert.equal(runtime.warnings.length, 1);
    assert.ok(runtime.warnings[0].includes('message queued'));
    assert.equal(await runtime.network.connect('ws://proto-memory.test'), true);
    const socket = runtime.MemoryWebSocket.instances.at(-1);
    assert.equal(socket.sent.length, 1);
    const frame = socket.sent[0];
    assertBodyHash(frame);
    const decoded = runtime.pbType.AccountLoginReq.decode(frame.subarray(22, -4));
    assert.equal(decoded.account_name, 'queued-account');
    for (const field of ['device_model', 'channel', 'client_ver', 'token', 'sdk_ver',
        'login_addr', 'reg_channel', 'login_channel']) {
        assert.equal(decoded[field], '');
        assert.equal(Object.hasOwn(decoded, field), true);
    }
    assert.equal(decoded.os_name, sys.os);
    assert.equal(decoded.os_ver, sys.osVersion);
    assert.equal(decoded.network, 'LAN');
    assert.equal(decoded.timestamp.toString(), String(now));
    assert.equal(decoded.os_type, 1);
    assert.equal(new DataView(frame.buffer).getInt32(13, false), 1);
});

test('真实LoginMgr仅为iOS和Android显式填os_type，桌面保留未设置且缺失系统信息安全回退', async t => {
    for (const { os, osType } of [
        { os: 'iOS', osType: 0 }, { os: 'Android', osType: 1 }, { os: 'Windows', osType: undefined },
    ]) {
        const runtime = await connectRuntime(t);
        const { manager, now } = createLoginManager(runtime, {
            sys: { os, osVersion: undefined, getNetworkType: () => -1 },
        });
        manager.sendLoginReq('platform-account');
        assert.equal(runtime.socket.sent.length, 1);
        const decoded = runtime.pbType.AccountLoginReq.decode(runtime.socket.sent[0].subarray(22, -4));
        assert.equal(Object.hasOwn(decoded, 'os_type'), osType !== undefined, os);
        if (osType !== undefined) assert.equal(decoded.os_type, osType, os);
        assert.equal(decoded.os_name, os);
        assert.equal(decoded.os_ver, '');
        assert.equal(decoded.network, '');
        assert.equal(decoded.timestamp.toString(), String(now));
        assert.deepEqual(runtime.warnings, []);
    }
});

test('User服务端截图回归：同一47字节包按Java signed byte计算得到BPHash1257880503', async t => {
    const { network, socket, pbType, ProtoConfig, ProtoRequestType, ProtoServerMessageType,
        EventManager, warnings, serverPacket } = await connectRuntime(t);
    const hashCalls = [];
    const originalBPHash = network.BPHash;
    network.BPHash = function(bytes, len) {
        hashCalls.push({ bytes: Uint8Array.from(bytes), len });
        return originalBPHash.call(this, bytes, len);
    };
    t.after(() => { network.BPHash = originalBPHash; });
    network.send(ProtoRequestType.User, { id: 1, name: 'Proto测试用户' });
    assert.equal(socket.sent.length, 1);
    const frame = socket.sent[0];
    const declaredLength = new DataView(frame.buffer).getInt32(4, false);
    assert.equal(frame.length, 47);
    assert.equal(declaredLength, 39);
    const serverBody = frame.subarray(8, 8 + declaredLength);
    assert.equal(serverBody.length, 39);
    const protobufLength = declaredLength - 14 - 4;
    assert.equal(protobufLength, 21);
    const protobufBody = serverBody.subarray(14, 14 + protobufLength);
    assert.deepEqual([...protobufBody], [
        8, 1, 18, 17, 80, 114, 111, 116, 111, 230, 181,
        139, 232, 175, 149, 231, 148, 168, 230, 136, 183,
    ]);
    const decoded = pbType.User.decode(protobufBody);
    assert.equal(decoded.id.toString(), '1');
    assert.equal(decoded.name, 'Proto测试用户');
    const hashInput = frame.subarray(8, -4);
    assert.equal(hashInput.length, 35);
    assert.equal(hashCalls.length, 1);
    assert.equal(hashCalls[0].len, declaredLength - 4);
    assert.equal(hashCalls[0].len, 35);
    assert.equal(hashCalls[0].bytes.length, 35);
    assert.deepEqual([...hashCalls[0].bytes], [...hashInput],
        'User必须将偏移8后的35字节作为第1参数，不能把整包配len35传入BPHash');
    const incorrectPrefixHash = referenceBPHash(frame.subarray(0, 35));
    assert.equal(incorrectPrefixHash, -215123352);
    assert.notEqual(incorrectPrefixHash, 1257880503);
    assert.equal(referenceUnsignedBPHash(hashInput), 1429849271,
        '相同输入按旧unsigned byte可复现客户端原actual，不能改动输入范围或原始数据');
    assert.equal(referenceBPHash(hashInput), 1257880503);
    assert.equal(assertBodyHash(frame), 1257880503);
    assert.deepEqual([...frame.subarray(-4)], [0x4A, 0xF9, 0xBB, 0xB7]);

    const name = ProtoServerMessageType.User;
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    socket.receive(serverPacket(ProtoConfig.PROTO_ROUTES[name], protobufBody, 1));
    assert.equal(received.length, 1);
    assert.deepEqual(received[0].detail, { id: '1', name: 'Proto测试用户' });
    assert.deepEqual(warnings, []);

    // 旧字段仅写protobuf大小21，服务端再扣14+4后只会读取3字节[08 01 12]。
    const legacyFrame = Uint8Array.from(frame);
    new DataView(legacyFrame.buffer).setInt32(4, 21, false);
    const legacyDeclaredLength = new DataView(legacyFrame.buffer).getInt32(4, false);
    const legacyServerBody = legacyFrame.subarray(8, 8 + legacyDeclaredLength);
    const legacyProtobuf = legacyServerBody.subarray(14, 14 + legacyDeclaredLength - 14 - 4);
    assert.deepEqual([...legacyProtobuf], [8, 1, 18]);
    assert.throws(() => pbType.User.decode(legacyProtobuf), RangeError);
    socket.receive(legacyFrame);
    assert.equal(received.length, 1, '旧纯protobuf长度的帧不应按新协议解码或派发');
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].includes('Body length mismatch'));
});

test('真实 GameWebSocket.testUser 示例向完整限定名 User 发送参数', () => {
    const runtime = createRuntime();
    const { GameWebSocket } = loadTypeScript('assets/script/WebSocket/GameWebSocket.ts', {
        ...runtime,
        _decorator: { ccclass: () => value => value, property: () => {} },
        Component: class {},
        BaseMgr: class {},
        ProtoNetworkMgr: { instance: runtime.network },
    }, ['GameWebSocket']);
    const sent = [];
    GameWebSocket.prototype.testUser.call({
        network: { send: (...args) => sent.push(args) },
    }, 123, 'User 示例');
    assert.deepEqual(sent, [['com.message.User', { id: 123, name: 'User 示例' }]]);
});

test('GameWebSocket经BaseMgr接收Result通知和错误，空content回调安全且通知可注销', async t => {
    const runtime = await connectRuntime(t);
    const { pbType, ProtoConfig, ProtoServerMessageType, EventManager, socket,
        serverPacket, rawFrame, warnings } = runtime;
    const decorator = { ccclass: () => value => value, property: () => {} };
    const { BaseMgr } = loadTypeScript('assets/script/Common/BaseMgr.ts', {
        _decorator: decorator, EventManager,
        Tools: { insertArr: (items, item) => items.push(item) },
    }, ['BaseMgr']);
    const logs = [];
    const errors = [];
    const { GameWebSocket } = loadTypeScript('assets/script/WebSocket/GameWebSocket.ts', {
        ...runtime, _decorator: decorator, BaseMgr,
        console: { log: (...args) => logs.push(args), error: (...args) => errors.push(args) },
    }, ['GameWebSocket']);
    const manager = new GameWebSocket();
    manager.eventRegistor();
    const notification = ProtoServerMessageType.NtfGMCMDInit;
    const route = ProtoConfig.PROTO_ROUTES[notification];
    const body = pbType.NtfGMCMDInit.encode(pbType.NtfGMCMDInit.create()).finish();
    socket.receive(serverPacket(route, body));
    assert.equal(logs.filter(args => args[0].includes('[服务器推送]')).length, 1);

    const errorPayload = pbType.Result.encode(pbType.Result.create({ code: 91 })).finish();
    socket.receive(rawFrame(route, errorPayload));
    assert.equal(errors.length, 1);
    assert.equal(errors[0][1].code, 91);

    manager.testHelloMessage();
    manager.testUser();
    manager.testGMCommand('help');
    const logCount = logs.length;
    for (const name of [notification, ProtoServerMessageType.HelloResp,
        ProtoServerMessageType.User, ProtoServerMessageType.UseGMCMDResp]) {
        socket.receive(rawFrame(ProtoConfig.PROTO_ROUTES[name], new Uint8Array()));
    }
    assert.equal(logs.length, logCount, '无content的合法响应不应访问空业务对象');
    assert.ok(!warnings.some(message => message.includes('Failed to handle message')));

    manager.unRegistorEvent();
    const cleanupLogCount = logs.length;
    EventManager.Instance.dispatch(notification, { detail: { cmds: [] } });
    EventManager.Instance.dispatch(runtime.ProtoNetworkMgr.EventType.RESULT_ERROR, { detail: { code: 92 } });
    assert.equal(logs.length, cleanupLogCount);
    assert.equal(errors.length, 1, '注销后不再接收通知和统一业务错误');
});

test('缺失请求路由拒绝发送，同指令不同模块的未知回包拒绝派发', async t => {
    const runtime = await connectRuntime(t);
    const { network, socket, pbType, ProtoConfig, ProtoRequestType, ProtoServerMessageType, EventManager, warnings, serverPacket } = runtime;
    const reqName = ProtoRequestType.HelloReq;
    const original = ProtoConfig.PROTO_ROUTES[reqName];
    try {
        ProtoConfig.PROTO_ROUTES[reqName] = null;
        network.send(reqName, { content: '不得发送' });
    } finally {
        ProtoConfig.PROTO_ROUTES[reqName] = original;
    }
    assert.equal(socket.sent.length, 0);
    assert.ok(warnings.some(message => message.includes('Missing or invalid route')));

    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    assert.ok(route);
    const usedModules = new Set(Object.values(ProtoServerMessageType)
        .map(messageName => ProtoConfig.PROTO_ROUTES[messageName])
        .filter(candidate => candidate && candidate.commandId === route.commandId)
        .map(candidate => candidate.moduleId));
    const unknownModuleId = Array.from({ length: 256 }, (_, index) => index)
        .find(moduleId => !usedModules.has(moduleId));
    assert.notEqual(unknownModuleId, undefined);
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const body = pbType.HelloResp.encode(pbType.HelloResp.fromObject({ content: '错误模块' })).finish();
    socket.receive(serverPacket({ ...route, moduleId: unknownModuleId }, body));
    assert.equal(received.length, 0);
    assert.ok(warnings.some(message => message.includes('Unknown server message route')));
});

test('空请求保持26字节，Result回包按外层payload计算长度并支持空Any业务', async t => {
    const { network, socket, pbType, ProtoConfig, ProtoRequestType, ProtoServerMessageType,
        EventManager, warnings, serverPacket } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);

    const emptyBody = pbType.HelloResp.encode(pbType.HelloResp.create()).finish();
    assert.equal(emptyBody.length, 0);
    network.send(ProtoRequestType.HelloReq, {});
    assert.equal(socket.sent.length, 1);
    const emptyRequest = socket.sent[0];
    assert.equal(emptyRequest.length, 26);
    const emptyRequestView = new DataView(emptyRequest.buffer);
    assert.equal(emptyRequestView.getInt32(4, false), 18);
    assert.equal(emptyRequestView.getUint8(8), ProtoConfig.PROTO.FORMAT);
    const emptyRequestHashInput = emptyRequest.subarray(8, -4);
    assert.equal(emptyRequestHashInput.length, 14);
    assert.equal(emptyRequestView.getInt32(22, false), referenceBPHash(emptyRequestHashInput));
    assert.equal(assertBodyHash(emptyRequest), referenceBPHash(emptyRequestHashInput));
    assert.equal(pbType.HelloReq.decode(emptyRequest.subarray(22, -4)).content, '');
    const emptyResponse = serverPacket(route, emptyBody);
    assert.ok(emptyResponse.length > 26, '空业务Any.value仍有外层Result和Any元数据');
    assert.equal(new DataView(emptyResponse.buffer).getInt32(4, false), emptyResponse.length - 8);
    assert.equal(pbType.Result.decode(emptyResponse.subarray(22, -4)).content.value.length, 0);
    socket.receive(emptyResponse);
    assert.equal(received.length, 1);
    assert.equal(received[0].detail.content, '');
    assert.equal(received[0].code, 0);
    assert.equal(received[0].header.hashCode, referenceBPHash(emptyResponse.subarray(8, -4)));
    assert.deepEqual(warnings, []);

    const body = pbType.HelloResp.encode(pbType.HelloResp.create({ content: 'length check' })).finish();
    const packet = serverPacket(route, body);
    const outerPayload = packet.subarray(22, -4);
    const bodyLength = 14 + outerPayload.length + 4;
    assert.equal(new DataView(packet.buffer).getInt32(4, false), bodyLength);
    for (const length of [-1, 0, 17, body.length, outerPayload.length,
        bodyLength - 1, bodyLength + 1, packet.length]) {
        const invalid = Uint8Array.from(packet);
        new DataView(invalid.buffer).setInt32(4, length, false);
        socket.receive(invalid);
    }
    socket.receive(packet.subarray(0, packet.length - 1));
    const extraByte = new Uint8Array(packet.length + 1);
    extraByte.set(packet);
    socket.receive(extraByte);
    assert.equal(received.length, 1);
    assert.equal(warnings.length, 10);
    assert.ok(warnings.every(message => message.includes('Body length mismatch')));

    socket.receive(packet);
    assert.equal(received.length, 2);
    assert.equal(received[1].detail.content, 'length check');
});

test('Result正负业务错误及未知路由均经双通道报告，错误Any不解码也不触发成功事件', async t => {
    const { socket, network, ProtoNetworkMgr, pbType, ProtoConfig, ProtoServerMessageType,
        EventManager, warnings, rawFrame } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    assert.ok(route);
    const errorType = ProtoNetworkMgr.EventType.RESULT_ERROR;
    assert.equal(errorType, 'result-error');
    const success = [];
    const busErrors = [];
    const nativeErrors = [];
    EventManager.Instance.addListener(name, event => success.push(event), success);
    EventManager.Instance.addListener(errorType, event => busErrors.push(event.detail), busErrors);
    network.addEventListener(errorType, event => nativeErrors.push(event.detail));
    const usedModules = new Set(Object.values(ProtoServerMessageType)
        .map(messageName => ProtoConfig.PROTO_ROUTES[messageName])
        .filter(candidate => candidate && candidate.commandId === route.commandId)
        .map(candidate => candidate.moduleId));
    const unknownModuleId = Array.from({ length: 256 }, (_, index) => index)
        .find(moduleId => !usedModules.has(moduleId));
    assert.notEqual(unknownModuleId, undefined);
    const cases = [
        { code: 1009, route, messageName: name },
        { code: -71, route, messageName: name },
        { code: 23, route: { ...route, moduleId: unknownModuleId }, messageName: null },
    ];
    const typeUrl = 'https://server.test/errors/not.the.Business';
    for (const [index, entry] of cases.entries()) {
        const payload = pbType.Result.encode(pbType.Result.create({
            code: entry.code, content: { type_url: typeUrl, value: Uint8Array.of(0xFF) },
        })).finish();
        const frame = rawFrame(entry.route, payload, index + 1);
        socket.receive(frame);
        assert.equal(busErrors.length, index + 1);
        assert.equal(nativeErrors.length, index + 1);
        assert.deepEqual(busErrors[index], {
            code: entry.code, messageName: entry.messageName, typeUrl,
            header: { format: ProtoConfig.PROTO.FORMAT, state: ProtoConfig.PROTO.STATE,
                sn: index + 1, commandId: entry.route.commandId, moduleId: entry.route.moduleId,
                hashCode: referenceBPHash(frame.subarray(8, -4)) },
        });
    }
    assert.deepEqual(nativeErrors, busErrors);
    assert.equal(success.length, 0);
    assert.ok(!warnings.some(message => message.includes('Failed to handle message')),
        '非零业务码应先报告，不能尝试解析错误或无效的Any.value');
});

test('Result成功支持Any自定义prefix及空type_url，拒绝相同短名但不同完整类型', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType,
        EventManager, warnings, rawFrame } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const fqn = pbType.HelloResp.getTypeUrl().split('/').pop();
    const shortName = fqn.split('.').pop();
    const body = pbType.HelloResp.encode(pbType.HelloResp.create({ content: 'Result成功' })).finish();
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const acceptedUrls = ['https://server.test/custom/types/' + fqn, ''];
    for (const typeUrl of acceptedUrls) {
        const payload = pbType.Result.encode(pbType.Result.create({
            code: 0, content: { type_url: typeUrl, value: body },
        })).finish();
        socket.receive(rawFrame(route, payload));
        assert.equal(received.at(-1).detail.content, 'Result成功');
        assert.equal(received.at(-1).code, 0);
        assert.equal(received.at(-1).typeUrl, typeUrl);
    }
    assert.equal(received.length, 2);
    assert.deepEqual(warnings, []);
    for (const typeUrl of ['type.googleapis.com/other.package.' + shortName,
        'type.googleapis.com/' + shortName]) {
        const payload = pbType.Result.encode(pbType.Result.create({
            code: 0, content: { type_url: typeUrl, value: body },
        })).finish();
        socket.receive(rawFrame(route, payload));
    }
    assert.equal(received.length, 2, '完整类型不匹配时不能按相同短名解码');
    assert.equal(warnings.filter(message => message.includes('Result content type mismatch')).length, 2);
});

test('空Result及仅code0是detail=null的成功ack，空Any.value解码为默认业务对象', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType,
        EventManager, warnings, rawFrame } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const emptyAck = rawFrame(route, new Uint8Array());
    assert.equal(emptyAck.length, 26);
    assert.equal(new DataView(emptyAck.buffer).getInt32(4, false), 18);
    socket.receive(emptyAck);
    socket.receive(rawFrame(route, pbType.Result.encode(pbType.Result.create({ code: 0 })).finish()));
    assert.equal(received.length, 2);
    for (const event of received) {
        assert.equal(event.detail, null);
        assert.equal(event.code, 0);
        assert.equal(event.typeUrl, '');
    }
    const typeUrl = pbType.HelloResp.getTypeUrl();
    const emptyBusiness = pbType.Result.encode(pbType.Result.create({
        content: { type_url: typeUrl, value: new Uint8Array() },
    })).finish();
    socket.receive(rawFrame(route, emptyBusiness));
    assert.equal(received.length, 3);
    assert.deepEqual(received[2].detail, { content: '', serverTime: '0' });
    assert.equal(received[2].code, 0);
    assert.equal(received[2].typeUrl, typeUrl);
    assert.deepEqual(warnings, []);
});

test('截断Result和截断内部业务字节均拒收，后续合法Result仍可解码成功', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType, ProtoNetworkMgr,
        EventManager, warnings, rawFrame, serverPacket } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const received = [];
    const businessErrors = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    EventManager.Instance.addListener(ProtoNetworkMgr.EventType.RESULT_ERROR,
        event => businessErrors.push(event), businessErrors);
    socket.receive(rawFrame(route, Uint8Array.of(0x12)));
    const badBusiness = pbType.Result.encode(pbType.Result.create({
        code: 0, content: { type_url: pbType.HelloResp.getTypeUrl(), value: Uint8Array.of(0x0A) },
    })).finish();
    socket.receive(rawFrame(route, badBusiness));
    assert.equal(received.length, 0);
    assert.equal(businessErrors.length, 0);
    assert.equal(warnings.filter(message => message.includes('Failed to handle message')).length, 2);
    const body = pbType.HelloResp.encode(pbType.HelloResp.create({ content: '恢复收包' })).finish();
    socket.receive(serverPacket(route, body));
    assert.equal(received.length, 1);
    assert.equal(received[0].detail.content, '恢复收包');
    assert.equal(received[0].code, 0);
});

test('服务器包尾hash按大端int32读取，显式非BPHash值也只读取而不校验丢包', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType,
        EventManager, warnings, serverPacket } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const cases = [
        { hashCode: 0x01020304, tail: [1, 2, 3, 4] },
        { hashCode: -1, tail: [255, 255, 255, 255] },
    ];
    for (const { hashCode, tail } of cases) {
        const content = 'hash:' + hashCode;
        const body = pbType.HelloResp.encode(pbType.HelloResp.create({ content })).finish();
        const packet = serverPacket(route, body, 7, hashCode);
        assert.notEqual(referenceBPHash(packet.subarray(8, -4)), hashCode);
        assert.deepEqual([...packet.subarray(-4)], tail);
        assert.equal(new DataView(packet.buffer).getInt32(4, false), packet.length - 8);
        socket.receive(packet);
        assert.equal(received.at(-1).detail.content, content);
        assert.equal(received.at(-1).header.hashCode, hashCode);
        assert.equal(received.at(-1).header.sn, 7);
    }
    assert.equal(received.length, cases.length);
    assert.deepEqual(warnings, []);
});

test('缺失或截断hash包尾及多余尾字节拒收，包含旧无hash帧和空protobuf帧', async t => {
    const { socket, pbType, ProtoConfig, ProtoServerMessageType,
        EventManager, warnings, rawFrame, serverPacket } = await connectRuntime(t);
    const name = ProtoServerMessageType.HelloResp;
    const route = ProtoConfig.PROTO_ROUTES[name];
    const received = [];
    EventManager.Instance.addListener(name, event => received.push(event), received);
    const body = pbType.HelloResp.encode(pbType.HelloResp.create({ content: '完整包尾' })).finish();
    const packet = serverPacket(route, body);
    const emptyPacket = rawFrame(route, new Uint8Array());
    for (const frame of [packet, emptyPacket]) {
        const bodyEnd = frame.length - 4;
        // 0字节包尾即旧协议帧；1~3字节表示包尾被截断。
        for (const hashBytes of [0, 1, 2, 3]) {
            socket.receive(frame.subarray(0, bodyEnd + hashBytes));
        }
    }
    const extraTail = new Uint8Array(packet.length + 1);
    extraTail.set(packet);
    extraTail[extraTail.length - 1] = 0xFF;
    socket.receive(extraTail);
    assert.equal(received.length, 0);
    assert.equal(warnings.length, 9);
    assert.ok(warnings.every(message => message.includes('Body length mismatch')
        || message.includes('Packet too short')));
    assert.ok(!warnings.some(message => message.includes('Failed to handle message')),
        '不完整帧应在读取hash或protobuf解码前拒绝');

    socket.receive(packet);
    assert.equal(received.length, 1);
    assert.equal(received[0].detail.content, '完整包尾');
    assert.equal(received[0].header.hashCode, referenceBPHash(packet.subarray(8, -4)));
});

test('连接前排队消息flush保留4字节hash包尾，连接后及重连后的SN继续递增', async t => {
    const { network, MemoryWebSocket, pbType, ProtoConfig, ProtoRequestType, warnings } = createRuntime();
    t.after(() => network.disconnect());
    const name = ProtoRequestType.HelloReq;
    const route = ProtoConfig.PROTO_ROUTES[name];
    assert.ok(route);
    network.send(name, { content: 'queue:1' });
    network.send(name, { content: 'queue:1' });
    assert.equal(MemoryWebSocket.instances.length, 0);
    assert.equal(warnings.length, 2);
    assert.ok(warnings.every(message => message.includes('message queued')));

    assert.equal(await network.connect('ws://proto-memory.test'), true);
    const firstSocket = MemoryWebSocket.instances.at(-1);
    assert.equal(firstSocket.sent.length, 2);
    network.send(name, { content: 'live:3' });
    assert.equal(firstSocket.sent.length, 3);
    const expectedContent = ['queue:1', 'queue:1', 'live:3'];
    function assertFrame(frame, sn, content) {
        const view = new DataView(frame.buffer);
        const body = pbType.HelloReq.encode(pbType.HelloReq.create({ content })).finish();
        assert.equal(frame.length, 22 + body.length + 4);
        assert.equal(view.getInt32(4, false), frame.length - 8);
        assert.equal(view.getUint8(8), ProtoConfig.PROTO.FORMAT);
        assert.equal(view.getInt32(13, false), sn);
        assert.equal(view.getInt32(17, false), route.commandId);
        assert.equal(view.getUint8(21), route.moduleId);
        assert.deepEqual([...frame.subarray(22, -4)], [...body]);
        assert.equal(pbType.HelloReq.decode(frame.subarray(22, -4)).content, content);
        assertBodyHash(frame);
    }
    firstSocket.sent.forEach((frame, index) => assertFrame(frame, index + 1, expectedContent[index]));
    network.disconnect();
    assert.equal(await network.connect('ws://proto-memory.test'), true);
    const reconnectedSocket = MemoryWebSocket.instances.at(-1);
    assert.notEqual(reconnectedSocket, firstSocket);
    assert.equal(reconnectedSocket.sent.length, 0, '旧队列应已清空，重连不重发');
    network.send(name, { content: 'reconnect:4' });
    assert.equal(reconnectedSocket.sent.length, 1);
    assertFrame(reconnectedSocket.sent[0], 4, 'reconnect:4');
    assert.equal(warnings.length, 2);
});
