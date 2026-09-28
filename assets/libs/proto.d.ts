import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace pb. */
export namespace pb {

    /**
     * Properties of a GMCMDDesc.
     * @deprecated Use pb.GMCMDDesc.$Properties instead.
     */
    interface IGMCMDDesc extends pb.GMCMDDesc.$Properties {
    }

    /** Represents a GMCMDDesc. */
    class GMCMDDesc {

        /**
         * Constructs a new GMCMDDesc.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.GMCMDDesc.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** GMCMDDesc category. */
        category: string;

        /** GMCMDDesc desc. */
        desc: string;

        /** GMCMDDesc cmd. */
        cmd: string;

        /** GMCMDDesc args. */
        args: string[];

        /**
         * Creates a new GMCMDDesc instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GMCMDDesc instance
         */
        static create(properties: pb.GMCMDDesc.$Shape): pb.GMCMDDesc & pb.GMCMDDesc.$Shape;
        static create(properties?: pb.GMCMDDesc.$Properties): pb.GMCMDDesc;

        /**
         * Encodes the specified GMCMDDesc message. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.GMCMDDesc.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GMCMDDesc message, length delimited. Does not implicitly {@link pb.GMCMDDesc.verify|verify} messages.
         * @param message GMCMDDesc message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.GMCMDDesc.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.GMCMDDesc & pb.GMCMDDesc.$Shape} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.GMCMDDesc & pb.GMCMDDesc.$Shape;

        /**
         * Decodes a GMCMDDesc message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.GMCMDDesc & pb.GMCMDDesc.$Shape} GMCMDDesc
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.GMCMDDesc & pb.GMCMDDesc.$Shape;

        /**
         * Verifies a GMCMDDesc message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GMCMDDesc message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GMCMDDesc
         */
        static fromObject(object: { [k: string]: any }): pb.GMCMDDesc;

        /**
         * Creates a plain object from a GMCMDDesc message. Also converts values to other types if specified.
         * @param message GMCMDDesc
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.GMCMDDesc, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GMCMDDesc to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GMCMDDesc
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace GMCMDDesc {

        /** Properties of a GMCMDDesc. */
        interface $Properties {

            /** GMCMDDesc category */
            category?: (string|null);

            /** GMCMDDesc desc */
            desc?: (string|null);

            /** GMCMDDesc cmd */
            cmd?: (string|null);

