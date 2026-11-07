'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { test } = require('node:test');
const { build } = require('./generator');

const OUTPUT_FILES = [
    'assets/script/WebSocket/proto/ProtoDefined.ts',
    'assets/script/WebSocket/proto/ProtoDefined.d.ts',
    'assets/script/WebSocket/ProtoMessageType.ts',
    'assets/script/WebSocket/ProtoRoutes.ts',
];

function writeFile(projectRoot, relativePath, source) {
    const filename = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, source, 'utf8');
    return filename;
}

function createFixture(t) {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgcore-proto-test-'));
    const projectRoot = path.join(temporaryDirectory, 'client with spaces');
    t.after(() => {
        const resolved = path.resolve(temporaryDirectory);
        const temporaryRoot = path.resolve(os.tmpdir()) + path.sep;
        assert.ok(resolved.startsWith(temporaryRoot), 'cleanup must stay inside the temporary directory');
        assert.ok(path.basename(resolved).startsWith('rpgcore-proto-test-'));
        fs.rmSync(resolved, { recursive: true, force: true });
    });

    writeFile(projectRoot, 'proto/shared/common.proto', `syntax = "proto3";
package pb;

enum ItemQuality { COMMON = 0; RARE = 1; }

message Item {
    message Stats { int32 hp = 1; }
    string id = 1;
    Stats stats = 2;
    ItemQuality quality = 3;
}
`);
    writeFile(projectRoot, 'proto/hello.proto', `syntax = "proto3";
package pb;
import "shared/common.proto";

message HelloReq {
    string content = 1;
    repeated Item items = 2;
    map<string, int64> counters = 3;
    string snake_case = 4;
}

message HelloResp {
    string content = 1;
    int64 serverTime = 2;
    repeated Item items = 3;
}

message NtfHello { string content = 1; }
`);
    const routes = {
        testOnly: true,
        defaultModuleId: 1,
        routes: {
            HelloReq: { commandId: 1001 },
            HelloResp: { commandId: 1001 },
            NtfHello: { commandId: 1002 },
        },
    };
    const saveRoutes = () => writeFile(projectRoot, 'proto/routes.json', JSON.stringify(routes, null, 2) + '\n');
    saveRoutes();
    return { projectRoot, routes, saveRoutes };
}

function generate(fixture, options = {}) {
    return build({ projectRoot: fixture.projectRoot, quiet: true, ...options });
}

function readOutput(fixture, relativePath) {
    return fs.readFileSync(path.join(fixture.projectRoot, relativePath), 'utf8');
}

function snapshotOutputs(fixture) {
    return new Map(OUTPUT_FILES.map(relativePath => [relativePath, readOutput(fixture, relativePath)]));
}

function assertOutputsUnchanged(fixture, snapshot) {
    for (const [relativePath, source] of snapshot) {
        assert.equal(readOutput(fixture, relativePath), source, `${relativePath} must remain unchanged`);
    }
}

