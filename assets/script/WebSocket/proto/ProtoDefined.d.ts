import type { Long } from "protobufjs";
// DO NOT EDIT! This is a generated file. Edit the JSDoc in src/*.js instead and run 'npm run build:types'.

/** Namespace pb. */
export namespace pb {

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
        constructor(properties?: pb.IGMCMDDesc);

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
        public static create(properties?: pb.IGMCMDDesc): pb.GMCMDDesc;

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.IGMCMDDesc, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.IGMCMDDesc, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.GMCMDDesc;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.GMCMDDesc;

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
        public static fromObject(object: { [k: string]: any }): pb.GMCMDDesc;

        /**
         * Creates a plain object from a GMCMDDesc message. Also converts values to other types if specified.
         * @param message GMCMDDesc
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.GMCMDDesc, options?: protobuf.IConversionOptions): { [k: string]: any };

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

    /** Properties of a NtfGMCMDInit. */
    interface INtfGMCMDInit {

        /** NtfGMCMDInit enabled */
        enabled?: (boolean|null);

        /** NtfGMCMDInit cmds */
        cmds?: (pb.IGMCMDDesc[]|null);
    }

    /** Represents a NtfGMCMDInit. */
    class NtfGMCMDInit implements INtfGMCMDInit {

        /**
         * Constructs a new NtfGMCMDInit.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.INtfGMCMDInit);

        /** NtfGMCMDInit enabled. */
        public enabled: boolean;

        /** NtfGMCMDInit cmds. */
        public cmds: pb.IGMCMDDesc[];

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NtfGMCMDInit instance
         */
        public static create(properties?: pb.INtfGMCMDInit): pb.NtfGMCMDInit;

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.INtfGMCMDInit, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.INtfGMCMDInit, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.NtfGMCMDInit;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.NtfGMCMDInit;

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
        public static fromObject(object: { [k: string]: any }): pb.NtfGMCMDInit;

        /**
         * Creates a plain object from a NtfGMCMDInit message. Also converts values to other types if specified.
         * @param message NtfGMCMDInit
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.NtfGMCMDInit, options?: protobuf.IConversionOptions): { [k: string]: any };

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
        constructor(properties?: pb.IUseGMCMDReq);

        /** UseGMCMDReq cmd. */
        public cmd: string;

        /** UseGMCMDReq args. */
        public args: string[];

        /**
         * Creates a new UseGMCMDReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDReq instance
         */
        public static create(properties?: pb.IUseGMCMDReq): pb.UseGMCMDReq;

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.IUseGMCMDReq, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.IUseGMCMDReq, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.UseGMCMDReq;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.UseGMCMDReq;

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
        public static fromObject(object: { [k: string]: any }): pb.UseGMCMDReq;

        /**
         * Creates a plain object from a UseGMCMDReq message. Also converts values to other types if specified.
         * @param message UseGMCMDReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.UseGMCMDReq, options?: protobuf.IConversionOptions): { [k: string]: any };

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
        constructor(properties?: pb.IUseGMCMDResp);

        /** UseGMCMDResp msg. */
        public msg: string;

        /**
         * Creates a new UseGMCMDResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDResp instance
         */
        public static create(properties?: pb.IUseGMCMDResp): pb.UseGMCMDResp;

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.IUseGMCMDResp, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.IUseGMCMDResp, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.UseGMCMDResp;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.UseGMCMDResp;

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
        public static fromObject(object: { [k: string]: any }): pb.UseGMCMDResp;

        /**
         * Creates a plain object from a UseGMCMDResp message. Also converts values to other types if specified.
         * @param message UseGMCMDResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.UseGMCMDResp, options?: protobuf.IConversionOptions): { [k: string]: any };

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
        constructor(properties?: pb.IHelloReq);

        /** HelloReq content. */
        public content: string;

        /**
         * Creates a new HelloReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloReq instance
         */
        public static create(properties?: pb.IHelloReq): pb.HelloReq;

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.IHelloReq, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.IHelloReq, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.HelloReq;

        /**
         * Decodes a HelloReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.HelloReq;

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
        public static fromObject(object: { [k: string]: any }): pb.HelloReq;

        /**
         * Creates a plain object from a HelloReq message. Also converts values to other types if specified.
         * @param message HelloReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.HelloReq, options?: protobuf.IConversionOptions): { [k: string]: any };

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
        constructor(properties?: pb.IHelloResp);

        /** HelloResp content. */
        public content: string;

        /** HelloResp serverTime. */
        public serverTime: (number|Long);

        /**
         * Creates a new HelloResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloResp instance
         */
        public static create(properties?: pb.IHelloResp): pb.HelloResp;

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: pb.IHelloResp, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: pb.IHelloResp, writer?: protobuf.Writer): protobuf.Writer;

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: (protobuf.Reader|Uint8Array), length?: number): pb.HelloResp;

        /**
         * Decodes a HelloResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: (protobuf.Reader|Uint8Array)): pb.HelloResp;

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
        public static fromObject(object: { [k: string]: any }): pb.HelloResp;

        /**
         * Creates a plain object from a HelloResp message. Also converts values to other types if specified.
         * @param message HelloResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: pb.HelloResp, options?: protobuf.IConversionOptions): { [k: string]: any };

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
}