            /** GMCMDDesc args */
            args?: (string[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a GMCMDDesc. */
        type $Shape = pb.GMCMDDesc.$Properties;
    }

    /**
     * Properties of a NtfGMCMDInit.
     * @deprecated Use pb.NtfGMCMDInit.$Properties instead.
     */
    interface INtfGMCMDInit extends pb.NtfGMCMDInit.$Properties {
    }

    /** Represents a NtfGMCMDInit. */
    class NtfGMCMDInit {

        /**
         * Constructs a new NtfGMCMDInit.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.NtfGMCMDInit.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** NtfGMCMDInit enabled. */
        enabled: boolean;

        /** NtfGMCMDInit cmds. */
        cmds: pb.GMCMDDesc.$Properties[];

        /**
         * Creates a new NtfGMCMDInit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NtfGMCMDInit instance
         */
        static create(properties: pb.NtfGMCMDInit.$Shape): pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape;
        static create(properties?: pb.NtfGMCMDInit.$Properties): pb.NtfGMCMDInit;

        /**
         * Encodes the specified NtfGMCMDInit message. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.NtfGMCMDInit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified NtfGMCMDInit message, length delimited. Does not implicitly {@link pb.NtfGMCMDInit.verify|verify} messages.
         * @param message NtfGMCMDInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.NtfGMCMDInit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape;

        /**
         * Decodes a NtfGMCMDInit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape} NtfGMCMDInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.NtfGMCMDInit & pb.NtfGMCMDInit.$Shape;

        /**
         * Verifies a NtfGMCMDInit message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a NtfGMCMDInit message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns NtfGMCMDInit
         */
        static fromObject(object: { [k: string]: any }): pb.NtfGMCMDInit;

        /**
         * Creates a plain object from a NtfGMCMDInit message. Also converts values to other types if specified.
         * @param message NtfGMCMDInit
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.NtfGMCMDInit, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this NtfGMCMDInit to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for NtfGMCMDInit
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace NtfGMCMDInit {

        /** Properties of a NtfGMCMDInit. */
        interface $Properties {

            /** NtfGMCMDInit enabled */
            enabled?: (boolean|null);

            /** NtfGMCMDInit cmds */
            cmds?: (pb.GMCMDDesc.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a NtfGMCMDInit. */
        type $Shape = pb.NtfGMCMDInit.$Properties;
    }

    /**
     * Properties of a UseGMCMDReq.
     * @deprecated Use pb.UseGMCMDReq.$Properties instead.
     */
    interface IUseGMCMDReq extends pb.UseGMCMDReq.$Properties {
    }

    /** Represents a UseGMCMDReq. */
    class UseGMCMDReq {

        /**
         * Constructs a new UseGMCMDReq.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.UseGMCMDReq.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** UseGMCMDReq cmd. */
        cmd: string;

        /** UseGMCMDReq args. */
        args: string[];

        /**
         * Creates a new UseGMCMDReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDReq instance
         */
        static create(properties: pb.UseGMCMDReq.$Shape): pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape;
        static create(properties?: pb.UseGMCMDReq.$Properties): pb.UseGMCMDReq;

        /**
         * Encodes the specified UseGMCMDReq message. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.UseGMCMDReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDReq message, length delimited. Does not implicitly {@link pb.UseGMCMDReq.verify|verify} messages.
         * @param message UseGMCMDReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.UseGMCMDReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape;

        /**
         * Decodes a UseGMCMDReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape} UseGMCMDReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.UseGMCMDReq & pb.UseGMCMDReq.$Shape;

        /**
         * Verifies a UseGMCMDReq message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a UseGMCMDReq message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns UseGMCMDReq
         */
        static fromObject(object: { [k: string]: any }): pb.UseGMCMDReq;

        /**
         * Creates a plain object from a UseGMCMDReq message. Also converts values to other types if specified.
         * @param message UseGMCMDReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.UseGMCMDReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this UseGMCMDReq to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for UseGMCMDReq
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace UseGMCMDReq {

        /** Properties of a UseGMCMDReq. */
        interface $Properties {

            /** UseGMCMDReq cmd */
            cmd?: (string|null);

            /** UseGMCMDReq args */
            args?: (string[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a UseGMCMDReq. */
        type $Shape = pb.UseGMCMDReq.$Properties;
    }

    /**
     * Properties of a UseGMCMDResp.
     * @deprecated Use pb.UseGMCMDResp.$Properties instead.
     */
    interface IUseGMCMDResp extends pb.UseGMCMDResp.$Properties {
    }

    /** Represents a UseGMCMDResp. */
    class UseGMCMDResp {

        /**
         * Constructs a new UseGMCMDResp.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.UseGMCMDResp.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** UseGMCMDResp msg. */
        msg: string;

        /**
         * Creates a new UseGMCMDResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UseGMCMDResp instance
         */
        static create(properties: pb.UseGMCMDResp.$Shape): pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape;
        static create(properties?: pb.UseGMCMDResp.$Properties): pb.UseGMCMDResp;

        /**
         * Encodes the specified UseGMCMDResp message. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.UseGMCMDResp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified UseGMCMDResp message, length delimited. Does not implicitly {@link pb.UseGMCMDResp.verify|verify} messages.
         * @param message UseGMCMDResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.UseGMCMDResp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape;

        /**
         * Decodes a UseGMCMDResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape} UseGMCMDResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.UseGMCMDResp & pb.UseGMCMDResp.$Shape;

        /**
         * Verifies a UseGMCMDResp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a UseGMCMDResp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns UseGMCMDResp
         */
        static fromObject(object: { [k: string]: any }): pb.UseGMCMDResp;

        /**
         * Creates a plain object from a UseGMCMDResp message. Also converts values to other types if specified.
         * @param message UseGMCMDResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.UseGMCMDResp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this UseGMCMDResp to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for UseGMCMDResp
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace UseGMCMDResp {

        /** Properties of a UseGMCMDResp. */
        interface $Properties {

            /** UseGMCMDResp msg */
            msg?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a UseGMCMDResp. */
        type $Shape = pb.UseGMCMDResp.$Properties;
    }

    /**
     * Properties of a HelloReq.
     * @deprecated Use pb.HelloReq.$Properties instead.
     */
    interface IHelloReq extends pb.HelloReq.$Properties {
    }

    /** Represents a HelloReq. */
    class HelloReq {

        /**
         * Constructs a new HelloReq.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.HelloReq.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** HelloReq content. */
        content: string;

        /**
         * Creates a new HelloReq instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloReq instance
         */
        static create(properties: pb.HelloReq.$Shape): pb.HelloReq & pb.HelloReq.$Shape;
        static create(properties?: pb.HelloReq.$Properties): pb.HelloReq;

        /**
         * Encodes the specified HelloReq message. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.HelloReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified HelloReq message, length delimited. Does not implicitly {@link pb.HelloReq.verify|verify} messages.
         * @param message HelloReq message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.HelloReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HelloReq message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.HelloReq & pb.HelloReq.$Shape} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.HelloReq & pb.HelloReq.$Shape;

        /**
         * Decodes a HelloReq message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.HelloReq & pb.HelloReq.$Shape} HelloReq
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.HelloReq & pb.HelloReq.$Shape;

        /**
         * Verifies a HelloReq message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a HelloReq message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HelloReq
         */
        static fromObject(object: { [k: string]: any }): pb.HelloReq;

        /**
         * Creates a plain object from a HelloReq message. Also converts values to other types if specified.
         * @param message HelloReq
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.HelloReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this HelloReq to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for HelloReq
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace HelloReq {

        /** Properties of a HelloReq. */
        interface $Properties {

            /** HelloReq content */
            content?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a HelloReq. */
        type $Shape = pb.HelloReq.$Properties;
    }

    /**
     * Properties of a HelloResp.
     * @deprecated Use pb.HelloResp.$Properties instead.
     */
    interface IHelloResp extends pb.HelloResp.$Properties {
    }

    /** Represents a HelloResp. */
    class HelloResp {

        /**
         * Constructs a new HelloResp.
         * @param [properties] Properties to set
         */
        constructor(properties?: pb.HelloResp.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** HelloResp content. */
        content: string;

        /** HelloResp serverTime. */
        serverTime: (number|Long);

        /**
         * Creates a new HelloResp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HelloResp instance
         */
        static create(properties: pb.HelloResp.$Shape): pb.HelloResp & pb.HelloResp.$Shape;
        static create(properties?: pb.HelloResp.$Properties): pb.HelloResp;

        /**
         * Encodes the specified HelloResp message. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: pb.HelloResp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified HelloResp message, length delimited. Does not implicitly {@link pb.HelloResp.verify|verify} messages.
         * @param message HelloResp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: pb.HelloResp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HelloResp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {pb.HelloResp & pb.HelloResp.$Shape} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): pb.HelloResp & pb.HelloResp.$Shape;

        /**
         * Decodes a HelloResp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {pb.HelloResp & pb.HelloResp.$Shape} HelloResp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): pb.HelloResp & pb.HelloResp.$Shape;

        /**
         * Verifies a HelloResp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a HelloResp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HelloResp
         */
        static fromObject(object: { [k: string]: any }): pb.HelloResp;

        /**
         * Creates a plain object from a HelloResp message. Also converts values to other types if specified.
         * @param message HelloResp
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: pb.HelloResp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this HelloResp to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for HelloResp
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace HelloResp {

        /** Properties of a HelloResp. */
        interface $Properties {

            /** HelloResp content */
            content?: (string|null);

            /** HelloResp serverTime */
            serverTime?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a HelloResp. */
        type $Shape = pb.HelloResp.$Properties;
    }
}