// Execute the actual generated implementation, including its TypeScript annotations.
// The vm receives the real protobuf runtime; no generated codecs are replaced or mocked.
function executeGenerated(source, exportsExpression, bindings = {}) {
    let javascript = stripTypeScriptTypes(source, { mode: 'transform' });
    javascript = javascript
        .replace(/^import\s+\$protobuf\s+from\s+["']protobufjs\/minimal(?:\.js)?["'];?\s*$/m,
            'const $protobuf = __protobuf;')
        .replace(/^export\s+(const|let|var)\s+/gm, '$1 ')
        .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
        .replace(/^export\s+default\s+[^;]+;?\s*$/gm, '');
    const sandbox = { ...bindings, module: { exports: {} } };
    vm.runInNewContext(`${javascript}\nmodule.exports = ${exportsExpression};`, sandbox, {
        filename: 'generated-proto-test.js',
        timeout: 5000,
    });
    return sandbox.module.exports;
}

test('generated codecs round-trip imports, nested data, repeated fields, maps and int64', async t => {
    const fixture = createFixture(t);
    const result = await generate(fixture);
    assert.ok(result.outputs instanceof Map);
    assert.equal(result.changed.length, OUTPUT_FILES.length);
    assert.ok(result.dependencies.some(filename => filename.replace(/\\/g, '/').endsWith('/shared/common.proto')));

    const runtime = executeGenerated(
        readOutput(fixture, OUTPUT_FILES[0]),
        '{ pbType }',
        { __protobuf: require('protobufjs/minimal.js') },
    );
    const request = runtime.pbType.HelloReq.fromObject({
        content: '真实编解码',
        items: [{ id: '1001', stats: { hp: 99 }, quality: 'RARE' }],
        counters: { gold: '9007199254740993' },
        snake_case: 'keep_case',
    });
    const encoded = runtime.pbType.HelloReq.encode(request).finish();
    const decoded = runtime.pbType.HelloReq.decode(encoded);
    assert.equal(decoded.content, '真实编解码');
    assert.equal(decoded.items.length, 1);
    assert.equal(decoded.items[0].stats.hp, 99);
    assert.equal(decoded.items[0].quality, 1);
    assert.equal(decoded.counters.gold.toString(), '9007199254740993');
    assert.equal(decoded.snake_case, 'keep_case');

    const response = runtime.pbType.HelloResp.fromObject({
        content: 'ok',
        serverTime: '9007199254740993',
        items: [{ id: '1001' }],
    });
    const roundTripResponse = runtime.pbType.HelloResp.decode(runtime.pbType.HelloResp.encode(response).finish());
    assert.equal(roundTripResponse.serverTime.toString(), '9007199254740993');
    assert.equal(roundTripResponse.items[0].id, '1001');

    const definitions = readOutput(fixture, OUTPUT_FILES[1]);
    assert.deepEqual([...definitions.matchAll(/^export namespace (\w+)/gm)].map(match => match[1]), ['pbType']);
    assert.match(definitions, /interface IHelloReq\b/);
    assert.match(definitions, /interface IStats\b/);
    assert.match(definitions, /snake_case\??\s*:/);
    const enumSource = readOutput(fixture, OUTPUT_FILES[2]);
    assert.match(enumSource, /HelloReq\s*=\s*['"]HelloReq['"]/);
    assert.match(enumSource, /HelloResp\s*=\s*['"]HelloResp['"]/);
    assert.match(enumSource, /NtfHello\s*=\s*['"]NtfHello['"]/);
    assert.doesNotMatch(enumSource, /\b(?:Item|Stats)\s*=/);

    const routesModule = executeGenerated(readOutput(fixture, OUTPUT_FILES[3]), '{ PROTO_ROUTES, PROTO_ROUTES_TEST_ONLY }');
    assert.equal(routesModule.PROTO_ROUTES.HelloReq.moduleId, 1);
    assert.equal(routesModule.PROTO_ROUTES.HelloReq.commandId, 1001);
    assert.equal(routesModule.PROTO_ROUTES.HelloResp.commandId, 1001, 'opposite directions may share one route');
    assert.equal(routesModule.PROTO_ROUTES_TEST_ONLY, true);
    assert.equal(routesModule.PROTO_ROUTES.Item, undefined);
});

test('rebuilding unchanged sources preserves output timestamps and Cocos metadata', async t => {
    const fixture = createFixture(t);
    const metaPath = writeFile(fixture.projectRoot, `${OUTPUT_FILES[0]}.meta`, '{"uuid":"keep-existing-uuid"}\n');
    await generate(fixture);
    const previous = snapshotOutputs(fixture);
    const oldTimestamp = new Date('2000-01-01T00:00:00Z');
    for (const relativePath of [...OUTPUT_FILES, `${OUTPUT_FILES[0]}.meta`]) {
        fs.utimesSync(path.join(fixture.projectRoot, relativePath), oldTimestamp, oldTimestamp);
    }
    const timestamps = new Map([...OUTPUT_FILES, `${OUTPUT_FILES[0]}.meta`].map(relativePath => [
        relativePath,
        fs.statSync(path.join(fixture.projectRoot, relativePath)).mtimeMs,
    ]));

    const result = await generate(fixture);
    assert.deepEqual(result.changed, []);
    assertOutputsUnchanged(fixture, previous);
    assert.equal(fs.readFileSync(metaPath, 'utf8'), '{"uuid":"keep-existing-uuid"}\n');
    for (const [relativePath, timestamp] of timestamps) {
        assert.equal(fs.statSync(path.join(fixture.projectRoot, relativePath)).mtimeMs, timestamp);
    }
    await generate(fixture, { check: true });
});

test('check detects stale outputs without changing outputs or route inputs', async t => {
    const fixture = createFixture(t);
    await generate(fixture);
    const previous = snapshotOutputs(fixture);
    const routesInput = fs.readFileSync(path.join(fixture.projectRoot, 'proto/routes.json'), 'utf8');
    fs.appendFileSync(path.join(fixture.projectRoot, 'proto/hello.proto'), '\nmessage ExtraReq { string value = 1; }\n');
    await assert.rejects(generate(fixture, { check: true }));
    assertOutputsUnchanged(fixture, previous);
    assert.equal(fs.readFileSync(path.join(fixture.projectRoot, 'proto/routes.json'), 'utf8'), routesInput);

    const result = await generate(fixture);
    assert.ok(result.warnings.some(warning => warning.includes('ExtraReq')));
    assert.match(readOutput(fixture, OUTPUT_FILES[2]), /ExtraReq\s*=\s*['"]ExtraReq['"]/);
    assert.match(readOutput(fixture, OUTPUT_FILES[3]), /['"]ExtraReq['"]\s*:\s*null/);
    await generate(fixture, { check: true });
    const afterBuild = snapshotOutputs(fixture);
    await assert.rejects(generate(fixture, { strict: true }));
    assertOutputsUnchanged(fixture, afterBuild);
});

test('a failed compile or route validation leaves all previous outputs intact', async t => {
    const scenarios = [
        ['invalid protobuf syntax', fixture => {
            fs.appendFileSync(path.join(fixture.projectRoot, 'proto/hello.proto'), '\nmessage Broken { string missingNumber; }\n');
        }],
        ['invalid default module ID', fixture => {
            fixture.routes.defaultModuleId = 256;
            fixture.saveRoutes();
        }],
        ['invalid command ID', fixture => {
            fixture.routes.routes.HelloReq.commandId = 2147483648;
            fixture.saveRoutes();
        }],
        ['duplicate incoming route', fixture => {
            fixture.routes.routes.NtfHello.commandId = fixture.routes.routes.HelloResp.commandId;
            fixture.saveRoutes();
        }],
        ['duplicate outgoing route', fixture => {
            fs.appendFileSync(path.join(fixture.projectRoot, 'proto/hello.proto'), '\nmessage OtherReq { string value = 1; }\n');
            fixture.routes.routes.OtherReq = { commandId: fixture.routes.routes.HelloReq.commandId };
            fixture.saveRoutes();
        }],
        ['misspelled route module field', fixture => {
            fixture.routes.routes.HelloReq.moduleid = 2;
            fixture.saveRoutes();
        }],
        ['unknown configuration field', fixture => {
            fixture.routes.defaultModuleID = 2;
            fixture.saveRoutes();
        }],
        ['route pointing to removed message', fixture => {
            fixture.routes.routes.RemovedResp = { commandId: 2000 };
            fixture.saveRoutes();
        }],
        ['route assigned to a data structure', fixture => {
            fixture.routes.routes.Item = { commandId: 2000 };
            fixture.saveRoutes();
        }],
    ];
    for (const [name, mutate] of scenarios) {
        await t.test(name, async child => {
            const fixture = createFixture(child);
            await generate(fixture);
            const previous = snapshotOutputs(fixture);
            mutate(fixture);
            await assert.rejects(generate(fixture));
            assertOutputsUnchanged(fixture, previous);
        });
    }
});

test('explicit roles and per-message module overrides are applied', async t => {
    const fixture = createFixture(t);
    fs.appendFileSync(path.join(fixture.projectRoot, 'proto/hello.proto'), '\nmessage CustomPush { string value = 1; }\n');
    fixture.routes.roles = { CustomPush: 'server' };
    fixture.routes.routes.CustomPush = { commandId: 1001, moduleId: 2 };
    fixture.saveRoutes();
    await generate(fixture);
    const enumSource = readOutput(fixture, OUTPUT_FILES[2]);
    assert.match(enumSource, /CustomPush\s*=\s*['"]CustomPush['"]/);
    const routesModule = executeGenerated(readOutput(fixture, OUTPUT_FILES[3]), '{ PROTO_ROUTES }');
    assert.equal(routesModule.PROTO_ROUTES.CustomPush.commandId, 1001);
    assert.equal(routesModule.PROTO_ROUTES.CustomPush.moduleId, 2);
    assert.equal(routesModule.PROTO_ROUTES.HelloResp.moduleId, 1);
});

test('nested network messages are rejected instead of silently producing unusable routes', async t => {
    const fixture = createFixture(t);
    await generate(fixture);
    const previous = snapshotOutputs(fixture);
    fs.appendFileSync(path.join(fixture.projectRoot, 'proto/hello.proto'), '\nmessage Wrapper { message InnerReq { string value = 1; } }\n');
    await assert.rejects(generate(fixture));
    assertOutputsUnchanged(fixture, previous);
});

const USER_PROTO = `syntax = "proto3";
package com.message;
message User {
    int64 id = 1;
    string name = 2;
}
`;

test('flat User codecs round-trip int64 while both roles retain source package event and route names', async t => {
    const fixture = createFixture(t);
    writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO);
    await generate(fixture);
    let enums = executeGenerated(readOutput(fixture, OUTPUT_FILES[2]), '{ ProtoRequestType, ProtoServerMessageType }');
    assert.equal(enums.ProtoRequestType.User, undefined, 'an unclassified User is a data structure');
    assert.equal(enums.ProtoServerMessageType.User, undefined);

    fixture.routes.roles = { 'com.message.User': 'both', 'pb.HelloReq': 'request' };
    fixture.routes.routes['com.message.User'] = { commandId: 1004 };
    fixture.routes.routes['pb.HelloReq'] = fixture.routes.routes.HelloReq;
    delete fixture.routes.routes.HelloReq;
    fixture.saveRoutes();
    await generate(fixture, { strict: true });

    const source = readOutput(fixture, OUTPUT_FILES[0]);
    assert.deepEqual([...source.matchAll(/^export const (\w+)/gm)].map(match => match[1]), ['pbType']);
    const runtime = executeGenerated(source, '{ pbType, String }', {
        __protobuf: require('protobufjs/minimal.js'),
    });
    assert.equal(runtime.pbType.com, undefined);
    assert.equal(runtime.pbType.pb, undefined);
    const message = runtime.pbType.User.fromObject({ id: '9007199254740993', name: '测试用户' });
    const decoded = runtime.pbType.User.decode(runtime.pbType.User.encode(message).finish());
    assert.equal(decoded.id.toString(), '9007199254740993');
    assert.equal(decoded.name, '测试用户');
    // protobufjs compares constructors by identity, so use the generated code's realm.
    assert.equal(runtime.pbType.User.toObject(decoded, { longs: runtime.String }).id, '9007199254740993');
    assert.equal(runtime.pbType.User.getTypeUrl(), 'type.googleapis.com/com.message.User');
    assert.deepEqual([...readOutput(fixture, OUTPUT_FILES[1]).matchAll(/^export namespace (\w+)/gm)].map(match => match[1]), ['pbType']);
    assert.match(readOutput(fixture, OUTPUT_FILES[1]), /interface\s+IUser\b/);

    enums = executeGenerated(readOutput(fixture, OUTPUT_FILES[2]), '{ ProtoRequestType, ProtoServerMessageType }');
    assert.equal(enums.ProtoRequestType.User, 'com.message.User');
    assert.equal(enums.ProtoServerMessageType.User, 'com.message.User');
    assert.equal(enums.ProtoRequestType.HelloReq, 'HelloReq');
    assert.equal(enums.ProtoServerMessageType.HelloResp, 'HelloResp');
    const { PROTO_ROUTES } = executeGenerated(readOutput(fixture, OUTPUT_FILES[3]), '{ PROTO_ROUTES }');
    assert.equal(PROTO_ROUTES['com.message.User'].commandId, 1004);
    assert.equal(PROTO_ROUTES['com.message.User'].moduleId, 1);
    assert.equal(PROTO_ROUTES.User, undefined);
    assert.equal(PROTO_ROUTES.HelloReq.commandId, 1001);
    assert.equal(PROTO_ROUTES['pb.HelloReq'], undefined, 'pb full names normalize to their existing message value');
});

test('a project without package pb generates flat codecs and still infers Req/Resp source roles', async t => {
    const fixture = createFixture(t);
    fs.unlinkSync(path.join(fixture.projectRoot, 'proto/hello.proto'));
    fs.unlinkSync(path.join(fixture.projectRoot, 'proto/shared/common.proto'));
    writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO + `
message LookupReq { User user = 1; }
message LookupResp { User user = 1; }
`);
    fixture.routes.routes = {
        'com.message.LookupReq': { commandId: 20 },
        'com.message.LookupResp': { commandId: 20 },
    };
    fixture.saveRoutes();
    await generate(fixture, { strict: true });
    const enums = executeGenerated(readOutput(fixture, OUTPUT_FILES[2]), '{ ProtoRequestType, ProtoServerMessageType }');
    assert.equal(enums.ProtoRequestType.LookupReq, 'com.message.LookupReq');
    assert.equal(enums.ProtoServerMessageType.LookupResp, 'com.message.LookupResp');
    assert.equal(enums.ProtoRequestType.User, undefined);
    const runtime = executeGenerated(readOutput(fixture, OUTPUT_FILES[0]), '{ pbType }', {
        __protobuf: require('protobufjs/minimal.js'),
    });
    assert.equal(runtime.pbType.pb, undefined);
    assert.equal(runtime.pbType.com, undefined);
    const request = runtime.pbType.LookupReq.fromObject({ user: { id: '9007199254740993', name: '无 pb 包' } });
    const decoded = runtime.pbType.LookupReq.decode(runtime.pbType.LookupReq.encode(request).finish());
    assert.equal(decoded.user.id.toString(), '9007199254740993');
    assert.equal(decoded.user.name, '无 pb 包');
});

test('flat cross-package codecs preserve original wire bytes, nested types, enums and Any type URLs', async t => {
    const fixture = createFixture(t);
    const userFile = writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO);
    const loginFile = writeFile(fixture.projectRoot, 'proto/login.proto', `syntax = "proto3";
package com.game.hjwz.message;
import "user.proto";
import "shared/common.proto";
import "google/protobuf/any.proto";

enum AccountState { UNKNOWN = 0; READY = 1; }
message AccountLoginReq {
    com.message.User user = 1;
    repeated pb.Item inventory = 2;
    map<string, com.message.User> users = 3;
    AccountState state = 4;
    google.protobuf.Any attached = 5;
    map<string, int64> counters = 6;
    repeated AccountState state_history = 7;
}
message AccountLoginResp { com.message.User user = 1; }
`);
    const resultFile = writeFile(fixture.projectRoot, 'proto/result.proto', `syntax = "proto3";
import "google/protobuf/any.proto";
message Result {
    int32 code = 1;
    google.protobuf.Any content = 2;
}
`);
    fixture.routes.routes['com.game.hjwz.message.AccountLoginReq'] = { commandId: 1007 };
    fixture.routes.routes['com.game.hjwz.message.AccountLoginResp'] = { commandId: 1007 };
    fixture.saveRoutes();
    const originalInputs = new Map([
        userFile, loginFile, resultFile,
        path.join(fixture.projectRoot, 'proto/hello.proto'),
        path.join(fixture.projectRoot, 'proto/shared/common.proto'),
        path.join(fixture.projectRoot, 'proto/routes.json'),
    ].map(filename => [filename, fs.readFileSync(filename, 'utf8')]));

    // The reflection codecs use the untouched source packages as an independent wire reference.
    const protobuf = require('protobufjs');
    const originalRoot = new protobuf.Root().loadSync([
        userFile, loginFile, resultFile, path.join(fixture.projectRoot, 'proto/hello.proto'),
    ], { keepCase: true }).resolveAll();
    const originalUser = originalRoot.lookupType('com.message.User');
    const userData = { id: '9007199254740993', name: '跨包用户' };
    const userBytes = originalUser.encode(originalUser.fromObject(userData)).finish();
    const typeUrl = 'type.googleapis.com/com.message.User';
    const requestData = {
        user: userData,
        inventory: [{ id: '1001', stats: { hp: 99 }, quality: 'RARE' }],
        users: { primary: userData, secondary: { id: '9007199254740995', name: '另一个用户' } },
        state: 'READY',
        attached: { type_url: typeUrl, value: userBytes },
        counters: { gold: '9007199254740997' },
        state_history: ['UNKNOWN', 'READY'],
    };
    const originalRequest = originalRoot.lookupType('com.game.hjwz.message.AccountLoginReq');
    const expectedRequestBytes = originalRequest.encode(originalRequest.fromObject(requestData)).finish();
    await generate(fixture, { strict: true });
    const source = readOutput(fixture, OUTPUT_FILES[0]);
    const { pbType } = executeGenerated(source, '{ pbType }', { __protobuf: require('protobufjs/minimal.js') });
    assert.deepEqual([...source.matchAll(/^export const (\w+)/gm)].map(match => match[1]), ['pbType']);
    assert.equal(pbType.com, undefined);
    assert.equal(pbType.pb, undefined);
    assert.equal(pbType.google, undefined);
    assert.ok(pbType.Item.Stats, 'nested data helpers remain under their owning message');
    assert.equal(pbType.ItemQuality.RARE, 1);
    assert.equal(pbType.AccountState.READY, 1);
    assert.ok(pbType.Any, 'imported Google Any is available in the same flat namespace');

    const flatUserBytes = pbType.User.encode(pbType.User.fromObject(userData)).finish();
    assert.deepEqual(Buffer.from(flatUserBytes), Buffer.from(userBytes));
    const flatRequest = pbType.AccountLoginReq.fromObject(requestData);
    const flatRequestBytes = pbType.AccountLoginReq.encode(flatRequest).finish();
    assert.deepEqual(Buffer.from(flatRequestBytes), Buffer.from(expectedRequestBytes), 'flattening must preserve the original wire format');
    const decoded = pbType.AccountLoginReq.decode(expectedRequestBytes);
    assert.equal(decoded.user.id.toString(), userData.id);
    assert.equal(decoded.inventory[0].stats.hp, 99);
    assert.equal(decoded.inventory[0].quality, pbType.ItemQuality.RARE);
    assert.equal(decoded.users.secondary.id.toString(), '9007199254740995');
    assert.equal(decoded.counters.gold.toString(), '9007199254740997');
    assert.equal(decoded.state, pbType.AccountState.READY);
    assert.deepEqual(Array.from(decoded.state_history), [0, 1]);
    assert.equal(decoded.attached.type_url, typeUrl);
    assert.equal(pbType.User.decode(decoded.attached.value).id.toString(), userData.id);

    const resultData = { code: 0, content: { type_url: typeUrl, value: userBytes } };
    const originalResult = originalRoot.lookupType('Result');
    const expectedResultBytes = originalResult.encode(originalResult.fromObject(resultData)).finish();
    const flatResultBytes = pbType.Result.encode(pbType.Result.fromObject(resultData)).finish();
    assert.deepEqual(Buffer.from(flatResultBytes), Buffer.from(expectedResultBytes));
    const decodedResult = pbType.Result.decode(expectedResultBytes);
    assert.ok(decodedResult.content instanceof pbType.Any);
    assert.equal(decodedResult.content.type_url, typeUrl);
    assert.equal(pbType.User.decode(decodedResult.content.value).name, userData.name);
    assert.equal(pbType.User.getTypeUrl(), typeUrl);
    assert.equal(pbType.User.getTypeUrl('custom.example'), 'custom.example/com.message.User');
    assert.equal(pbType.Any.getTypeUrl(), 'type.googleapis.com/google.protobuf.Any');
    assert.equal(pbType.Item.Stats.getTypeUrl(), 'type.googleapis.com/pb.Item.Stats');

    const definitions = readOutput(fixture, OUTPUT_FILES[1]);
    assert.deepEqual([...definitions.matchAll(/^export namespace (\w+)/gm)].map(match => match[1]), ['pbType']);
    assert.match(definitions, /content\??\s*:\s*\(pbType\.IAny\|null\)/);
    assert.match(definitions, /inventory\??\s*:\s*\(pbType\.IItem\[\]\|null\)/);
    assert.doesNotMatch(definitions, /\b(?:com\.message|com\.game|google\.protobuf|pb\.)/);
    const enums = executeGenerated(readOutput(fixture, OUTPUT_FILES[2]), '{ ProtoRequestType, ProtoServerMessageType }');
    assert.equal(enums.ProtoRequestType.AccountLoginReq, 'com.game.hjwz.message.AccountLoginReq');
    assert.equal(enums.ProtoServerMessageType.AccountLoginResp, 'com.game.hjwz.message.AccountLoginResp');
    for (const [filename, original] of originalInputs) assert.equal(fs.readFileSync(filename, 'utf8'), original);
});

test('both roles generate both enum members and a single null route until an ID is supplied', async t => {
    const fixture = createFixture(t);
    writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO);
    fixture.routes.roles = { 'com.message.User': 'both' };
    fixture.saveRoutes();
    const input = fs.readFileSync(path.join(fixture.projectRoot, 'proto/routes.json'), 'utf8');
    const result = await generate(fixture);
    assert.ok(result.warnings.some(warning => warning.includes('com.message.User')));
    const enums = executeGenerated(readOutput(fixture, OUTPUT_FILES[2]), '{ ProtoRequestType, ProtoServerMessageType }');
    assert.equal(enums.ProtoRequestType.User, 'com.message.User');
    assert.equal(enums.ProtoServerMessageType.User, 'com.message.User');
    const { PROTO_ROUTES } = executeGenerated(readOutput(fixture, OUTPUT_FILES[3]), '{ PROTO_ROUTES }');
    assert.equal(PROTO_ROUTES['com.message.User'], null);
    assert.equal(Object.keys(PROTO_ROUTES).filter(key => key === 'com.message.User').length, 1);
    const previous = snapshotOutputs(fixture);
    await assert.rejects(generate(fixture, { strict: true }));
    assertOutputsUnchanged(fixture, previous);
    assert.equal(fs.readFileSync(path.join(fixture.projectRoot, 'proto/routes.json'), 'utf8'), input);
});

test('colliding flat type names across packages fail without merging data or replacing outputs', async t => {
    const scenarios = [
        { name: 'two messages', typeName: 'User', alpha: 'message User { int64 id = 1; }', beta: 'message User { string name = 1; }' },
        { name: 'an enum and a message', typeName: 'LoginState', alpha: 'enum LoginState { UNKNOWN = 0; READY = 1; }', beta: 'message LoginState { string name = 1; }' },
    ];
    for (const { name, typeName, alpha, beta } of scenarios) {
        await t.test(name, async child => {
            const fixture = createFixture(child);
            writeFile(fixture.projectRoot, 'proto/alpha.proto', `syntax = "proto3"; package com.alpha; ${alpha}\n`);
            await generate(fixture, { strict: true });
            const previous = snapshotOutputs(fixture);
            const betaFile = writeFile(fixture.projectRoot, 'proto/beta.proto', `syntax = "proto3"; package com.beta; ${beta}\n`);
            await assert.rejects(generate(fixture), error => {
                assert.match(error.message, /冲突|同名|重复/);
                assert.ok(error.message.includes(`com.alpha.${typeName}`));
                assert.ok(error.message.includes(`com.beta.${typeName}`));
                return true;
            });
            assertOutputsUnchanged(fixture, previous);
            fs.unlinkSync(betaFile);
            const result = await generate(fixture, { strict: true });
            assert.deepEqual(result.changed, []);
        });
    }
});

test('ambiguous names and conflicts involving both-direction messages fail without replacing outputs', async t => {
    const scenarios = [
        ['short role key outside package pb', fixture => {
            fixture.routes.roles = { User: 'both' };
        }],
        ['short route key outside package pb', fixture => {
            fixture.routes.roles = { 'com.message.User': 'both' };
            fixture.routes.routes.User = { commandId: 1004 };
        }],
        ['both short and full pb role names', fixture => {
            fixture.routes.roles = { HelloReq: 'request', 'pb.HelloReq': 'request' };
        }],
        ['both short and full pb route names', fixture => {
            fixture.routes.routes['pb.HelloReq'] = { commandId: 1004 };
        }],
        ['a both-role route collides with an outgoing request', fixture => {
            fixture.routes.roles = { 'com.message.User': 'both' };
            fixture.routes.routes['com.message.User'] = { commandId: fixture.routes.routes.HelloReq.commandId };
        }],
        ['a both-role route collides with an incoming notification', fixture => {
            fixture.routes.roles = { 'com.message.User': 'both' };
            fixture.routes.routes['com.message.User'] = { commandId: fixture.routes.routes.NtfHello.commandId };
        }],
    ];
    for (const [name, mutate] of scenarios) {
        await t.test(name, async child => {
            const fixture = createFixture(child);
            writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO);
            await generate(fixture);
            const previous = snapshotOutputs(fixture);
            mutate(fixture);
            fixture.saveRoutes();
            await assert.rejects(generate(fixture));
            assertOutputsUnchanged(fixture, previous);
        });
    }
});

test('message keys with surrounding whitespace explain the correction and preserve generated outputs', async t => {
    const validKey = 'com.message.User';
    const scenarios = [
        { name: 'route message name with a trailing space', field: 'routes', invalidKey: `${validKey} ` },
        { name: 'role message name with a leading newline', field: 'roles', invalidKey: `\n${validKey}` },
    ];
    for (const { name, field, invalidKey } of scenarios) {
        await t.test(name, async child => {
            const fixture = createFixture(child);
            writeFile(fixture.projectRoot, 'proto/user.proto', USER_PROTO);
            fixture.routes.roles = { [validKey]: 'both' };
            fixture.routes.routes[validKey] = { commandId: 1004 };
            fixture.saveRoutes();
            await generate(fixture, { strict: true });
            const previous = snapshotOutputs(fixture);

            const configuration = fixture.routes[field];
            configuration[invalidKey] = configuration[validKey];
            delete configuration[validKey];
            fixture.saveRoutes();
            const routeFile = path.join(fixture.projectRoot, 'proto/routes.json');
            const invalidInput = fs.readFileSync(routeFile, 'utf8');
            await assert.rejects(generate(fixture), error => {
                assert.match(error.message, /首尾空白/);
                assert.ok(error.message.includes(field));
                assert.ok(error.message.includes(JSON.stringify(invalidKey)), 'diagnostic must show escaped whitespace');
                assert.ok(error.message.includes(JSON.stringify(validKey)), 'diagnostic must suggest the exact valid key');
                assert.doesNotMatch(error.message, /未知.*消息/);
                return true;
            });
            assertOutputsUnchanged(fixture, previous);
            assert.equal(fs.readFileSync(routeFile, 'utf8'), invalidInput, 'validation must not silently rewrite manual configuration');

            configuration[validKey] = configuration[invalidKey];
            delete configuration[invalidKey];
            fixture.saveRoutes();
            const result = await generate(fixture, { strict: true });
            assert.deepEqual(result.changed, []);
            assertOutputsUnchanged(fixture, previous);
        });
    }
});
