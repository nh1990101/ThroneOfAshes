// 自动生成，请修改 proto 源文件后运行 npm run proto。
import type * as $protobuf from "protobufjs";
import type Long from "long";
/** Namespace pbType. */
export namespace pbType {

    /** Properties of an Account. */
    interface IAccount {

        /** 账户编号 */
        id?: (number|Long|null);

        /** 账号 */
        account_name?: (string|null);

        /** 状态 */
        state?: (pbType.AccountState|null);

        /** 创建时间 */
        created_time?: (number|Long|null);
    }

    /** Represents an Account. */
    class Account implements IAccount {

        /**
         * Constructs a new Account.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IAccount);

        /** 账户编号 */
        public id: (number|Long);

        /** 账号 */
        public account_name: string;

        /** 状态 */
        public state: pbType.AccountState;

        /** 创建时间 */
        public created_time: (number|Long);

        /**
         * Creates a new Account instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Account instance
         */
        public static create(properties?: pbType.IAccount): pbType.Account;

        /**
         * Encodes the specified Account message. Does not implicitly {@link pbType.Account.verify|verify} messages.
         * @param message Account message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IAccount, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Account message, length delimited. Does not implicitly {@link pbType.Account.verify|verify} messages.
         * @param message Account message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IAccount, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Account message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Account
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.Account;

        /**
         * Decodes an Account message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Account
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.Account;

        /**
         * Verifies an Account message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Account message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Account
         */
        public static fromObject(object: { [k: string]: any }): pbType.Account;

        /**
         * Creates a plain object from an Account message. Also converts values to other types if specified.
         * @param message Account
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.Account, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Account to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Account
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AccountLoginReq. */
    interface IAccountLoginReq {

        /** 账号名(平台传过来的用户Id) */
        account_name?: (string|null);

        /** 设备型号 */
        device_model?: (string|null);

        /** 系统名称 */
        os_name?: (string|null);

        /** 系统版本 */
        os_ver?: (string|null);

        /** 运营渠道 */
        channel?: (string|null);

        /** 客户端版本(资源版本号) */
        client_ver?: (string|null);

        /** token标识(登录服返回的加密串) */
        token?: (string|null);

        /** 联网类型 */
        network?: (string|null);

        /** sdk版本 */
        sdk_ver?: (string|null);

        /** 登录服地址 */
        login_addr?: (string|null);

        /** 时间戳 */
        timestamp?: (number|Long|null);

        /** ios 0/android 1 */
        os_type?: (number|null);

        /** 注册渠道 */
        reg_channel?: (string|null);

        /** 登陆渠道 */
        login_channel?: (string|null);
    }

    /** Represents an AccountLoginReq. */
    class AccountLoginReq implements IAccountLoginReq {

        /**
         * Constructs a new AccountLoginReq.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IAccountLoginReq);

        /** 账号名(平台传过来的用户Id) */
        public account_name: string;

        /** 设备型号 */
        public device_model: string;

        /** 系统名称 */
        public os_name: string;

        /** 系统版本 */
        public os_ver: string;

        /** 运营渠道 */
        public channel: string;

        /** 客户端版本(资源版本号) */
        public client_ver: string;

        /** token标识(登录服返回的加密串) */
        public token: string;

        /** 联网类型 */
        public network: string;

        /** sdk版本 */
        public sdk_ver: string;

        /** 登录服地址 */
        public login_addr: string;

        /** 时间戳 */
        public timestamp: (number|Long);

        /** ios 0/android 1 */
        public os_type: number;

        /** 注册渠道 */
        public reg_channel: string;

        /** 登陆渠道 */
        public login_channel: string;

        /**
         * Creates a new AccountLoginReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AccountLoginReq instance
         */
        public static create(properties?: pbType.IAccountLoginReq): pbType.AccountLoginReq;

        /**
         * Encodes the specified AccountLoginReq message. Does not implicitly {@link pbType.AccountLoginReq.verify|verify} messages.
         * @param message AccountLoginReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IAccountLoginReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AccountLoginReq message, length delimited. Does not implicitly {@link pbType.AccountLoginReq.verify|verify} messages.
         * @param message AccountLoginReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IAccountLoginReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AccountLoginReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AccountLoginReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.AccountLoginReq;

        /**
         * Decodes an AccountLoginReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AccountLoginReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.AccountLoginReq;

        /**
         * Verifies an AccountLoginReq message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AccountLoginReq message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AccountLoginReq
         */
        public static fromObject(object: { [k: string]: any }): pbType.AccountLoginReq;

