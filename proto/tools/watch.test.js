'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const OUTPUT_FILES = [
    'assets/script/WebSocket/proto/ProtoDefined.ts',
    'assets/script/WebSocket/proto/ProtoDefined.d.ts',
    'assets/script/WebSocket/ProtoMessageType.ts',
    'assets/script/WebSocket/ProtoRoutes.ts',
];

const INITIAL_PROTO = `syntax = "proto3";
package pb;
message TestReq { string content = 1; }
message TestResp { string content = 1; }
`;

function createFixture(t) {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgcore-proto-watch-test-'));
    const projectRoot = path.join(temporaryDirectory, 'client with spaces');
    const protoDirectory = path.join(projectRoot, 'proto');
    fs.mkdirSync(path.join(protoDirectory, 'tools'), { recursive: true });
    for (const relativePath of ['auto-compile.js', 'tools/generator.js', 'tools/schema.js', 'tools/namespace.js']) {
        fs.copyFileSync(path.resolve(__dirname, '..', relativePath), path.join(protoDirectory, relativePath));
    }

    const routes = {
        testOnly: true,
        defaultModuleId: 1,
        routes: { TestReq: { commandId: 11 }, TestResp: { commandId: 11 } },
    };
    const protoPath = path.join(protoDirectory, 'test.proto');
    const routesPath = path.join(protoDirectory, 'routes.json');
    const saveRoutes = () => fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2) + '\n');
    fs.writeFileSync(protoPath, INITIAL_PROTO);
    saveRoutes();
    const lockFile = path.join(os.tmpdir(), 'rpgcore-proto-'
        + crypto.createHash('sha256').update(projectRoot.toLowerCase()).digest('hex').slice(0, 20) + '.lock');

    let watcher;
    t.after(async () => {
        if (watcher) await watcher.stop();
        if (fs.existsSync(lockFile)) {
            const owner = fs.readFileSync(lockFile, 'utf8');
            assert.ok(owner === String(process.pid) || owner === String(watcher?.child.pid), 'only remove this fixture lock');
            fs.unlinkSync(lockFile);
        }
        const resolved = path.resolve(temporaryDirectory);
        assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert.ok(path.basename(resolved).startsWith('rpgcore-proto-watch-test-'));
        fs.rmSync(resolved, { recursive: true, force: true });
    });

    return {
        projectRoot,
        protoDirectory,
        protoPath,
        routesPath,
        routes,
        lockFile,
        saveRoutes,
        read(relativePath) {
            const filename = path.join(projectRoot, relativePath);
            return fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
        },
        start() {
            watcher = startWatcher(projectRoot);
            return watcher;
        },
    };
}

