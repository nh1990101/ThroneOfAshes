// @ts-nocheck
/*eslint-disable*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root: typeof import("./ProtoDefined.d") = {};

export const pb: typeof $root.pb = $root.pb = (() => {

    /**
     * Namespace pb.
     * @exports pb
     * @namespace
     */
    const pb = {};

    pb.GMCMDDesc = (function() {

        /**
         * Properties of a GMCMDDesc.
         * @memberof pb
         * @interface IGMCMDDesc
         * @property {string|null} [category] GMCMDDesc category
         * @property {string|null} [desc] GMCMDDesc desc
         * @property {string|null} [cmd] GMCMDDesc cmd
         * @property {Array.<string>|null} [args] GMCMDDesc args
         */

        /**
         * Constructs a new GMCMDDesc.
         * @memberof pb
         * @classdesc Represents a GMCMDDesc.
         * @implements IGMCMDDesc
         * @constructor
         * @param {pb.IGMCMDDesc=} [properties] Properties to set
         */
        function GMCMDDesc(properties) {
            this.args = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

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
         * @param {pb.IGMCMDDesc=} [properties] Properties to set
         * @returns {pb.GMCMDDesc} GMCMDDesc instance
         */
        GMCMDDesc.create = function create(properties) {
            return new GMCMDDesc(properties);
        };

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @function encode
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.IGMCMDDesc} message GMCMDDesc message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GMCMDDesc.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.category != null && Object.hasOwnProperty.call(message, "category"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.category);
            if (message.desc != null && Object.hasOwnProperty.call(message, "desc"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.desc);
            if (message.cmd != null && Object.hasOwnProperty.call(message, "cmd"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.cmd);
            if (message.args != null && message.args.length)
                for (let i = 0; i < message.args.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.args[i]);
            return writer;
        };

        /**
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.GMCMDDesc
         * @static
         * @param {pb.IGMCMDDesc} message GMCMDDesc message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GMCMDDesc.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @function decode
         * @memberof pb.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.GMCMDDesc} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GMCMDDesc.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.GMCMDDesc();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.category = reader.string();
                        break;
                    }
                case 2: {
                        message.desc = reader.string();
                        break;
                    }
                case 3: {
                        message.cmd = reader.string();
                        break;
                    }
                case 4: {
                        if (!(message.args && message.args.length))
                            message.args = [];
                        message.args.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.GMCMDDesc} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GMCMDDesc.decodeDelimited = function decodeDelimited(reader) {
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
        GMCMDDesc.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.category != null && message.hasOwnProperty("category"))
                if (!$util.isString(message.category))
                    return "category: string expected";
            if (message.desc != null && message.hasOwnProperty("desc"))
                if (!$util.isString(message.desc))
                    return "desc: string expected";
            if (message.cmd != null && message.hasOwnProperty("cmd"))
                if (!$util.isString(message.cmd))
                    return "cmd: string expected";
            if (message.args != null && message.hasOwnProperty("args")) {
                if (!Array.isArray(message.args))
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
        GMCMDDesc.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.GMCMDDesc)
                return object;
            let message = new $root.pb.GMCMDDesc();
            if (object.category != null)
                message.category = String(object.category);
            if (object.desc != null)
                message.desc = String(object.desc);
            if (object.cmd != null)
                message.cmd = String(object.cmd);
            if (object.args) {
                if (!Array.isArray(object.args))
                    throw TypeError(".pb.GMCMDDesc.args: array expected");
                message.args = [];
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = String(object.args[i]);
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
        GMCMDDesc.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.args = [];
            if (options.defaults) {
                object.category = "";
                object.desc = "";
                object.cmd = "";
            }
            if (message.category != null && message.hasOwnProperty("category"))
                object.category = message.category;
            if (message.desc != null && message.hasOwnProperty("desc"))
                object.desc = message.desc;
            if (message.cmd != null && message.hasOwnProperty("cmd"))
                object.cmd = message.cmd;
            if (message.args && message.args.length) {
                object.args = [];
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
        GMCMDDesc.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GMCMDDesc
         * @function getTypeUrl
         * @memberof pb.GMCMDDesc
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GMCMDDesc.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.GMCMDDesc";
        };

        return GMCMDDesc;
    })();

    pb.NtfGMCMDInit = (function() {

        /**
         * Properties of a NtfGMCMDInit.
         * @memberof pb
         * @interface INtfGMCMDInit
         * @property {boolean|null} [enabled] NtfGMCMDInit enabled
         * @property {Array.<pb.IGMCMDDesc>|null} [cmds] NtfGMCMDInit cmds
         */

        /**
         * Constructs a new NtfGMCMDInit.
         * @memberof pb
         * @classdesc Represents a NtfGMCMDInit.
         * @implements INtfGMCMDInit
         * @constructor
         * @param {pb.INtfGMCMDInit=} [properties] Properties to set
         */
        function NtfGMCMDInit(properties) {
            this.cmds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * NtfGMCMDInit enabled.
         * @member {boolean} enabled
         * @memberof pb.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.enabled = false;

        /**
         * NtfGMCMDInit cmds.
         * @member {Array.<pb.IGMCMDDesc>} cmds
         * @memberof pb.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.cmds = $util.emptyArray;

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @function create
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.INtfGMCMDInit=} [properties] Properties to set
         * @returns {pb.NtfGMCMDInit} NtfGMCMDInit instance
         */
        NtfGMCMDInit.create = function create(properties) {
            return new NtfGMCMDInit(properties);
        };

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @function encode
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.INtfGMCMDInit} message NtfGMCMDInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NtfGMCMDInit.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.enabled != null && Object.hasOwnProperty.call(message, "enabled"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.enabled);
            if (message.cmds != null && message.cmds.length)
                for (let i = 0; i < message.cmds.length; ++i)
                    $root.pb.GMCMDDesc.encode(message.cmds[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {pb.INtfGMCMDInit} message NtfGMCMDInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NtfGMCMDInit.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @function decode
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.NtfGMCMDInit} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NtfGMCMDInit.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.NtfGMCMDInit();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.enabled = reader.bool();
                        break;
                    }
                case 2: {
                        if (!(message.cmds && message.cmds.length))
                            message.cmds = [];
                        message.cmds.push($root.pb.GMCMDDesc.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.NtfGMCMDInit} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NtfGMCMDInit.decodeDelimited = function decodeDelimited(reader) {
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
        NtfGMCMDInit.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.enabled != null && message.hasOwnProperty("enabled"))
                if (typeof message.enabled !== "boolean")
                    return "enabled: boolean expected";
            if (message.cmds != null && message.hasOwnProperty("cmds")) {
                if (!Array.isArray(message.cmds))
                    return "cmds: array expected";
                for (let i = 0; i < message.cmds.length; ++i) {
                    let error = $root.pb.GMCMDDesc.verify(message.cmds[i]);
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
        NtfGMCMDInit.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.NtfGMCMDInit)
                return object;
            let message = new $root.pb.NtfGMCMDInit();
            if (object.enabled != null)
                message.enabled = Boolean(object.enabled);
            if (object.cmds) {
                if (!Array.isArray(object.cmds))
                    throw TypeError(".pb.NtfGMCMDInit.cmds: array expected");
                message.cmds = [];
                for (let i = 0; i < object.cmds.length; ++i) {
                    if (typeof object.cmds[i] !== "object")
                        throw TypeError(".pb.NtfGMCMDInit.cmds: object expected");
                    message.cmds[i] = $root.pb.GMCMDDesc.fromObject(object.cmds[i]);
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
        NtfGMCMDInit.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.cmds = [];
            if (options.defaults)
                object.enabled = false;
            if (message.enabled != null && message.hasOwnProperty("enabled"))
                object.enabled = message.enabled;
            if (message.cmds && message.cmds.length) {
                object.cmds = [];
                for (let j = 0; j < message.cmds.length; ++j)
                    object.cmds[j] = $root.pb.GMCMDDesc.toObject(message.cmds[j], options);
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
        NtfGMCMDInit.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for NtfGMCMDInit
         * @function getTypeUrl
         * @memberof pb.NtfGMCMDInit
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        NtfGMCMDInit.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.NtfGMCMDInit";
        };

        return NtfGMCMDInit;
    })();

    pb.UseGMCMDReq = (function() {

        /**
         * Properties of a UseGMCMDReq.
         * @memberof pb
         * @interface IUseGMCMDReq
         * @property {string|null} [cmd] UseGMCMDReq cmd
         * @property {Array.<string>|null} [args] UseGMCMDReq args
         */

        /**
         * Constructs a new UseGMCMDReq.
         * @memberof pb
         * @classdesc Represents a UseGMCMDReq.
         * @implements IUseGMCMDReq
         * @constructor
         * @param {pb.IUseGMCMDReq=} [properties] Properties to set
         */
        function UseGMCMDReq(properties) {
            this.args = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

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
         * @param {pb.IUseGMCMDReq=} [properties] Properties to set
         * @returns {pb.UseGMCMDReq} UseGMCMDReq instance
         */
        UseGMCMDReq.create = function create(properties) {
            return new UseGMCMDReq(properties);
        };

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @function encode
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.IUseGMCMDReq} message UseGMCMDReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDReq.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.cmd != null && Object.hasOwnProperty.call(message, "cmd"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.cmd);
            if (message.args != null && message.args.length)
                for (let i = 0; i < message.args.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.args[i]);
            return writer;
        };

        /**
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {pb.IUseGMCMDReq} message UseGMCMDReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDReq.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @function decode
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.UseGMCMDReq} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDReq.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.UseGMCMDReq();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.cmd = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.args && message.args.length))
                            message.args = [];
                        message.args.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDReq} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDReq.decodeDelimited = function decodeDelimited(reader) {
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
        UseGMCMDReq.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.cmd != null && message.hasOwnProperty("cmd"))
                if (!$util.isString(message.cmd))
                    return "cmd: string expected";
            if (message.args != null && message.hasOwnProperty("args")) {
                if (!Array.isArray(message.args))
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
        UseGMCMDReq.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.UseGMCMDReq)
                return object;
            let message = new $root.pb.UseGMCMDReq();
            if (object.cmd != null)
                message.cmd = String(object.cmd);
            if (object.args) {
                if (!Array.isArray(object.args))
                    throw TypeError(".pb.UseGMCMDReq.args: array expected");
                message.args = [];
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = String(object.args[i]);
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
        UseGMCMDReq.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.args = [];
            if (options.defaults)
                object.cmd = "";
            if (message.cmd != null && message.hasOwnProperty("cmd"))
                object.cmd = message.cmd;
            if (message.args && message.args.length) {
                object.args = [];
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
        UseGMCMDReq.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for UseGMCMDReq
         * @function getTypeUrl
         * @memberof pb.UseGMCMDReq
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        UseGMCMDReq.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.UseGMCMDReq";
        };

        return UseGMCMDReq;
    })();

    pb.UseGMCMDResp = (function() {

        /**
         * Properties of a UseGMCMDResp.
         * @memberof pb
         * @interface IUseGMCMDResp
         * @property {string|null} [msg] UseGMCMDResp msg
         */

        /**
         * Constructs a new UseGMCMDResp.
         * @memberof pb
         * @classdesc Represents a UseGMCMDResp.
         * @implements IUseGMCMDResp
         * @constructor
         * @param {pb.IUseGMCMDResp=} [properties] Properties to set
         */
        function UseGMCMDResp(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

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
         * @param {pb.IUseGMCMDResp=} [properties] Properties to set
         * @returns {pb.UseGMCMDResp} UseGMCMDResp instance
         */
        UseGMCMDResp.create = function create(properties) {
            return new UseGMCMDResp(properties);
        };

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @function encode
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.IUseGMCMDResp} message UseGMCMDResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDResp.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.msg);
            return writer;
        };

        /**
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {pb.IUseGMCMDResp} message UseGMCMDResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDResp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @function decode
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.UseGMCMDResp} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDResp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.UseGMCMDResp();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.msg = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDResp} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDResp.decodeDelimited = function decodeDelimited(reader) {
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
        UseGMCMDResp.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.msg != null && message.hasOwnProperty("msg"))
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
        UseGMCMDResp.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.UseGMCMDResp)
                return object;
            let message = new $root.pb.UseGMCMDResp();
            if (object.msg != null)
                message.msg = String(object.msg);
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
        UseGMCMDResp.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.msg = "";
            if (message.msg != null && message.hasOwnProperty("msg"))
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
        UseGMCMDResp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for UseGMCMDResp
         * @function getTypeUrl
         * @memberof pb.UseGMCMDResp
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        UseGMCMDResp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.UseGMCMDResp";
        };

        return UseGMCMDResp;
    })();

    pb.HelloReq = (function() {

        /**
         * Properties of a HelloReq.
         * @memberof pb
         * @interface IHelloReq
         * @property {string|null} [content] HelloReq content
         */

        /**
         * Constructs a new HelloReq.
         * @memberof pb
         * @classdesc Represents a HelloReq.
         * @implements IHelloReq
         * @constructor
         * @param {pb.IHelloReq=} [properties] Properties to set
         */
        function HelloReq(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

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
         * @param {pb.IHelloReq=} [properties] Properties to set
         * @returns {pb.HelloReq} HelloReq instance
         */
        HelloReq.create = function create(properties) {
            return new HelloReq(properties);
        };

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @function encode
         * @memberof pb.HelloReq
         * @static
         * @param {pb.IHelloReq} message HelloReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloReq.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.content != null && Object.hasOwnProperty.call(message, "content"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content);
            return writer;
        };

        /**
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.HelloReq
         * @static
         * @param {pb.IHelloReq} message HelloReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloReq.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @function decode
         * @memberof pb.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.HelloReq} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloReq.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.HelloReq();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.content = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a HelloReq message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.HelloReq} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloReq.decodeDelimited = function decodeDelimited(reader) {
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
        HelloReq.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.content != null && message.hasOwnProperty("content"))
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
        HelloReq.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.HelloReq)
                return object;
            let message = new $root.pb.HelloReq();
            if (object.content != null)
                message.content = String(object.content);
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
        HelloReq.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.content = "";
            if (message.content != null && message.hasOwnProperty("content"))
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
        HelloReq.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HelloReq
         * @function getTypeUrl
         * @memberof pb.HelloReq
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HelloReq.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.HelloReq";
        };

        return HelloReq;
    })();

    pb.HelloResp = (function() {

        /**
         * Properties of a HelloResp.
         * @memberof pb
         * @interface IHelloResp
         * @property {string|null} [content] HelloResp content
         * @property {number|Long|null} [serverTime] HelloResp serverTime
         */

        /**
         * Constructs a new HelloResp.
         * @memberof pb
         * @classdesc Represents a HelloResp.
         * @implements IHelloResp
         * @constructor
         * @param {pb.IHelloResp=} [properties] Properties to set
         */
        function HelloResp(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

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
         * @param {pb.IHelloResp=} [properties] Properties to set
         * @returns {pb.HelloResp} HelloResp instance
         */
        HelloResp.create = function create(properties) {
            return new HelloResp(properties);
        };

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @function encode
         * @memberof pb.HelloResp
         * @static
         * @param {pb.IHelloResp} message HelloResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloResp.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.content != null && Object.hasOwnProperty.call(message, "content"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content);
            if (message.serverTime != null && Object.hasOwnProperty.call(message, "serverTime"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.serverTime);
            return writer;
        };

        /**
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pb.HelloResp
         * @static
         * @param {pb.IHelloResp} message HelloResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloResp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @function decode
         * @memberof pb.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pb.HelloResp} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloResp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pb.HelloResp();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.content = reader.string();
                        break;
                    }
                case 2: {
                        message.serverTime = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a HelloResp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pb.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pb.HelloResp} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloResp.decodeDelimited = function decodeDelimited(reader) {
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
        HelloResp.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.content != null && message.hasOwnProperty("content"))
                if (!$util.isString(message.content))
                    return "content: string expected";
            if (message.serverTime != null && message.hasOwnProperty("serverTime"))
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
        HelloResp.fromObject = function fromObject(object) {
            if (object instanceof $root.pb.HelloResp)
                return object;
            let message = new $root.pb.HelloResp();
            if (object.content != null)
                message.content = String(object.content);
            if (object.serverTime != null)
                if ($util.Long)
                    (message.serverTime = $util.Long.fromValue(object.serverTime)).unsigned = false;
                else if (typeof object.serverTime === "string")
                    message.serverTime = parseInt(object.serverTime, 10);
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
        HelloResp.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.content = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.serverTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.serverTime = options.longs === String ? "0" : 0;
            }
            if (message.content != null && message.hasOwnProperty("content"))
                object.content = message.content;
            if (message.serverTime != null && message.hasOwnProperty("serverTime"))
                if (typeof message.serverTime === "number")
                    object.serverTime = options.longs === String ? String(message.serverTime) : message.serverTime;
                else
                    object.serverTime = options.longs === String ? $util.Long.prototype.toString.call(message.serverTime) : options.longs === Number ? new $util.LongBits(message.serverTime.low >>> 0, message.serverTime.high >>> 0).toNumber() : message.serverTime;
            return object;
        };

        /**
         * Converts this HelloResp to JSON.
         * @function toJSON
         * @memberof pb.HelloResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HelloResp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HelloResp
         * @function getTypeUrl
         * @memberof pb.HelloResp
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HelloResp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/pb.HelloResp";
        };

        return HelloResp;
    })();

    return pb;
})();

export { $root as default };