        /**
         * Creates a plain object from an AccountLoginReq message. Also converts values to other types if specified.
         * @param message AccountLoginReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.AccountLoginReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AccountLoginReq to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AccountLoginReq
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AccountLoginResp. */
    interface IAccountLoginResp {

        /** 用户的帐号信息 */
        account?: (pbType.IAccount|null);
    }

    /** Represents an AccountLoginResp. */
    class AccountLoginResp implements IAccountLoginResp {

        /**
         * Constructs a new AccountLoginResp.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IAccountLoginResp);

        /** 用户的帐号信息 */
        public account?: (pbType.IAccount|null);

        /**
         * Creates a new AccountLoginResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AccountLoginResp instance
         */
        public static create(properties?: pbType.IAccountLoginResp): pbType.AccountLoginResp;

        /**
         * Encodes the specified AccountLoginResp message. Does not implicitly {@link pbType.AccountLoginResp.verify|verify} messages.
         * @param message AccountLoginResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IAccountLoginResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AccountLoginResp message, length delimited. Does not implicitly {@link pbType.AccountLoginResp.verify|verify} messages.
         * @param message AccountLoginResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IAccountLoginResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AccountLoginResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AccountLoginResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.AccountLoginResp;

        /**
         * Decodes an AccountLoginResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AccountLoginResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.AccountLoginResp;

        /**
         * Verifies an AccountLoginResp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AccountLoginResp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AccountLoginResp
         */
        public static fromObject(object: { [k: string]: any }): pbType.AccountLoginResp;

        /**
         * Creates a plain object from an AccountLoginResp message. Also converts values to other types if specified.
         * @param message AccountLoginResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.AccountLoginResp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AccountLoginResp to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AccountLoginResp
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** AccountState enum. */
    enum AccountState {
        NORMAL = 0,
        BLOCK = 1,
        ZERO = 2,
        CLEAN = 3
    }

    /** Properties of an Any. */
    interface IAny {

        /** Any type_url */
        type_url?: (string|null);

        /** Any value */
        value?: (Uint8Array|null);
    }

    /** Represents an Any. */
    class Any implements IAny {

        /**
         * Constructs a new Any.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IAny);

        /** Any type_url. */
        public type_url: string;

        /** Any value. */
        public value: Uint8Array;

        /**
         * Creates a new Any instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Any instance
         */
        public static create(properties?: pbType.IAny): pbType.Any;

        /**
         * Encodes the specified Any message. Does not implicitly {@link pbType.Any.verify|verify} messages.
         * @param message Any message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Any message, length delimited. Does not implicitly {@link pbType.Any.verify|verify} messages.
         * @param message Any message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Any message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Any
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.Any;

        /**
         * Decodes an Any message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Any
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.Any;

        /**
         * Verifies an Any message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Any message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Any
         */
        public static fromObject(object: { [k: string]: any }): pbType.Any;

        /**
         * Creates a plain object from an Any message. Also converts values to other types if specified.
         * @param message Any
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.Any, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Any to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Any
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GMCMDDesc. */
    interface IGMCMDDesc {

        /** GMCMDDesc category */
        category?: (string|null);

        /** GMCMDDesc desc */
        desc?: (string|null);

        /** GMCMDDesc cmd */
        cmd?: (string|null);

        /** GMCMDDesc args */
        args?: (string[]|null);
    }

    /** Represents a GMCMDDesc. */
    class GMCMDDesc implements IGMCMDDesc {

        /**
         * Constructs a new GMCMDDesc.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IGMCMDDesc);

        /** GMCMDDesc category. */
        public category: string;

        /** GMCMDDesc desc. */
        public desc: string;

        /** GMCMDDesc cmd. */
        public cmd: string;

        /** GMCMDDesc args. */
        public args: string[];

        /**
         * Creates a new GMCMDDesc instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GMCMDDesc instance
         */
        public static create(properties?: pbType.IGMCMDDesc): pbType.GMCMDDesc;

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pbType.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IGMCMDDesc, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pbType.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IGMCMDDesc, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.GMCMDDesc;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.GMCMDDesc;