function startWatcher(projectRoot) {
    const dependenciesDirectory = path.resolve(__dirname, '../../node_modules');
    const child = spawn(process.execPath, [path.join(projectRoot, 'proto/auto-compile.js'), '--watch'], {
        cwd: projectRoot,
        windowsHide: true,
        env: {
            ...process.env,
            NODE_PATH: [dependenciesDirectory, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const watcher = { child, stdout: '', stderr: '', exited: false, error: null };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', data => { watcher.stdout += data; });
    child.stderr.on('data', data => { watcher.stderr += data; });
    const exit = new Promise(resolve => {
        child.once('exit', (code, signal) => {
            watcher.exited = true;
            watcher.exitCode = code;
            watcher.signal = signal;
            resolve();
        });
        child.once('error', error => {
            watcher.error = error;
            watcher.exited = true;
            resolve();
        });
    });
    watcher.generations = () => (watcher.stdout.match(/生成完成/g) || []).length;
    watcher.waitFor = async (predicate, description, timeout = 5000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            if (predicate()) return;
            if (watcher.exited) {
                assert.fail(`watch process exited before ${description}: ${watcher.error || watcher.exitCode}\n${watcher.stdout}\n${watcher.stderr}`);
            }
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        assert.fail(`timed out waiting for ${description}\n${watcher.stdout}\n${watcher.stderr}`);
    };
    watcher.waitForBuild = (previous, predicate, description) => watcher.waitFor(
        () => watcher.generations() > previous && predicate(), description,
    );
    watcher.stop = async () => {
        if (watcher.exited) return;
        child.kill('SIGTERM');
        let timeout;
        try {
            await Promise.race([
                exit,
                new Promise((_, reject) => {
                    timeout = setTimeout(() => reject(new Error('watch process did not exit after SIGTERM')), 3000);
                }),
            ]);
        } catch (error) {
            child.kill('SIGKILL');
            await exit;
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    };
    return watcher;
}

test('watch rebuilds modified/added/deleted protocols and routes, and recovers from invalid syntax', { timeout: 18000 }, async t => {
    const fixture = createFixture(t);
    const watcher = fixture.start();
    await watcher.waitFor(
        () => watcher.stdout.includes('正在监听')
            && fixture.read(OUTPUT_FILES[3]).includes('moduleId: 1')
            && /^export const pbType\b/m.test(fixture.read(OUTPUT_FILES[0])),
        'initial generation and watch readiness',
    );

    let previous = watcher.generations();
    const modifiedProto = INITIAL_PROTO.replace('string content = 1; }', 'string content = 1; int32 count = 2; }');
    fs.writeFileSync(fixture.protoPath, modifiedProto);
    await watcher.waitForBuild(previous,
        () => /count\??\s*:/.test(fixture.read(OUTPUT_FILES[1])), 'modified protocol field');

    previous = watcher.generations();
    const addedDirectory = path.join(fixture.protoDirectory, 'new directory');
    fs.mkdirSync(addedDirectory);
    const addedProtoPath = path.join(addedDirectory, 'extra.proto');
    fs.writeFileSync(addedProtoPath, 'syntax = "proto3"; package pb; message ExtraReq {} message ExtraResp {}\n');
    await watcher.waitForBuild(previous,
        () => fixture.read(OUTPUT_FILES[2]).includes("ExtraReq = 'ExtraReq'")
            && /['"]ExtraResp['"]\s*:\s*null/.test(fixture.read(OUTPUT_FILES[3])),
        'new protocol in a newly added directory');

    previous = watcher.generations();
    fixture.routes.defaultModuleId = 3;
    fixture.routes.routes.ExtraReq = { commandId: 21 };
    fixture.routes.routes.ExtraResp = { commandId: 21 };
    fixture.saveRoutes();
    await watcher.waitForBuild(previous,
        () => /['"]ExtraResp['"]\s*:\s*\{ commandId: 21, moduleId: 3 \}/.test(fixture.read(OUTPUT_FILES[3])),
        'route configuration change');

    const beforeError = new Map(OUTPUT_FILES.map(filename => [filename, fixture.read(filename)]));
    const errorCursor = watcher.stderr.length;
    fs.appendFileSync(fixture.protoPath, '\nmessage Broken { string missingNumber; }\n');
    await watcher.waitFor(
        () => /illegal|expected|语法|非法/i.test(watcher.stderr.slice(errorCursor)),
        'invalid protocol diagnostic',
    );
    for (const [filename, source] of beforeError) assert.equal(fixture.read(filename), source);

    previous = watcher.generations();
    fs.writeFileSync(fixture.protoPath, modifiedProto + '\nmessage FixedData { string marker = 1; }\n');
    await watcher.waitForBuild(previous,
        () => fixture.read(OUTPUT_FILES[0]).includes('FixedData'), 'generation after syntax repair');

    previous = watcher.generations();
    fs.unlinkSync(addedProtoPath);
    delete fixture.routes.routes.ExtraReq;
    delete fixture.routes.routes.ExtraResp;
    fixture.saveRoutes();
    await watcher.waitForBuild(previous,
        () => !fixture.read(OUTPUT_FILES[2]).includes('ExtraReq')
            && !fixture.read(OUTPUT_FILES[3]).includes('ExtraResp')
            && fixture.read(OUTPUT_FILES[0]).includes('FixedData'),
        'deleted protocol removal from generated enums and routes');
    assert.equal(watcher.exited, false);
});

test('watch retries an initially busy generator after the lock is released without another save', { timeout: 10000 }, async t => {
    const fixture = createFixture(t);
    fs.writeFileSync(fixture.lockFile, String(process.pid), { flag: 'wx' });
    const inputSnapshot = new Map([fixture.protoPath, fixture.routesPath].map(filename => [filename, {
        source: fs.readFileSync(filename, 'utf8'),
        modifiedAt: fs.statSync(filename).mtimeMs,
    }]));
    const watcher = fixture.start();
    await watcher.waitFor(
        () => watcher.stdout.includes('正在监听') && /已有 Proto 编译|PROTO_BUSY|编译繁忙/.test(watcher.stderr),
        'initial busy diagnostic',
    );
    assert.equal(fixture.read(OUTPUT_FILES[0]), '');
    assert.equal(fs.readFileSync(fixture.lockFile, 'utf8'), String(process.pid));
    fs.unlinkSync(fixture.lockFile);

    await watcher.waitForBuild(0,
        () => fixture.read(OUTPUT_FILES[0]).includes('TestReq')
            && fixture.read(OUTPUT_FILES[3]).includes('moduleId: 1'),
        'retry after unlocking without another input change');
    for (const [filename, snapshot] of inputSnapshot) {
        assert.equal(fs.readFileSync(filename, 'utf8'), snapshot.source);
        assert.equal(fs.statSync(filename).mtimeMs, snapshot.modifiedAt);
    }
});
