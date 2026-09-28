/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
const $protobuf = require("protobufjs/minimal.js");

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $Array = $util.global.Array, $TypeError = $util.global.TypeError, $String = $util.global.String, $Boolean = $util.global.Boolean, $Number = $util.global.Number, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

const pb = $root.pb = (() => {

    /**
     * Namespace pb.
     * @exports pb
     * @namespace
     */
    const pb = {};

    pb.GMCMDDesc = (function() {

        /**
         * Properties of a GMCMDDesc.
         * @typedef {Object} pb.GMCMDDesc.$Properties
         * @property {string|null} [category] GMCMDDesc category
         * @property {string|null} [desc] GMCMDDesc desc
         * @property {string|null} [cmd] GMCMDDesc cmd
         * @property {Array.<string>|null} [args] GMCMDDesc args
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a GMCMDDesc.
         * @memberof pb
         * @interface IGMCMDDesc
         * @augments pb.GMCMDDesc.$Properties
         * @deprecated Use pb.GMCMDDesc.$Properties instead.
         */

        /**
         * Shape of a GMCMDDesc.
         * @typedef {pb.GMCMDDesc.$Properties} pb.GMCMDDesc.$Shape
         */

        /**
         * Constructs a new GMCMDDesc.
         * @memberof pb
         * @classdesc Represents a GMCMDDesc.
         * @constructor
         * @param {pb.GMCMDDesc.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const GMCMDDesc = function (properties) {
            this.args = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * GMCMDDesc category.
         * @member {string} category
         * @memberof pb.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.category = "";

        /**
         * GMCMDDesc desc.
         * @member {string} desc
         * @memberof pb.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.desc = "";

        /**
         * GMCMDDesc cmd.
         * @member {string} cmd
         * @memberof pb.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.cmd = "";

        /**
         * GMCMDDesc args.
         * @member {Array.<string>} args
         * @memberof pb.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.args = $util.emptyArray;

        /**
         * Creates a new GMCMDDesc instance using the specified properties.
         * @function create
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.GMCMDDesc.$Properties=} [properties] Properties to set
         * @returns {pb.GMCMDDesc} GMCMDDesc instance
         * @type {{
         *   (properties: pb.GMCMDDesc.$Shape): pb.GMCMDDesc & pb.GMCMDDesc.$Shape;
         *   (properties?: pb.GMCMDDesc.$Properties): pb.GMCMDDesc;
         * }}
         */
        GMCMDDesc.create = function(properties) {
            return new GMCMDDesc(properties);
        };

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @function encode
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.GMCMDDesc.$Properties} message GMCMDDesc message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GMCMDDesc.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.category != null && $Object.hasOwnProperty.call(message, "category") && message.category !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.category);
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc") && message.desc !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.desc);
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd") && message.cmd !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.cmd);
            if (message.args != null && message.args.length)
                for (let i = 0; i < message.args.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.args[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.GMCMDDesc.$Properties} message GMCMDDesc message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GMCMDDesc.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @function decode
         * @memberof pb.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.GMCMDDesc & pb.GMCMDDesc.$Shape} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GMCMDDesc.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.GMCMDDesc();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.category = value;
                        else
                            delete message.category;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.desc = value;
                        else
                            delete message.desc;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.cmd = value;
                        else
                            delete message.cmd;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if (!(message.args && message.args.length))
                            message.args = [];
                        message.args.push(reader.stringVerify());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.GMCMDDesc & pb.GMCMDDesc.$Shape} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GMCMDDesc.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GMCMDDesc message.
         * @function verify
         * @memberof pb.GMCMDDesc
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GMCMDDesc.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.category != null && $Object.hasOwnProperty.call(message, "category"))
                if (!$util.isString(message.category))
                    return "category: string expected";
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc"))
                if (!$util.isString(message.desc))
                    return "desc: string expected";
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd"))
                if (!$util.isString(message.cmd))
                    return "cmd: string expected";
            if (message.args != null && $Object.hasOwnProperty.call(message, "args")) {
                if (!$Array.isArray(message.args))
                    return "args: array expected";
                for (let i = 0; i < message.args.length; ++i)
                    if (!$util.isString(message.args[i]))
                        return "args: string[] expected";
            }
            return null;
        };

        /**
         * Creates a GMCMDDesc message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.GMCMDDesc
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.GMCMDDesc} GMCMDDesc
         */
        GMCMDDesc.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.GMCMDDesc)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.GMCMDDesc: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.GMCMDDesc();
            if (object.category != null)
                if (typeof object.category !== "string" || object.category.length)
                    message.category = $String(object.category);
            if (object.desc != null)
                if (typeof object.desc !== "string" || object.desc.length)
                    message.desc = $String(object.desc);
            if (object.cmd != null)
                if (typeof object.cmd !== "string" || object.cmd.length)
                    message.cmd = $String(object.cmd);
            if (object.args) {
                if (!$Array.isArray(object.args))
                    throw $TypeError(".pb.GMCMDDesc.args: array expected");
                message.args = $Array(object.args.length);
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = $String(object.args[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a GMCMDDesc message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.GMCMDDesc} message GMCMDDesc
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GMCMDDesc.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.args = [];
            if (options.defaults) {
                object.category = "";
                object.desc = "";
                object.cmd = "";
            }
            if (message.category != null && $Object.hasOwnProperty.call(message, "category"))
                object.category = message.category;
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc"))
                object.desc = message.desc;
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd"))
                object.cmd = message.cmd;
            if (message.args && message.args.length) {
                object.args = $Array(message.args.length);
                for (let j = 0; j < message.args.length; ++j)
                    object.args[j] = message.args[j];
            }
            return object;
        };

        /**
         * Converts this GMCMDDesc to JSON.
         * @function toJSON
         * @memberof pb.GMCMDDesc
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GMCMDDesc.prototype.toJSON = function() {
            return GMCMDDesc.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GMCMDDesc
         * @function getTypeUrl
         * @memberof pb.GMCMDDesc
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GMCMDDesc.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.GMCMDDesc";
        };

        return GMCMDDesc;
    })();

    pb.NtfGMCMDInit = (function() {

        /**
         * Properties of a NtfGMCMDInit.
         * @typedef {Object} pb.NtfGMCMDInit.$Properties
         * @property {boolean|null} [enabled] NtfGMCMDInit enabled
         * @property {Array.<pb.GMCMDDesc.$Properties>|null} [cmds] NtfGMCMDInit cmds
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a NtfGMCMDInit.
         * @memberof pb
         * @interface INtfGMCMDInit
         * @augments pb.NtfGMCMDInit.$Properties
         * @deprecated Use pb.NtfGMCMDInit.$Properties instead.
         */

        /**
         * Shape of a NtfGMCMDInit.
         * @typedef {pb.NtfGMCMDInit.$Properties} pb.NtfGMCMDInit.$Shape
         */

        /**
         * Constructs a new NtfGMCMDInit.
         * @memberof pb
         * @classdesc Represents a NtfGMCMDInit.
         * @constructor
         * @param {pb.NtfGMCMDInit.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const NtfGMCMDInit = function (properties) {
            this.cmds = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * NtfGMCMDInit enabled.
         * @member {boolean} enabled
         * @memberof pb.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.enabled = false;

        /**
         * NtfGMCMDInit cmds.
         * @member {Array.<pb.GMCMDDesc.$Properties>} cmds
         * @memberof pb.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.cmds = $util.emptyArray;

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @function create
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.NtfGMCMDInit.$Properties=} [properties] Properties to set
         * @returns {pb.NtfGMCMDInit} NtfGMCMDInit instance
         * @type {{
         *   (properties: pb.NtfGMCMDInit.$Shape): pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape;
         *   (properties?: pb.NtfGMCMDInit.$Properties): pb.NtfGMCMDInit;
         * }}
         */
        NtfGMCMDInit.create = function(properties) {
            return new NtfGMCMDInit(properties);
        };

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @function encode
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.NtfGMCMDInit.$Properties} message NtfGMCMDInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NtfGMCMDInit.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled") && message.enabled !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.enabled);
            if (message.cmds != null && message.cmds.length)
                for (let i = 0; i < message.cmds.length; ++i)
                    $root.pb.GMCMDDesc.encode(message.cmds[i], writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.NtfGMCMDInit.$Properties} message NtfGMCMDInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NtfGMCMDInit.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @function decode
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NtfGMCMDInit.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.NtfGMCMDInit();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.enabled = value;
                        else
                            delete message.enabled;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.cmds && message.cmds.length))
                            message.cmds = [];
                        message.cmds.push($root.pb.GMCMDDesc.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NtfGMCMDInit.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a NtfGMCMDInit message.
         * @function verify
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        NtfGMCMDInit.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled"))
                if (typeof message.enabled !== "boolean")
                    return "enabled: boolean expected";
            if (message.cmds != null && $Object.hasOwnProperty.call(message, "cmds")) {
                if (!$Array.isArray(message.cmds))
                    return "cmds: array expected";
                for (let i = 0; i < message.cmds.length; ++i) {
                    let error = $root.pb.GMCMDDesc.verify(message.cmds[i], _depth + 1);
                    if (error)
                        return "cmds." + error;
                }
            }
            return null;
        };

        /**
         * Creates a NtfGMCMDInit message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.NtfGMCMDInit} NtfGMCMDInit
         */
        NtfGMCMDInit.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.NtfGMCMDInit)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.NtfGMCMDInit: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.NtfGMCMDInit();
            if (object.enabled != null)
                if (object.enabled)
                    message.enabled = $Boolean(object.enabled);
            if (object.cmds) {
                if (!$Array.isArray(object.cmds))
                    throw $TypeError(".pb.NtfGMCMDInit.cmds: array expected");
                message.cmds = $Array(object.cmds.length);
                for (let i = 0; i < object.cmds.length; ++i) {
                    if (!$util.isObject(object.cmds[i]))
                        throw $TypeError(".pb.NtfGMCMDInit.cmds: object expected");
                    message.cmds[i] = $root.pb.GMCMDDesc.fromObject(object.cmds[i], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a NtfGMCMDInit message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.NtfGMCMDInit} message NtfGMCMDInit
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        NtfGMCMDInit.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.cmds = [];
            if (options.defaults)
                object.enabled = false;
            if (message.enabled != null && $Object.hasOwnProperty.call(message, "enabled"))
                object.enabled = message.enabled;
            if (message.cmds && message.cmds.length) {
                object.cmds = $Array(message.cmds.length);
                for (let j = 0; j < message.cmds.length; ++j)
                    object.cmds[j] = $root.pb.GMCMDDesc.toObject(message.cmds[j], options, _depth + 1);
            }
            return object;
        };

        /**
         * Converts this NtfGMCMDInit to JSON.
         * @function toJSON
         * @memberof pb.NtfGMCMDInit
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        NtfGMCMDInit.prototype.toJSON = function() {
            return NtfGMCMDInit.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for NtfGMCMDInit
         * @function getTypeUrl
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        NtfGMCMDInit.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.NtfGMCMDInit";
        };

        return NtfGMCMDInit;
    })();

    pb.UseGMCMDReq = (function() {

        /**
         * Properties of a UseGMCMDReq.
         * @typedef {Object} pb.UseGMCMDReq.$Properties
         * @property {string|null} [cmd] UseGMCMDReq cmd
         * @property {Array.<string>|null} [args] UseGMCMDReq args
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a UseGMCMDReq.
         * @memberof pb
         * @interface IUseGMCMDReq
         * @augments pb.UseGMCMDReq.$Properties
         * @deprecated Use pb.UseGMCMDReq.$Properties instead.
         */

        /**
         * Shape of a UseGMCMDReq.
         * @typedef {pb.UseGMCMDReq.$Properties} pb.UseGMCMDReq.$Shape
         */

        /**
         * Constructs a new UseGMCMDReq.
         * @memberof pb
         * @classdesc Represents a UseGMCMDReq.
         * @constructor
         * @param {pb.UseGMCMDReq.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const UseGMCMDReq = function (properties) {
            this.args = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * UseGMCMDReq cmd.
         * @member {string} cmd
         * @memberof pb.UseGMCMDReq
         * @instance
         */
        UseGMCMDReq.prototype.cmd = "";

        /**
         * UseGMCMDReq args.
         * @member {Array.<string>} args
         * @memberof pb.UseGMCMDReq
         * @instance
         */
        UseGMCMDReq.prototype.args = $util.emptyArray;

        /**
         * Creates a new UseGMCMDReq instance using the specified properties.
         * @function create
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.UseGMCMDReq.$Properties=} [properties] Properties to set
         * @returns {pb.UseGMCMDReq} UseGMCMDReq instance
         * @type {{
         *   (properties: pb.UseGMCMDReq.$Shape): pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape;
         *   (properties?: pb.UseGMCMDReq.$Properties): pb.UseGMCMDReq;
         * }}
         */
        UseGMCMDReq.create = function(properties) {
            return new UseGMCMDReq(properties);
        };

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @function encode
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.UseGMCMDReq.$Properties} message UseGMCMDReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDReq.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd") && message.cmd !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.cmd);
            if (message.args != null && message.args.length)
                for (let i = 0; i < message.args.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.args[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.UseGMCMDReq.$Properties} message UseGMCMDReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDReq.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @function decode
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDReq.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.UseGMCMDReq();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.cmd = value;
                        else
                            delete message.cmd;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if (!(message.args && message.args.length))
                            message.args = [];
                        message.args.push(reader.stringVerify());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDReq.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a UseGMCMDReq message.
         * @function verify
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        UseGMCMDReq.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd"))
                if (!$util.isString(message.cmd))
                    return "cmd: string expected";
            if (message.args != null && $Object.hasOwnProperty.call(message, "args")) {
                if (!$Array.isArray(message.args))
                    return "args: array expected";
                for (let i = 0; i < message.args.length; ++i)
                    if (!$util.isString(message.args[i]))
                        return "args: string[] expected";
            }
            return null;
        };

        /**
         * Creates a UseGMCMDReq message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.UseGMCMDReq} UseGMCMDReq
         */
        UseGMCMDReq.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.UseGMCMDReq)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.UseGMCMDReq: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.UseGMCMDReq();
            if (object.cmd != null)
                if (typeof object.cmd !== "string" || object.cmd.length)
                    message.cmd = $String(object.cmd);
            if (object.args) {
                if (!$Array.isArray(object.args))
                    throw $TypeError(".pb.UseGMCMDReq.args: array expected");
                message.args = $Array(object.args.length);
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = $String(object.args[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a UseGMCMDReq message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.UseGMCMDReq} message UseGMCMDReq
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        UseGMCMDReq.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.args = [];
            if (options.defaults)
                object.cmd = "";
            if (message.cmd != null && $Object.hasOwnProperty.call(message, "cmd"))
                object.cmd = message.cmd;
            if (message.args && message.args.length) {
                object.args = $Array(message.args.length);
                for (let j = 0; j < message.args.length; ++j)
                    object.args[j] = message.args[j];
            }
            return object;
        };

        /**
         * Converts this UseGMCMDReq to JSON.
         * @function toJSON
         * @memberof pb.UseGMCMDReq
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UseGMCMDReq.prototype.toJSON = function() {
            return UseGMCMDReq.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for UseGMCMDReq
         * @function getTypeUrl
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        UseGMCMDReq.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.UseGMCMDReq";
        };

        return UseGMCMDReq;
    })();

    pb.UseGMCMDResp = (function() {

        /**
         * Properties of a UseGMCMDResp.
         * @typedef {Object} pb.UseGMCMDResp.$Properties
         * @property {string|null} [msg] UseGMCMDResp msg
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a UseGMCMDResp.
         * @memberof pb
         * @interface IUseGMCMDResp
         * @augments pb.UseGMCMDResp.$Properties
         * @deprecated Use pb.UseGMCMDResp.$Properties instead.
         */

        /**
         * Shape of a UseGMCMDResp.
         * @typedef {pb.UseGMCMDResp.$Properties} pb.UseGMCMDResp.$Shape
         */

        /**
         * Constructs a new UseGMCMDResp.
         * @memberof pb
         * @classdesc Represents a UseGMCMDResp.
         * @constructor
         * @param {pb.UseGMCMDResp.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const UseGMCMDResp = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * UseGMCMDResp msg.
         * @member {string} msg
         * @memberof pb.UseGMCMDResp
         * @instance
         */
        UseGMCMDResp.prototype.msg = "";

        /**
         * Creates a new UseGMCMDResp instance using the specified properties.
         * @function create
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.UseGMCMDResp.$Properties=} [properties] Properties to set
         * @returns {pb.UseGMCMDResp} UseGMCMDResp instance
         * @type {{
         *   (properties: pb.UseGMCMDResp.$Shape): pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape;
         *   (properties?: pb.UseGMCMDResp.$Properties): pb.UseGMCMDResp;
         * }}
         */
        UseGMCMDResp.create = function(properties) {
            return new UseGMCMDResp(properties);
        };

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @function encode
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.UseGMCMDResp.$Properties} message UseGMCMDResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDResp.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.msg != null && $Object.hasOwnProperty.call(message, "msg") && message.msg !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.msg);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.UseGMCMDResp.$Properties} message UseGMCMDResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDResp.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @function decode
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDResp.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.UseGMCMDResp();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.msg = value;
                        else
                            delete message.msg;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDResp.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a UseGMCMDResp message.
         * @function verify
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        UseGMCMDResp.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.msg != null && $Object.hasOwnProperty.call(message, "msg"))
                if (!$util.isString(message.msg))
                    return "msg: string expected";
            return null;
        };

        /**
         * Creates a UseGMCMDResp message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.UseGMCMDResp} UseGMCMDResp
         */
        UseGMCMDResp.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.UseGMCMDResp)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.UseGMCMDResp: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.UseGMCMDResp();
            if (object.msg != null)
                if (typeof object.msg !== "string" || object.msg.length)
                    message.msg = $String(object.msg);
            return message;
        };

        /**
         * Creates a plain object from a UseGMCMDResp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.UseGMCMDResp} message UseGMCMDResp
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        UseGMCMDResp.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.msg = "";
            if (message.msg != null && $Object.hasOwnProperty.call(message, "msg"))
                object.msg = message.msg;
            return object;
        };

        /**
         * Converts this UseGMCMDResp to JSON.
         * @function toJSON
         * @memberof pb.UseGMCMDResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UseGMCMDResp.prototype.toJSON = function() {
            return UseGMCMDResp.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for UseGMCMDResp
         * @function getTypeUrl
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        UseGMCMDResp.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.UseGMCMDResp";
        };

        return UseGMCMDResp;
    })();

    pb.HelloReq = (function() {

        /**
         * Properties of a HelloReq.
         * @typedef {Object} pb.HelloReq.$Properties
         * @property {string|null} [content] HelloReq content
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a HelloReq.
         * @memberof pb
         * @interface IHelloReq
         * @augments pb.HelloReq.$Properties
         * @deprecated Use pb.HelloReq.$Properties instead.
         */

        /**
         * Shape of a HelloReq.
         * @typedef {pb.HelloReq.$Properties} pb.HelloReq.$Shape
         */

        /**
         * Constructs a new HelloReq.
         * @memberof pb
         * @classdesc Represents a HelloReq.
         * @constructor
         * @param {pb.HelloReq.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const HelloReq = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * HelloReq content.
         * @member {string} content
         * @memberof pb.HelloReq
         * @instance
         */
        HelloReq.prototype.content = "";

        /**
         * Creates a new HelloReq instance using the specified properties.
         * @function create
         * @memberof pb.HelloReq
         * @static
         * @param {pb.HelloReq.$Properties=} [properties] Properties to set
         * @returns {pb.HelloReq} HelloReq instance
         * @type {{
         *   (properties: pb.HelloReq.$Shape): pb.HelloReq & pb.HelloReq.$Shape;
         *   (properties?: pb.HelloReq.$Properties): pb.HelloReq;
         * }}
         */
        HelloReq.create = function(properties) {
            return new HelloReq(properties);
        };

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @function encode
         * @memberof pb.HelloReq
         * @static
         * @param {pb.HelloReq.$Properties} message HelloReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloReq.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.content != null && $Object.hasOwnProperty.call(message, "content") && message.content !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.HelloReq
         * @static
         * @param {pb.HelloReq.$Properties} message HelloReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloReq.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @function decode
         * @memberof pb.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.HelloReq & pb.HelloReq.$Shape} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloReq.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.HelloReq();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.content = value;
                        else
                            delete message.content;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a HelloReq message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.HelloReq & pb.HelloReq.$Shape} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloReq.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HelloReq message.
         * @function verify
         * @memberof pb.HelloReq
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HelloReq.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                if (!$util.isString(message.content))
                    return "content: string expected";
            return null;
        };

        /**
         * Creates a HelloReq message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.HelloReq
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.HelloReq} HelloReq
         */
        HelloReq.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.HelloReq)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.HelloReq: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.HelloReq();
            if (object.content != null)
                if (typeof object.content !== "string" || object.content.length)
                    message.content = $String(object.content);
            return message;
        };

        /**
         * Creates a plain object from a HelloReq message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.HelloReq
         * @static
         * @param {pb.HelloReq} message HelloReq
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HelloReq.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.content = "";
            if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                object.content = message.content;
            return object;
        };

        /**
         * Converts this HelloReq to JSON.
         * @function toJSON
         * @memberof pb.HelloReq
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HelloReq.prototype.toJSON = function() {
            return HelloReq.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for HelloReq
         * @function getTypeUrl
         * @memberof pb.HelloReq
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        HelloReq.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.HelloReq";
        };

        return HelloReq;
    })();

    pb.HelloResp = (function() {

        /**
         * Properties of a HelloResp.
         * @typedef {Object} pb.HelloResp.$Properties
         * @property {string|null} [content] HelloResp content
         * @property {number|Long|null} [serverTime] HelloResp serverTime
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a HelloResp.
         * @memberof pb
         * @interface IHelloResp
         * @augments pb.HelloResp.$Properties
         * @deprecated Use pb.HelloResp.$Properties instead.
         */

        /**
         * Shape of a HelloResp.
         * @typedef {pb.HelloResp.$Properties} pb.HelloResp.$Shape
         */

        /**
         * Constructs a new HelloResp.
         * @memberof pb
         * @classdesc Represents a HelloResp.
         * @constructor
         * @param {pb.HelloResp.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const HelloResp = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * HelloResp content.
         * @member {string} content
         * @memberof pb.HelloResp
         * @instance
         */
        HelloResp.prototype.content = "";

        /**
         * HelloResp serverTime.
         * @member {number|Long} serverTime
         * @memberof pb.HelloResp
         * @instance
         */
        HelloResp.prototype.serverTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new HelloResp instance using the specified properties.
         * @function create
         * @memberof pb.HelloResp
         * @static
         * @param {pb.HelloResp.$Properties=} [properties] Properties to set
         * @returns {pb.HelloResp} HelloResp instance
         * @type {{
         *   (properties: pb.HelloResp.$Shape): pb.HelloResp & pb.HelloResp.$Shape;
         *   (properties?: pb.HelloResp.$Properties): pb.HelloResp;
         * }}
         */
        HelloResp.create = function(properties) {
            return new HelloResp(properties);
        };

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @function encode
         * @memberof pb.HelloResp
         * @static
         * @param {pb.HelloResp.$Properties} message HelloResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloResp.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.content != null && $Object.hasOwnProperty.call(message, "content") && message.content !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content);
            if (message.serverTime != null && $Object.hasOwnProperty.call(message, "serverTime") && (typeof message.serverTime === "object" ? message.serverTime.low || message.serverTime.high : message.serverTime !== 0))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.serverTime);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.HelloResp
         * @static
         * @param {pb.HelloResp.$Properties} message HelloResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloResp.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @function decode
         * @memberof pb.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.HelloResp & pb.HelloResp.$Shape} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloResp.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.pb.HelloResp();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.content = value;
                        else
                            delete message.content;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.serverTime = value;
                        else
                            delete message.serverTime;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a HelloResp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.HelloResp & pb.HelloResp.$Shape} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloResp.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HelloResp message.
         * @function verify
         * @memberof pb.HelloResp
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HelloResp.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                if (!$util.isString(message.content))
                    return "content: string expected";
            if (message.serverTime != null && $Object.hasOwnProperty.call(message, "serverTime"))
                if (!$util.isInteger(message.serverTime) && !(message.serverTime && $util.isInteger(message.serverTime.low) && $util.isInteger(message.serverTime.high)))
                    return "serverTime: integer|Long expected";
            return null;
        };

        /**
         * Creates a HelloResp message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pb.HelloResp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pb.HelloResp} HelloResp
         */
        HelloResp.fromObject = function (object, _depth) {
            if (object instanceof $root.pb.HelloResp)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".pb.HelloResp: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.pb.HelloResp();
            if (object.content != null)
                if (typeof object.content !== "string" || object.content.length)
                    message.content = $String(object.content);
            if (object.serverTime != null)
                if (typeof object.serverTime === "object" ? object.serverTime.low || object.serverTime.high : $Number(object.serverTime) !== 0)
                    if ($util.Long)
                        message.serverTime = $util.Long.fromValue(object.serverTime, false);
                    else if (typeof object.serverTime === "string")
                        message.serverTime = $parseInt(object.serverTime, 10);
                    else if (typeof object.serverTime === "number")
                        message.serverTime = object.serverTime;
                    else if (typeof object.serverTime === "object")
                        message.serverTime = new $util.LongBits(object.serverTime.low >>> 0, object.serverTime.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a HelloResp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pb.HelloResp
         * @static
         * @param {pb.HelloResp} message HelloResp
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HelloResp.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.content = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.serverTime = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.serverTime = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                object.content = message.content;
            if (message.serverTime != null && $Object.hasOwnProperty.call(message, "serverTime"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.serverTime = typeof message.serverTime === "number" ? $BigInt(message.serverTime) : $util.Long.fromBits(message.serverTime.low >>> 0, message.serverTime.high >>> 0, false).toBigInt();
                else if (typeof message.serverTime === "number")
                    object.serverTime = options.longs === $String ? $String(message.serverTime) : message.serverTime;
                else
                    object.serverTime = options.longs === $String ? $util.Long.prototype.toString.call(message.serverTime) : options.longs === $Number ? new $util.LongBits(message.serverTime.low >>> 0, message.serverTime.high >>> 0).toNumber() : message.serverTime;
            return object;
        };

        /**
         * Converts this HelloResp to JSON.
         * @function toJSON
         * @memberof pb.HelloResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HelloResp.prototype.toJSON = function() {
            return HelloResp.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for HelloResp
         * @function getTypeUrl
         * @memberof pb.HelloResp
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        HelloResp.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/pb.HelloResp";
        };

        return HelloResp;
    })();

    return pb;
})();

module.exports = { pb, $root };