        /**
         * Verifies a GMCMDDesc message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GMCMDDesc message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GMCMDDesc
         */
        public static fromObject(object: { [k: string]: any }): pbType.GMCMDDesc;

        /**
         * Creates a plain object from a GMCMDDesc message. Also converts values to other types if specified.
         * @param message GMCMDDesc
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.GMCMDDesc, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GMCMDDesc to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GMCMDDesc
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a HelloReq. */
    interface IHelloReq {

        /** HelloReq content */
        content?: (string|null);
    }

    /** Represents a HelloReq. */
    class HelloReq implements IHelloReq {

        /**
         * Constructs a new HelloReq.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IHelloReq);

        /** HelloReq content. */
        public content: string;

        /**
         * Creates a new HelloReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloReq instance
         */
        public static create(properties?: pbType.IHelloReq): pbType.HelloReq;

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pbType.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IHelloReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pbType.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IHelloReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.HelloReq;

        /**
         * Decodes a HelloReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.HelloReq;

        /**
         * Verifies a HelloReq message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a HelloReq message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HelloReq
         */
        public static fromObject(object: { [k: string]: any }): pbType.HelloReq;

        /**
         * Creates a plain object from a HelloReq message. Also converts values to other types if specified.
         * @param message HelloReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.HelloReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this HelloReq to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for HelloReq
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a HelloResp. */
    interface IHelloResp {

        /** HelloResp content */
        content?: (string|null);

        /** HelloResp serverTime */
        serverTime?: (number|Long|null);
    }

    /** Represents a HelloResp. */
    class HelloResp implements IHelloResp {

        /**
         * Constructs a new HelloResp.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IHelloResp);

        /** HelloResp content. */
        public content: string;

        /** HelloResp serverTime. */
        public serverTime: (number|Long);

        /**
         * Creates a new HelloResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloResp instance
         */
        public static create(properties?: pbType.IHelloResp): pbType.HelloResp;

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pbType.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IHelloResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pbType.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IHelloResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.HelloResp;

        /**
         * Decodes a HelloResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.HelloResp;

        /**
         * Verifies a HelloResp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a HelloResp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HelloResp
         */
        public static fromObject(object: { [k: string]: any }): pbType.HelloResp;

        /**
         * Creates a plain object from a HelloResp message. Also converts values to other types if specified.
         * @param message HelloResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.HelloResp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this HelloResp to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for HelloResp
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a NtfGMCMDInit. */
    interface INtfGMCMDInit {

        /** NtfGMCMDInit enabled */
        enabled?: (boolean|null);

        /** NtfGMCMDInit cmds */
        cmds?: (pbType.IGMCMDDesc[]|null);
    }

    /** Represents a NtfGMCMDInit. */
    class NtfGMCMDInit implements INtfGMCMDInit {

        /**
         * Constructs a new NtfGMCMDInit.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.INtfGMCMDInit);

        /** NtfGMCMDInit enabled. */
        public enabled: boolean;

        /** NtfGMCMDInit cmds. */
        public cmds: pbType.IGMCMDDesc[];

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NtfGMCMDInit instance
         */
        public static create(properties?: pbType.INtfGMCMDInit): pbType.NtfGMCMDInit;

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pbType.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.INtfGMCMDInit, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pbType.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.INtfGMCMDInit, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.NtfGMCMDInit;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.NtfGMCMDInit;

        /**
         * Verifies a NtfGMCMDInit message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a NtfGMCMDInit message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns NtfGMCMDInit
         */
        public static fromObject(object: { [k: string]: any }): pbType.NtfGMCMDInit;

        /**
         * Creates a plain object from a NtfGMCMDInit message. Also converts values to other types if specified.
         * @param message NtfGMCMDInit
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.NtfGMCMDInit, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this NtfGMCMDInit to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for NtfGMCMDInit
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Result. */
    interface IResult {

        /** Result code */
        code?: (number|null);

        /** Result content */
        content?: (pbType.IAny|null);
    }

    /** Represents a Result. */
    class Result implements IResult {

        /**
         * Constructs a new Result.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IResult);

        /** Result code. */
        public code: number;

        /** Result content. */
        public content?: (pbType.IAny|null);

        /**
         * Creates a new Result instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Result instance
         */
        public static create(properties?: pbType.IResult): pbType.Result;

