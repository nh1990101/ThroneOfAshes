// @ts-nocheck
// 自动生成，请修改 proto 源文件后运行 npm run proto。
/*eslint-disable*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root: typeof import("./ProtoDefined.d") = {};

export const pbType: typeof $root.pbType = $root.pbType = (() => {

    /**
     * Namespace pbType.
     * @exports pbType
     * @namespace
     */
    const pbType = {};

    pbType.Account = (function() {

        /**
         * Properties of an Account.
         * @memberof pbType
         * @interface IAccount
         * @property {number|Long|null} [id] 账户编号
         * @property {string|null} [account_name] 账号
         * @property {pbType.AccountState|null} [state] 状态
         * @property {number|Long|null} [created_time] 创建时间
         */

        /**
         * Constructs a new Account.
         * @memberof pbType
         * @classdesc Represents an Account.
         * @implements IAccount
         * @constructor
         * @param {pbType.IAccount=} [properties] Properties to set
         */
        function Account(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * 账户编号
         * @member {number|Long} id
         * @memberof pbType.Account
         * @instance
         */
        Account.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * 账号
         * @member {string} account_name
         * @memberof pbType.Account
         * @instance
         */
        Account.prototype.account_name = "";

        /**
         * 状态
         * @member {pbType.AccountState} state
         * @memberof pbType.Account
         * @instance
         */
        Account.prototype.state = 0;

        /**
         * 创建时间
         * @member {number|Long} created_time
         * @memberof pbType.Account
         * @instance
         */
        Account.prototype.created_time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new Account instance using the specified properties.
         * @function create
         * @memberof pbType.Account
         * @static
         * @param {pbType.IAccount=} [properties] Properties to set
         * @returns {pbType.Account} Account instance
         */
        Account.create = function create(properties) {
            return new Account(properties);
        };

        /**
         * Encodes the specified Account message. Does not implicitly {@link pbType.Account.verify|verify} messages.
         * @function encode
         * @memberof pbType.Account
         * @static
         * @param {pbType.IAccount} message Account message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Account.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).sint64(message.id);
            if (message.account_name != null && Object.hasOwnProperty.call(message, "account_name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.account_name);
            if (message.state != null && Object.hasOwnProperty.call(message, "state"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.state);
            if (message.created_time != null && Object.hasOwnProperty.call(message, "created_time"))
                writer.uint32(/* id 4, wireType 0 =*/32).int64(message.created_time);
            return writer;
        };

        /**
         * Encodes the specified Account message, length delimited. Does not implicitly {@link pbType.Account.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.Account
         * @static
         * @param {pbType.IAccount} message Account message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Account.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Account message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.Account
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.Account} Account
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Account.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.Account();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.sint64();
                        break;
                    }
                case 2: {
                        message.account_name = reader.string();
                        break;
                    }
                case 3: {
                        message.state = reader.int32();
                        break;
                    }
                case 4: {
                        message.created_time = reader.int64();
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
         * Decodes an Account message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.Account
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.Account} Account
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Account.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Account message.
         * @function verify
         * @memberof pbType.Account
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Account.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                    return "id: integer|Long expected";
            if (message.account_name != null && message.hasOwnProperty("account_name"))
                if (!$util.isString(message.account_name))
                    return "account_name: string expected";
            if (message.state != null && message.hasOwnProperty("state"))
                switch (message.state) {
                default:
                    return "state: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            if (message.created_time != null && message.hasOwnProperty("created_time"))
                if (!$util.isInteger(message.created_time) && !(message.created_time && $util.isInteger(message.created_time.low) && $util.isInteger(message.created_time.high)))
                    return "created_time: integer|Long expected";
            return null;
        };

        /**
         * Creates an Account message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.Account
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.Account} Account
         */
        Account.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.Account)
                return object;
            let message = new $root.pbType.Account();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.account_name != null)
                message.account_name = String(object.account_name);
            switch (object.state) {
            default:
                if (typeof object.state === "number") {
                    message.state = object.state;
                    break;
                }
                break;
            case "NORMAL":
            case 0:
                message.state = 0;
                break;
            case "BLOCK":
            case 1:
                message.state = 1;
                break;
            case "ZERO":
            case 2:
                message.state = 2;
                break;
            case "CLEAN":
            case 3:
                message.state = 3;
                break;
            }
            if (object.created_time != null)
                if ($util.Long)
                    (message.created_time = $util.Long.fromValue(object.created_time)).unsigned = false;
                else if (typeof object.created_time === "string")
                    message.created_time = parseInt(object.created_time, 10);
                else if (typeof object.created_time === "number")
                    message.created_time = object.created_time;
                else if (typeof object.created_time === "object")
                    message.created_time = new $util.LongBits(object.created_time.low >>> 0, object.created_time.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from an Account message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.Account
         * @static
         * @param {pbType.Account} message Account
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Account.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.account_name = "";
                object.state = options.enums === String ? "NORMAL" : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.created_time = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.created_time = options.longs === String ? "0" : 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.account_name != null && message.hasOwnProperty("account_name"))
                object.account_name = message.account_name;
            if (message.state != null && message.hasOwnProperty("state"))
                object.state = options.enums === String ? $root.pbType.AccountState[message.state] === undefined ? message.state : $root.pbType.AccountState[message.state] : message.state;
            if (message.created_time != null && message.hasOwnProperty("created_time"))
                if (typeof message.created_time === "number")
                    object.created_time = options.longs === String ? String(message.created_time) : message.created_time;
                else
                    object.created_time = options.longs === String ? $util.Long.prototype.toString.call(message.created_time) : options.longs === Number ? new $util.LongBits(message.created_time.low >>> 0, message.created_time.high >>> 0).toNumber() : message.created_time;
            return object;
        };

        /**
         * Converts this Account to JSON.
         * @function toJSON
         * @memberof pbType.Account
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Account.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Account
         * @function getTypeUrl
         * @memberof pbType.Account
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Account.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/com.game.hjwz.message.Account";
        };

        return Account;
    })();

    pbType.AccountLoginReq = (function() {

        /**
         * Properties of an AccountLoginReq.
         * @memberof pbType
         * @interface IAccountLoginReq
         * @property {string|null} [account_name] 账号名(平台传过来的用户Id)
         * @property {string|null} [device_model] 设备型号
         * @property {string|null} [os_name] 系统名称
         * @property {string|null} [os_ver] 系统版本
         * @property {string|null} [channel] 运营渠道
         * @property {string|null} [client_ver] 客户端版本(资源版本号)
         * @property {string|null} [token] token标识(登录服返回的加密串)
         * @property {string|null} [network] 联网类型
         * @property {string|null} [sdk_ver] sdk版本
         * @property {string|null} [login_addr] 登录服地址
         * @property {number|Long|null} [timestamp] 时间戳
         * @property {number|null} [os_type] ios 0/android 1
         * @property {string|null} [reg_channel] 注册渠道
         * @property {string|null} [login_channel] 登陆渠道
         */

        /**
         * Constructs a new AccountLoginReq.
         * @memberof pbType
         * @classdesc Represents an AccountLoginReq.
         * @implements IAccountLoginReq
         * @constructor
         * @param {pbType.IAccountLoginReq=} [properties] Properties to set
         */
        function AccountLoginReq(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * 账号名(平台传过来的用户Id)
         * @member {string} account_name
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.account_name = "";

        /**
         * 设备型号
         * @member {string} device_model
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.device_model = "";

        /**
         * 系统名称
         * @member {string} os_name
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.os_name = "";

        /**
         * 系统版本
         * @member {string} os_ver
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.os_ver = "";

        /**
         * 运营渠道
         * @member {string} channel
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.channel = "";

        /**
         * 客户端版本(资源版本号)
         * @member {string} client_ver
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.client_ver = "";

        /**
         * token标识(登录服返回的加密串)
         * @member {string} token
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.token = "";

        /**
         * 联网类型
         * @member {string} network
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.network = "";

        /**
         * sdk版本
         * @member {string} sdk_ver
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.sdk_ver = "";

        /**
         * 登录服地址
         * @member {string} login_addr
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.login_addr = "";

        /**
         * 时间戳
         * @member {number|Long} timestamp
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * ios 0/android 1
         * @member {number} os_type
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.os_type = 0;

        /**
         * 注册渠道
         * @member {string} reg_channel
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.reg_channel = "";

        /**
         * 登陆渠道
         * @member {string} login_channel
         * @memberof pbType.AccountLoginReq
         * @instance
         */
        AccountLoginReq.prototype.login_channel = "";

        /**
         * Creates a new AccountLoginReq instance using the specified properties.
         * @function create
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {pbType.IAccountLoginReq=} [properties] Properties to set
         * @returns {pbType.AccountLoginReq} AccountLoginReq instance
         */
        AccountLoginReq.create = function create(properties) {
            return new AccountLoginReq(properties);
        };

        /**
         * Encodes the specified AccountLoginReq message. Does not implicitly {@link pbType.AccountLoginReq.verify|verify} messages.
         * @function encode
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {pbType.IAccountLoginReq} message AccountLoginReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AccountLoginReq.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.account_name != null && Object.hasOwnProperty.call(message, "account_name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.account_name);
            if (message.device_model != null && Object.hasOwnProperty.call(message, "device_model"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.device_model);
            if (message.os_name != null && Object.hasOwnProperty.call(message, "os_name"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.os_name);
            if (message.os_ver != null && Object.hasOwnProperty.call(message, "os_ver"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.os_ver);
            if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.channel);
            if (message.client_ver != null && Object.hasOwnProperty.call(message, "client_ver"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.client_ver);
            if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.token);
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 8, wireType 2 =*/66).string(message.network);
            if (message.sdk_ver != null && Object.hasOwnProperty.call(message, "sdk_ver"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.sdk_ver);
            if (message.login_addr != null && Object.hasOwnProperty.call(message, "login_addr"))
                writer.uint32(/* id 10, wireType 2 =*/82).string(message.login_addr);
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 11, wireType 0 =*/88).int64(message.timestamp);
            if (message.os_type != null && Object.hasOwnProperty.call(message, "os_type"))
                writer.uint32(/* id 12, wireType 0 =*/96).int32(message.os_type);
            if (message.reg_channel != null && Object.hasOwnProperty.call(message, "reg_channel"))
                writer.uint32(/* id 13, wireType 2 =*/106).string(message.reg_channel);
            if (message.login_channel != null && Object.hasOwnProperty.call(message, "login_channel"))
                writer.uint32(/* id 14, wireType 2 =*/114).string(message.login_channel);
            return writer;
        };

        /**
         * Encodes the specified AccountLoginReq message, length delimited. Does not implicitly {@link pbType.AccountLoginReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {pbType.IAccountLoginReq} message AccountLoginReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AccountLoginReq.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AccountLoginReq message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.AccountLoginReq} AccountLoginReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AccountLoginReq.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.AccountLoginReq();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.account_name = reader.string();
                        break;
                    }
                case 2: {
                        message.device_model = reader.string();
                        break;
                    }
                case 3: {
                        message.os_name = reader.string();
                        break;
                    }
                case 4: {
                        message.os_ver = reader.string();
                        break;
                    }
                case 5: {
                        message.channel = reader.string();
                        break;
                    }
                case 6: {
                        message.client_ver = reader.string();
                        break;
                    }
                case 7: {
                        message.token = reader.string();
                        break;
                    }
                case 8: {
                        message.network = reader.string();
                        break;
                    }
                case 9: {
                        message.sdk_ver = reader.string();
                        break;
                    }
                case 10: {
                        message.login_addr = reader.string();
                        break;
                    }
                case 11: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 12: {
                        message.os_type = reader.int32();
                        break;
                    }
                case 13: {
                        message.reg_channel = reader.string();
                        break;
                    }
                case 14: {
                        message.login_channel = reader.string();
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
         * Decodes an AccountLoginReq message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.AccountLoginReq} AccountLoginReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AccountLoginReq.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AccountLoginReq message.
         * @function verify
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AccountLoginReq.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.account_name != null && message.hasOwnProperty("account_name"))
                if (!$util.isString(message.account_name))
                    return "account_name: string expected";
            if (message.device_model != null && message.hasOwnProperty("device_model"))
                if (!$util.isString(message.device_model))
                    return "device_model: string expected";
            if (message.os_name != null && message.hasOwnProperty("os_name"))
                if (!$util.isString(message.os_name))
                    return "os_name: string expected";
            if (message.os_ver != null && message.hasOwnProperty("os_ver"))
                if (!$util.isString(message.os_ver))
                    return "os_ver: string expected";
            if (message.channel != null && message.hasOwnProperty("channel"))
                if (!$util.isString(message.channel))
                    return "channel: string expected";
            if (message.client_ver != null && message.hasOwnProperty("client_ver"))
                if (!$util.isString(message.client_ver))
                    return "client_ver: string expected";
            if (message.token != null && message.hasOwnProperty("token"))
                if (!$util.isString(message.token))
                    return "token: string expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            if (message.sdk_ver != null && message.hasOwnProperty("sdk_ver"))
                if (!$util.isString(message.sdk_ver))
                    return "sdk_ver: string expected";
            if (message.login_addr != null && message.hasOwnProperty("login_addr"))
                if (!$util.isString(message.login_addr))
                    return "login_addr: string expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.os_type != null && message.hasOwnProperty("os_type"))
                if (!$util.isInteger(message.os_type))
                    return "os_type: integer expected";
            if (message.reg_channel != null && message.hasOwnProperty("reg_channel"))
                if (!$util.isString(message.reg_channel))
                    return "reg_channel: string expected";
            if (message.login_channel != null && message.hasOwnProperty("login_channel"))
                if (!$util.isString(message.login_channel))
                    return "login_channel: string expected";
            return null;
        };

        /**
         * Creates an AccountLoginReq message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.AccountLoginReq} AccountLoginReq
         */
        AccountLoginReq.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.AccountLoginReq)
                return object;
            let message = new $root.pbType.AccountLoginReq();
            if (object.account_name != null)
                message.account_name = String(object.account_name);
            if (object.device_model != null)
                message.device_model = String(object.device_model);
            if (object.os_name != null)
                message.os_name = String(object.os_name);
            if (object.os_ver != null)
                message.os_ver = String(object.os_ver);
            if (object.channel != null)
                message.channel = String(object.channel);
            if (object.client_ver != null)
                message.client_ver = String(object.client_ver);
            if (object.token != null)
                message.token = String(object.token);
            if (object.network != null)
                message.network = String(object.network);
            if (object.sdk_ver != null)
                message.sdk_ver = String(object.sdk_ver);
            if (object.login_addr != null)
                message.login_addr = String(object.login_addr);
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.os_type != null)
                message.os_type = object.os_type | 0;
            if (object.reg_channel != null)
                message.reg_channel = String(object.reg_channel);
            if (object.login_channel != null)
                message.login_channel = String(object.login_channel);
            return message;
        };

        /**
         * Creates a plain object from an AccountLoginReq message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {pbType.AccountLoginReq} message AccountLoginReq
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AccountLoginReq.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.account_name = "";
                object.device_model = "";
                object.os_name = "";
                object.os_ver = "";
                object.channel = "";
                object.client_ver = "";
                object.token = "";
                object.network = "";
                object.sdk_ver = "";
                object.login_addr = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                object.os_type = 0;
                object.reg_channel = "";
                object.login_channel = "";
            }
            if (message.account_name != null && message.hasOwnProperty("account_name"))
                object.account_name = message.account_name;
            if (message.device_model != null && message.hasOwnProperty("device_model"))
                object.device_model = message.device_model;
            if (message.os_name != null && message.hasOwnProperty("os_name"))
                object.os_name = message.os_name;
            if (message.os_ver != null && message.hasOwnProperty("os_ver"))
                object.os_ver = message.os_ver;
            if (message.channel != null && message.hasOwnProperty("channel"))
                object.channel = message.channel;
            if (message.client_ver != null && message.hasOwnProperty("client_ver"))
                object.client_ver = message.client_ver;
            if (message.token != null && message.hasOwnProperty("token"))
                object.token = message.token;
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            if (message.sdk_ver != null && message.hasOwnProperty("sdk_ver"))
                object.sdk_ver = message.sdk_ver;
            if (message.login_addr != null && message.hasOwnProperty("login_addr"))
                object.login_addr = message.login_addr;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.os_type != null && message.hasOwnProperty("os_type"))
                object.os_type = message.os_type;
            if (message.reg_channel != null && message.hasOwnProperty("reg_channel"))
                object.reg_channel = message.reg_channel;
            if (message.login_channel != null && message.hasOwnProperty("login_channel"))
                object.login_channel = message.login_channel;
            return object;
        };

        /**
         * Converts this AccountLoginReq to JSON.
         * @function toJSON
         * @memberof pbType.AccountLoginReq
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AccountLoginReq.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AccountLoginReq
         * @function getTypeUrl
         * @memberof pbType.AccountLoginReq
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AccountLoginReq.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/com.game.hjwz.message.AccountLoginReq";
        };

        return AccountLoginReq;
    })();

    pbType.AccountLoginResp = (function() {

        /**
         * Properties of an AccountLoginResp.
         * @memberof pbType
         * @interface IAccountLoginResp
         * @property {pbType.IAccount|null} [account] 用户的帐号信息
         */

        /**
         * Constructs a new AccountLoginResp.
         * @memberof pbType
         * @classdesc Represents an AccountLoginResp.
         * @implements IAccountLoginResp
         * @constructor
         * @param {pbType.IAccountLoginResp=} [properties] Properties to set
         */
        function AccountLoginResp(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * 用户的帐号信息
         * @member {pbType.IAccount|null|undefined} account
         * @memberof pbType.AccountLoginResp
         * @instance
         */
        AccountLoginResp.prototype.account = null;

        /**
         * Creates a new AccountLoginResp instance using the specified properties.
         * @function create
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {pbType.IAccountLoginResp=} [properties] Properties to set
         * @returns {pbType.AccountLoginResp} AccountLoginResp instance
         */
        AccountLoginResp.create = function create(properties) {
            return new AccountLoginResp(properties);
        };

        /**
         * Encodes the specified AccountLoginResp message. Does not implicitly {@link pbType.AccountLoginResp.verify|verify} messages.
         * @function encode
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {pbType.IAccountLoginResp} message AccountLoginResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AccountLoginResp.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.account != null && Object.hasOwnProperty.call(message, "account"))
                $root.pbType.Account.encode(message.account, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified AccountLoginResp message, length delimited. Does not implicitly {@link pbType.AccountLoginResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {pbType.IAccountLoginResp} message AccountLoginResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AccountLoginResp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AccountLoginResp message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.AccountLoginResp} AccountLoginResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AccountLoginResp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.AccountLoginResp();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.account = $root.pbType.Account.decode(reader, reader.uint32());
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
         * Decodes an AccountLoginResp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.AccountLoginResp} AccountLoginResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AccountLoginResp.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AccountLoginResp message.
         * @function verify
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AccountLoginResp.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.account != null && message.hasOwnProperty("account")) {
                let error = $root.pbType.Account.verify(message.account);
                if (error)
                    return "account." + error;
            }
            return null;
        };

        /**
         * Creates an AccountLoginResp message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.AccountLoginResp} AccountLoginResp
         */
        AccountLoginResp.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.AccountLoginResp)
                return object;
            let message = new $root.pbType.AccountLoginResp();
            if (object.account != null) {
                if (typeof object.account !== "object")
                    throw TypeError(".pbType.AccountLoginResp.account: object expected");
                message.account = $root.pbType.Account.fromObject(object.account);
            }
            return message;
        };

        /**
         * Creates a plain object from an AccountLoginResp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {pbType.AccountLoginResp} message AccountLoginResp
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AccountLoginResp.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.account = null;
            if (message.account != null && message.hasOwnProperty("account"))
                object.account = $root.pbType.Account.toObject(message.account, options);
            return object;
        };

        /**
         * Converts this AccountLoginResp to JSON.
         * @function toJSON
         * @memberof pbType.AccountLoginResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AccountLoginResp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AccountLoginResp
         * @function getTypeUrl
         * @memberof pbType.AccountLoginResp
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AccountLoginResp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/com.game.hjwz.message.AccountLoginResp";
        };

        return AccountLoginResp;
    })();

    /**
     * AccountState enum.
     * @name pbType.AccountState
     * @enum {number}
     * @property {number} NORMAL=0 正常
     * @property {number} BLOCK=1 锁定
     * @property {number} ZERO=2 ZERO value
     * @property {number} CLEAN=3 清理
     */
    pbType.AccountState = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "NORMAL"] = 0;
        values[valuesById[1] = "BLOCK"] = 1;
        values[valuesById[2] = "ZERO"] = 2;
        values[valuesById[3] = "CLEAN"] = 3;
        return values;
    })();

    pbType.Any = (function() {

        /**
         * Properties of an Any.
         * @memberof pbType
         * @interface IAny
         * @property {string|null} [type_url] Any type_url
         * @property {Uint8Array|null} [value] Any value
         */

        /**
         * Constructs a new Any.
         * @memberof pbType
         * @classdesc Represents an Any.
         * @implements IAny
         * @constructor
         * @param {pbType.IAny=} [properties] Properties to set
         */
        function Any(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Any type_url.
         * @member {string} type_url
         * @memberof pbType.Any
         * @instance
         */
        Any.prototype.type_url = "";

        /**
         * Any value.
         * @member {Uint8Array} value
         * @memberof pbType.Any
         * @instance
         */
        Any.prototype.value = $util.newBuffer([]);

        /**
         * Creates a new Any instance using the specified properties.
         * @function create
         * @memberof pbType.Any
         * @static
         * @param {pbType.IAny=} [properties] Properties to set
         * @returns {pbType.Any} Any instance
         */
        Any.create = function create(properties) {
            return new Any(properties);
        };

        /**
         * Encodes the specified Any message. Does not implicitly {@link pbType.Any.verify|verify} messages.
         * @function encode
         * @memberof pbType.Any
         * @static
         * @param {pbType.IAny} message Any message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Any.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type_url != null && Object.hasOwnProperty.call(message, "type_url"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.type_url);
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.value);
            return writer;
        };

        /**
         * Encodes the specified Any message, length delimited. Does not implicitly {@link pbType.Any.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.Any
         * @static
         * @param {pbType.IAny} message Any message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Any.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Any message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.Any
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.Any} Any
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Any.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.Any();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.type_url = reader.string();
                        break;
                    }
                case 2: {
                        message.value = reader.bytes();
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
         * Decodes an Any message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.Any
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.Any} Any
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Any.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Any message.
         * @function verify
         * @memberof pbType.Any
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Any.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type_url != null && message.hasOwnProperty("type_url"))
                if (!$util.isString(message.type_url))
                    return "type_url: string expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!(message.value && typeof message.value.length === "number" || $util.isString(message.value)))
                    return "value: buffer expected";
            return null;
        };

        /**
         * Creates an Any message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.Any
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.Any} Any
         */
        Any.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.Any)
                return object;
            let message = new $root.pbType.Any();
            if (object.type_url != null)
                message.type_url = String(object.type_url);
            if (object.value != null)
                if (typeof object.value === "string")
                    $util.base64.decode(object.value, message.value = $util.newBuffer($util.base64.length(object.value)), 0);
                else if (object.value.length >= 0)
                    message.value = object.value;
            return message;
        };

        /**
         * Creates a plain object from an Any message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.Any
         * @static
         * @param {pbType.Any} message Any
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Any.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.type_url = "";
                if (options.bytes === String)
                    object.value = "";
                else {
                    object.value = [];
                    if (options.bytes !== Array)
                        object.value = $util.newBuffer(object.value);
                }
            }
            if (message.type_url != null && message.hasOwnProperty("type_url"))
                object.type_url = message.type_url;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = options.bytes === String ? $util.base64.encode(message.value, 0, message.value.length) : options.bytes === Array ? Array.prototype.slice.call(message.value) : message.value;
            return object;
        };

        /**
         * Converts this Any to JSON.
         * @function toJSON
         * @memberof pbType.Any
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Any.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Any
         * @function getTypeUrl
         * @memberof pbType.Any
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Any.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/google.protobuf.Any";
        };

        return Any;
    })();

    pbType.GMCMDDesc = (function() {

        /**
         * Properties of a GMCMDDesc.
         * @memberof pbType
         * @interface IGMCMDDesc
         * @property {string|null} [category] GMCMDDesc category
         * @property {string|null} [desc] GMCMDDesc desc
         * @property {string|null} [cmd] GMCMDDesc cmd
         * @property {Array.<string>|null} [args] GMCMDDesc args
         */

        /**
         * Constructs a new GMCMDDesc.
         * @memberof pbType
         * @classdesc Represents a GMCMDDesc.
         * @implements IGMCMDDesc
         * @constructor
         * @param {pbType.IGMCMDDesc=} [properties] Properties to set
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
         * @memberof pbType.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.category = "";

        /**
         * GMCMDDesc desc.
         * @member {string} desc
         * @memberof pbType.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.desc = "";

        /**
         * GMCMDDesc cmd.
         * @member {string} cmd
         * @memberof pbType.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.cmd = "";

        /**
         * GMCMDDesc args.
         * @member {Array.<string>} args
         * @memberof pbType.GMCMDDesc
         * @instance
         */
        GMCMDDesc.prototype.args = $util.emptyArray;

        /**
         * Creates a new GMCMDDesc instance using the specified properties.
         * @function create
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {pbType.IGMCMDDesc=} [properties] Properties to set
         * @returns {pbType.GMCMDDesc} GMCMDDesc instance
         */
        GMCMDDesc.create = function create(properties) {
            return new GMCMDDesc(properties);
        };

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pbType.GMCMDDesc.verify|verify} messages.
         * @function encode
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {pbType.IGMCMDDesc} message GMCMDDesc message or plain object to encode
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
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pbType.GMCMDDesc.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {pbType.IGMCMDDesc} message GMCMDDesc message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GMCMDDesc.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.GMCMDDesc} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GMCMDDesc.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.GMCMDDesc();
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
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.GMCMDDesc} GMCMDDesc
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
         * @memberof pbType.GMCMDDesc
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
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.GMCMDDesc} GMCMDDesc
         */
        GMCMDDesc.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.GMCMDDesc)
                return object;
            let message = new $root.pbType.GMCMDDesc();
            if (object.category != null)
                message.category = String(object.category);
            if (object.desc != null)
                message.desc = String(object.desc);
            if (object.cmd != null)
                message.cmd = String(object.cmd);
            if (object.args) {
                if (!Array.isArray(object.args))
                    throw TypeError(".pbType.GMCMDDesc.args: array expected");
                message.args = [];
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = String(object.args[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a GMCMDDesc message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.GMCMDDesc
         * @static
         * @param {pbType.GMCMDDesc} message GMCMDDesc
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
         * @memberof pbType.GMCMDDesc
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GMCMDDesc.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GMCMDDesc
         * @function getTypeUrl
         * @memberof pbType.GMCMDDesc
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

    pbType.HelloReq = (function() {

        /**
         * Properties of a HelloReq.
         * @memberof pbType
         * @interface IHelloReq
         * @property {string|null} [content] HelloReq content
         */

        /**
         * Constructs a new HelloReq.
         * @memberof pbType
         * @classdesc Represents a HelloReq.
         * @implements IHelloReq
         * @constructor
         * @param {pbType.IHelloReq=} [properties] Properties to set
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
         * @memberof pbType.HelloReq
         * @instance
         */
        HelloReq.prototype.content = "";

        /**
         * Creates a new HelloReq instance using the specified properties.
         * @function create
         * @memberof pbType.HelloReq
         * @static
         * @param {pbType.IHelloReq=} [properties] Properties to set
         * @returns {pbType.HelloReq} HelloReq instance
         */
        HelloReq.create = function create(properties) {
            return new HelloReq(properties);
        };

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pbType.HelloReq.verify|verify} messages.
         * @function encode
         * @memberof pbType.HelloReq
         * @static
         * @param {pbType.IHelloReq} message HelloReq message or plain object to encode
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
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pbType.HelloReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.HelloReq
         * @static
         * @param {pbType.IHelloReq} message HelloReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloReq.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.HelloReq} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloReq.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.HelloReq();
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
         * @memberof pbType.HelloReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.HelloReq} HelloReq
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
         * @memberof pbType.HelloReq
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
         * @memberof pbType.HelloReq
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.HelloReq} HelloReq
         */
        HelloReq.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.HelloReq)
                return object;
            let message = new $root.pbType.HelloReq();
            if (object.content != null)
                message.content = String(object.content);
            return message;
        };

        /**
         * Creates a plain object from a HelloReq message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.HelloReq
         * @static
         * @param {pbType.HelloReq} message HelloReq
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
         * @memberof pbType.HelloReq
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HelloReq.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HelloReq
         * @function getTypeUrl
         * @memberof pbType.HelloReq
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

    pbType.HelloResp = (function() {

        /**
         * Properties of a HelloResp.
         * @memberof pbType
         * @interface IHelloResp
         * @property {string|null} [content] HelloResp content
         * @property {number|Long|null} [serverTime] HelloResp serverTime
         */

        /**
         * Constructs a new HelloResp.
         * @memberof pbType
         * @classdesc Represents a HelloResp.
         * @implements IHelloResp
         * @constructor
         * @param {pbType.IHelloResp=} [properties] Properties to set
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
         * @memberof pbType.HelloResp
         * @instance
         */
        HelloResp.prototype.content = "";

        /**
         * HelloResp serverTime.
         * @member {number|Long} serverTime
         * @memberof pbType.HelloResp
         * @instance
         */
        HelloResp.prototype.serverTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new HelloResp instance using the specified properties.
         * @function create
         * @memberof pbType.HelloResp
         * @static
         * @param {pbType.IHelloResp=} [properties] Properties to set
         * @returns {pbType.HelloResp} HelloResp instance
         */
        HelloResp.create = function create(properties) {
            return new HelloResp(properties);
        };

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pbType.HelloResp.verify|verify} messages.
         * @function encode
         * @memberof pbType.HelloResp
         * @static
         * @param {pbType.IHelloResp} message HelloResp message or plain object to encode
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
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pbType.HelloResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.HelloResp
         * @static
         * @param {pbType.IHelloResp} message HelloResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HelloResp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.HelloResp} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HelloResp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.HelloResp();
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
         * @memberof pbType.HelloResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.HelloResp} HelloResp
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
         * @memberof pbType.HelloResp
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
         * @memberof pbType.HelloResp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.HelloResp} HelloResp
         */
        HelloResp.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.HelloResp)
                return object;
            let message = new $root.pbType.HelloResp();
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
         * @memberof pbType.HelloResp
         * @static
         * @param {pbType.HelloResp} message HelloResp
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
         * @memberof pbType.HelloResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HelloResp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HelloResp
         * @function getTypeUrl
         * @memberof pbType.HelloResp
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

    pbType.NtfGMCMDInit = (function() {

        /**
         * Properties of a NtfGMCMDInit.
         * @memberof pbType
         * @interface INtfGMCMDInit
         * @property {boolean|null} [enabled] NtfGMCMDInit enabled
         * @property {Array.<pbType.IGMCMDDesc>|null} [cmds] NtfGMCMDInit cmds
         */

        /**
         * Constructs a new NtfGMCMDInit.
         * @memberof pbType
         * @classdesc Represents a NtfGMCMDInit.
         * @implements INtfGMCMDInit
         * @constructor
         * @param {pbType.INtfGMCMDInit=} [properties] Properties to set
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
         * @memberof pbType.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.enabled = false;

        /**
         * NtfGMCMDInit cmds.
         * @member {Array.<pbType.IGMCMDDesc>} cmds
         * @memberof pbType.NtfGMCMDInit
         * @instance
         */
        NtfGMCMDInit.prototype.cmds = $util.emptyArray;

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @function create
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {pbType.INtfGMCMDInit=} [properties] Properties to set
         * @returns {pbType.NtfGMCMDInit} NtfGMCMDInit instance
         */
        NtfGMCMDInit.create = function create(properties) {
            return new NtfGMCMDInit(properties);
        };

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pbType.NtfGMCMDInit.verify|verify} messages.
         * @function encode
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {pbType.INtfGMCMDInit} message NtfGMCMDInit message or plain object to encode
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
                    $root.pbType.GMCMDDesc.encode(message.cmds[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pbType.NtfGMCMDInit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {pbType.INtfGMCMDInit} message NtfGMCMDInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NtfGMCMDInit.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.NtfGMCMDInit} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NtfGMCMDInit.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.NtfGMCMDInit();
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
                        message.cmds.push($root.pbType.GMCMDDesc.decode(reader, reader.uint32()));
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
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.NtfGMCMDInit} NtfGMCMDInit
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
         * @memberof pbType.NtfGMCMDInit
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
                    let error = $root.pbType.GMCMDDesc.verify(message.cmds[i]);
                    if (error)
                        return "cmds." + error;
                }
            }
            return null;
        };

        /**
         * Creates a NtfGMCMDInit message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.NtfGMCMDInit} NtfGMCMDInit
         */
        NtfGMCMDInit.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.NtfGMCMDInit)
                return object;
            let message = new $root.pbType.NtfGMCMDInit();
            if (object.enabled != null)
                message.enabled = Boolean(object.enabled);
            if (object.cmds) {
                if (!Array.isArray(object.cmds))
                    throw TypeError(".pbType.NtfGMCMDInit.cmds: array expected");
                message.cmds = [];
                for (let i = 0; i < object.cmds.length; ++i) {
                    if (typeof object.cmds[i] !== "object")
                        throw TypeError(".pbType.NtfGMCMDInit.cmds: object expected");
                    message.cmds[i] = $root.pbType.GMCMDDesc.fromObject(object.cmds[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a NtfGMCMDInit message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.NtfGMCMDInit
         * @static
         * @param {pbType.NtfGMCMDInit} message NtfGMCMDInit
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
                    object.cmds[j] = $root.pbType.GMCMDDesc.toObject(message.cmds[j], options);
            }
            return object;
        };

        /**
         * Converts this NtfGMCMDInit to JSON.
         * @function toJSON
         * @memberof pbType.NtfGMCMDInit
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        NtfGMCMDInit.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for NtfGMCMDInit
         * @function getTypeUrl
         * @memberof pbType.NtfGMCMDInit
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

    pbType.Result = (function() {

        /**
         * Properties of a Result.
         * @memberof pbType
         * @interface IResult
         * @property {number|null} [code] Result code
         * @property {pbType.IAny|null} [content] Result content
         */

        /**
         * Constructs a new Result.
         * @memberof pbType
         * @classdesc Represents a Result.
         * @implements IResult
         * @constructor
         * @param {pbType.IResult=} [properties] Properties to set
         */
        function Result(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Result code.
         * @member {number} code
         * @memberof pbType.Result
         * @instance
         */
        Result.prototype.code = 0;

        /**
         * Result content.
         * @member {pbType.IAny|null|undefined} content
         * @memberof pbType.Result
         * @instance
         */
        Result.prototype.content = null;

        /**
         * Creates a new Result instance using the specified properties.
         * @function create
         * @memberof pbType.Result
         * @static
         * @param {pbType.IResult=} [properties] Properties to set
         * @returns {pbType.Result} Result instance
         */
        Result.create = function create(properties) {
            return new Result(properties);
        };

        /**
         * Encodes the specified Result message. Does not implicitly {@link pbType.Result.verify|verify} messages.
         * @function encode
         * @memberof pbType.Result
         * @static
         * @param {pbType.IResult} message Result message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Result.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
            if (message.content != null && Object.hasOwnProperty.call(message, "content"))
                $root.pbType.Any.encode(message.content, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Result message, length delimited. Does not implicitly {@link pbType.Result.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.Result
         * @static
         * @param {pbType.IResult} message Result message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Result.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Result message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.Result
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.Result} Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Result.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.Result();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.code = reader.int32();
                        break;
                    }
                case 2: {
                        message.content = $root.pbType.Any.decode(reader, reader.uint32());
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
         * Decodes a Result message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.Result
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.Result} Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Result.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Result message.
         * @function verify
         * @memberof pbType.Result
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Result.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.code != null && message.hasOwnProperty("code"))
                if (!$util.isInteger(message.code))
                    return "code: integer expected";
            if (message.content != null && message.hasOwnProperty("content")) {
                let error = $root.pbType.Any.verify(message.content);
                if (error)
                    return "content." + error;
            }
            return null;
        };

        /**
         * Creates a Result message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.Result
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.Result} Result
         */
        Result.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.Result)
                return object;
            let message = new $root.pbType.Result();
            if (object.code != null)
                message.code = object.code | 0;
            if (object.content != null) {
                if (typeof object.content !== "object")
                    throw TypeError(".pbType.Result.content: object expected");
                message.content = $root.pbType.Any.fromObject(object.content);
            }
            return message;
        };

        /**
         * Creates a plain object from a Result message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.Result
         * @static
         * @param {pbType.Result} message Result
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Result.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.code = 0;
                object.content = null;
            }
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = message.code;
            if (message.content != null && message.hasOwnProperty("content"))
                object.content = $root.pbType.Any.toObject(message.content, options);
            return object;
        };

        /**
         * Converts this Result to JSON.
         * @function toJSON
         * @memberof pbType.Result
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Result.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Result
         * @function getTypeUrl
         * @memberof pbType.Result
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Result.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/Result";
        };

        return Result;
    })();

    pbType.UseGMCMDReq = (function() {

        /**
         * Properties of a UseGMCMDReq.
         * @memberof pbType
         * @interface IUseGMCMDReq
         * @property {string|null} [cmd] UseGMCMDReq cmd
         * @property {Array.<string>|null} [args] UseGMCMDReq args
         */

        /**
         * Constructs a new UseGMCMDReq.
         * @memberof pbType
         * @classdesc Represents a UseGMCMDReq.
         * @implements IUseGMCMDReq
         * @constructor
         * @param {pbType.IUseGMCMDReq=} [properties] Properties to set
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
         * @memberof pbType.UseGMCMDReq
         * @instance
         */
        UseGMCMDReq.prototype.cmd = "";

        /**
         * UseGMCMDReq args.
         * @member {Array.<string>} args
         * @memberof pbType.UseGMCMDReq
         * @instance
         */
        UseGMCMDReq.prototype.args = $util.emptyArray;

        /**
         * Creates a new UseGMCMDReq instance using the specified properties.
         * @function create
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {pbType.IUseGMCMDReq=} [properties] Properties to set
         * @returns {pbType.UseGMCMDReq} UseGMCMDReq instance
         */
        UseGMCMDReq.create = function create(properties) {
            return new UseGMCMDReq(properties);
        };

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pbType.UseGMCMDReq.verify|verify} messages.
         * @function encode
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {pbType.IUseGMCMDReq} message UseGMCMDReq message or plain object to encode
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
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pbType.UseGMCMDReq.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {pbType.IUseGMCMDReq} message UseGMCMDReq message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDReq.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.UseGMCMDReq} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDReq.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.UseGMCMDReq();
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
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.UseGMCMDReq} UseGMCMDReq
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
         * @memberof pbType.UseGMCMDReq
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
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.UseGMCMDReq} UseGMCMDReq
         */
        UseGMCMDReq.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.UseGMCMDReq)
                return object;
            let message = new $root.pbType.UseGMCMDReq();
            if (object.cmd != null)
                message.cmd = String(object.cmd);
            if (object.args) {
                if (!Array.isArray(object.args))
                    throw TypeError(".pbType.UseGMCMDReq.args: array expected");
                message.args = [];
                for (let i = 0; i < object.args.length; ++i)
                    message.args[i] = String(object.args[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a UseGMCMDReq message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.UseGMCMDReq
         * @static
         * @param {pbType.UseGMCMDReq} message UseGMCMDReq
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
         * @memberof pbType.UseGMCMDReq
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UseGMCMDReq.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for UseGMCMDReq
         * @function getTypeUrl
         * @memberof pbType.UseGMCMDReq
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

    pbType.UseGMCMDResp = (function() {

        /**
         * Properties of a UseGMCMDResp.
         * @memberof pbType
         * @interface IUseGMCMDResp
         * @property {string|null} [msg] UseGMCMDResp msg
         */

        /**
         * Constructs a new UseGMCMDResp.
         * @memberof pbType
         * @classdesc Represents a UseGMCMDResp.
         * @implements IUseGMCMDResp
         * @constructor
         * @param {pbType.IUseGMCMDResp=} [properties] Properties to set
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
         * @memberof pbType.UseGMCMDResp
         * @instance
         */
        UseGMCMDResp.prototype.msg = "";

        /**
         * Creates a new UseGMCMDResp instance using the specified properties.
         * @function create
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {pbType.IUseGMCMDResp=} [properties] Properties to set
         * @returns {pbType.UseGMCMDResp} UseGMCMDResp instance
         */
        UseGMCMDResp.create = function create(properties) {
            return new UseGMCMDResp(properties);
        };

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pbType.UseGMCMDResp.verify|verify} messages.
         * @function encode
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {pbType.IUseGMCMDResp} message UseGMCMDResp message or plain object to encode
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
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pbType.UseGMCMDResp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {pbType.IUseGMCMDResp} message UseGMCMDResp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UseGMCMDResp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.UseGMCMDResp} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UseGMCMDResp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.UseGMCMDResp();
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
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.UseGMCMDResp} UseGMCMDResp
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
         * @memberof pbType.UseGMCMDResp
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
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.UseGMCMDResp} UseGMCMDResp
         */
        UseGMCMDResp.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.UseGMCMDResp)
                return object;
            let message = new $root.pbType.UseGMCMDResp();
            if (object.msg != null)
                message.msg = String(object.msg);
            return message;
        };

        /**
         * Creates a plain object from a UseGMCMDResp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.UseGMCMDResp
         * @static
         * @param {pbType.UseGMCMDResp} message UseGMCMDResp
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
         * @memberof pbType.UseGMCMDResp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UseGMCMDResp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for UseGMCMDResp
         * @function getTypeUrl
         * @memberof pbType.UseGMCMDResp
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

    pbType.User = (function() {

        /**
         * Properties of a User.
         * @memberof pbType
         * @interface IUser
         * @property {number|Long|null} [id] User id
         * @property {string|null} [name] User name
         */

        /**
         * Constructs a new User.
         * @memberof pbType
         * @classdesc Represents a User.
         * @implements IUser
         * @constructor
         * @param {pbType.IUser=} [properties] Properties to set
         */
        function User(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * User id.
         * @member {number|Long} id
         * @memberof pbType.User
         * @instance
         */
        User.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * User name.
         * @member {string} name
         * @memberof pbType.User
         * @instance
         */
        User.prototype.name = "";

        /**
         * Creates a new User instance using the specified properties.
         * @function create
         * @memberof pbType.User
         * @static
         * @param {pbType.IUser=} [properties] Properties to set
         * @returns {pbType.User} User instance
         */
        User.create = function create(properties) {
            return new User(properties);
        };

        /**
         * Encodes the specified User message. Does not implicitly {@link pbType.User.verify|verify} messages.
         * @function encode
         * @memberof pbType.User
         * @static
         * @param {pbType.IUser} message User message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        User.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            return writer;
        };

        /**
         * Encodes the specified User message, length delimited. Does not implicitly {@link pbType.User.verify|verify} messages.
         * @function encodeDelimited
         * @memberof pbType.User
         * @static
         * @param {pbType.IUser} message User message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        User.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a User message from the specified reader or buffer.
         * @function decode
         * @memberof pbType.User
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {pbType.User} User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        User.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.pbType.User();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.int64();
                        break;
                    }
                case 2: {
                        message.name = reader.string();
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
         * Decodes a User message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof pbType.User
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {pbType.User} User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        User.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a User message.
         * @function verify
         * @memberof pbType.User
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        User.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                    return "id: integer|Long expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            return null;
        };

        /**
         * Creates a User message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof pbType.User
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {pbType.User} User
         */
        User.fromObject = function fromObject(object) {
            if (object instanceof $root.pbType.User)
                return object;
            let message = new $root.pbType.User();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.name != null)
                message.name = String(object.name);
            return message;
        };

        /**
         * Creates a plain object from a User message. Also converts values to other types if specified.
         * @function toObject
         * @memberof pbType.User
         * @static
         * @param {pbType.User} message User
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        User.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.name = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            return object;
        };

        /**
         * Converts this User to JSON.
         * @function toJSON
         * @memberof pbType.User
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        User.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for User
         * @function getTypeUrl
         * @memberof pbType.User
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        User.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/com.message.User";
        };

        return User;
    })();

    return pbType;
})();

export { $root as default };