        /**
         * Encodes the specified Result message. Does not implicitly {@link pbType.Result.verify|verify} messages.
         * @param message Result message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Result message, length delimited. Does not implicitly {@link pbType.Result.verify|verify} messages.
         * @param message Result message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Result message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.Result;

        /**
         * Decodes a Result message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.Result;

        /**
         * Verifies a Result message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Result message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Result
         */
        public static fromObject(object: { [k: string]: any }): pbType.Result;

        /**
         * Creates a plain object from a Result message. Also converts values to other types if specified.
         * @param message Result
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.Result, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Result to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Result
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a UseGMCMDReq. */
    interface IUseGMCMDReq {

        /** UseGMCMDReq cmd */
        cmd?: (string|null);

        /** UseGMCMDReq args */
        args?: (string[]|null);
    }

    /** Represents a UseGMCMDReq. */
    class UseGMCMDReq implements IUseGMCMDReq {

        /**
         * Constructs a new UseGMCMDReq.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IUseGMCMDReq);

        /** UseGMCMDReq cmd. */
        public cmd: string;

        /** UseGMCMDReq args. */
        public args: string[];

        /**
         * Creates a new UseGMCMDReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDReq instance
         */
        public static create(properties?: pbType.IUseGMCMDReq): pbType.UseGMCMDReq;

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pbType.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IUseGMCMDReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pbType.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IUseGMCMDReq, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.UseGMCMDReq;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.UseGMCMDReq;

        /**
         * Verifies a UseGMCMDReq message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a UseGMCMDReq message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns UseGMCMDReq
         */
        public static fromObject(object: { [k: string]: any }): pbType.UseGMCMDReq;

        /**
         * Creates a plain object from a UseGMCMDReq message. Also converts values to other types if specified.
         * @param message UseGMCMDReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.UseGMCMDReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this UseGMCMDReq to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for UseGMCMDReq
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a UseGMCMDResp. */
    interface IUseGMCMDResp {

        /** UseGMCMDResp msg */
        msg?: (string|null);
    }

    /** Represents a UseGMCMDResp. */
    class UseGMCMDResp implements IUseGMCMDResp {

        /**
         * Constructs a new UseGMCMDResp.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IUseGMCMDResp);

        /** UseGMCMDResp msg. */
        public msg: string;

        /**
         * Creates a new UseGMCMDResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDResp instance
         */
        public static create(properties?: pbType.IUseGMCMDResp): pbType.UseGMCMDResp;

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pbType.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IUseGMCMDResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pbType.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IUseGMCMDResp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.UseGMCMDResp;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.UseGMCMDResp;

        /**
         * Verifies a UseGMCMDResp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a UseGMCMDResp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns UseGMCMDResp
         */
        public static fromObject(object: { [k: string]: any }): pbType.UseGMCMDResp;

        /**
         * Creates a plain object from a UseGMCMDResp message. Also converts values to other types if specified.
         * @param message UseGMCMDResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.UseGMCMDResp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this UseGMCMDResp to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for UseGMCMDResp
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a User. */
    interface IUser {

        /** User id */
        id?: (number|Long|null);

        /** User name */
        name?: (string|null);
    }

    /** Represents a User. */
    class User implements IUser {

        /**
         * Constructs a new User.
         * @param [properties] Properties to set
         */
        constructor(properties?: pbType.IUser);

        /** User id. */
        public id: (number|Long);

        /** User name. */
        public name: string;

        /**
         * Creates a new User instance using the specified properties.
         * @param [properties] Properties to set
         * @returns User instance
         */
        public static create(properties?: pbType.IUser): pbType.User;

        /**
         * Encodes the specified User message. Does not implicitly {@link pbType.User.verify|verify} messages.
         * @param message User message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pbType.IUser, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified User message, length delimited. Does not implicitly {@link pbType.User.verify|verify} messages.
         * @param message User message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pbType.IUser, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a User message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pbType.User;

        /**
         * Decodes a User message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pbType.User;

        /**
         * Verifies a User message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a User message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns User
         */
        public static fromObject(object: { [k: string]: any }): pbType.User;

        /**
         * Creates a plain object from a User message. Also converts values to other types if specified.
         * @param message User
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pbType.User, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this User to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for User
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
