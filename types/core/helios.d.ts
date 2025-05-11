/**
* @typedef {import('@helios-starling/utils').NetworkNodeOptions} NetworkNodeOptions
*

/**
* @typedef {NetworkNodeOptions & {
*   connectionKey?: Uint8Array|string
* }} HeliosOptions
*/
/**
 * @callback ProxyCallback
 * @param
 * @returns {false|import('./starling').Starling}
 */
/**
 * @typedef {(context: import('@helios-starling/utils').RequestContext, starlings: import('../managers/starlings').StarlingsManager) => import('./starling').Starling} RequestProxyHandler
 * @typedef {(context: import('@helios-starling/utils').ResponseContext, starlings: import('../managers/starlings').StarlingsManager) => import('./starling').Starling} ResponseProxyHandler
 * @typedef {(context: import('@helios-starling/utils').NotificationContext, starlings: import('../managers/starlings').StarlingsManager) => import('./starling').Starling} NotificationProxyHandler
 * @typedef {(context: import('@helios-starling/utils').ErrorMessageContext, starlings: import('../managers/starlings').StarlingsManager) => import('./starling').Starling} ErrorMessageProxyHandler
 */
/**
 * @typedef {Object} ProxiesMiddlewares
 * @property {RequestProxyHandler?} [onRequest]
 * @property {ResponseProxyHandler?} [onResponse]
 * @property {NotificationProxyHandler?} [onNotification]
 * @property {ErrorMessageProxyHandler?} [onErrorMessage]
 */
/**
* Core Helios server class
*/
export class Helios extends NetworkNode {
    /** @param {HeliosOptions} options */
    constructor(options?: HeliosOptions);
    /**
    * Encryption keys used by the server
    * @private
    */
    private _keys;
    /**
     * Proxy middlewares
     * @type {ProxiesMiddlewares}
     */
    _proxies: ProxiesMiddlewares;
    _starlings: StarlingsManager;
    _handlers: {
        /**
        * Handles new WebSocket connections
        * Implements connection recovery and Starling initialization
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        */
        open: (ws: Bun.ServerWebSocket) => Promise<void>;
        /**
        * Handles incoming WebSocket messages
        * Validates and routes messages to appropriate handlers
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string|ArrayBuffer|Uint8Array} message Raw message data
        */
        message: (ws: Bun.ServerWebSocket, message: string | ArrayBuffer | Uint8Array) => void;
        /**
        * Handles WebSocket connection closures
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string} code Close code
        * @param {string} reason Close reason
        */
        close: (ws: Bun.ServerWebSocket, code: string, reason: string) => void;
        /**
        * Handles WebSocket errors
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {Error} error Error object
        */
        error: (ws: Bun.ServerWebSocket, error: Error) => void;
    };
    /**
     * Starts the Helios server with Bun
     * @param {number?} [port]
     */
    serve: (port?: number | null) => void;
    /**
     * @param {ProxiesMiddlewares} proxies
     */
    useProxies: (proxies?: ProxiesMiddlewares) => void;
    /**
     * Handle new Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onConnection: (handler: (starling: import("./starling").Starling) => void) => any;
    /**
     * Handle lost Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onDisconnection: (handler: (starling: import("./starling").Starling) => void) => any;
    /**
     * Handle recovered Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onRecovery: (handler: (starling: import("./starling").Starling) => void) => any;
    /**
    * Gets server options
    * @returns {HeliosOptions}
    */
    get options(): HeliosOptions;
    /**
     * Bun Websocket handlers
     */
    get handlers(): {
        /**
        * Handles new WebSocket connections
        * Implements connection recovery and Starling initialization
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        */
        open: (ws: Bun.ServerWebSocket) => Promise<void>;
        /**
        * Handles incoming WebSocket messages
        * Validates and routes messages to appropriate handlers
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string|ArrayBuffer|Uint8Array} message Raw message data
        */
        message: (ws: Bun.ServerWebSocket, message: string | ArrayBuffer | Uint8Array) => void;
        /**
        * Handles WebSocket connection closures
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string} code Close code
        * @param {string} reason Close reason
        */
        close: (ws: Bun.ServerWebSocket, code: string, reason: string) => void;
        /**
        * Handles WebSocket errors
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {Error} error Error object
        */
        error: (ws: Bun.ServerWebSocket, error: Error) => void;
    };
    /**
     * Gets the Proxy middlewares
     */
    get proxies(): ProxiesMiddlewares;
    /**
     * Gets the Starlings manager
     */
    get starlings(): StarlingsManager;
}
/**
 * /**
 */
export type NetworkNodeOptions = import("@helios-starling/utils").NetworkNodeOptions;
export type HeliosOptions = NetworkNodeOptions & {
    connectionKey?: Uint8Array | string;
};
export type ProxyCallback = (: any) => false | import("./starling").Starling;
export type RequestProxyHandler = (context: import("@helios-starling/utils").RequestContext, starlings: import("../managers/starlings").StarlingsManager) => import("./starling").Starling;
export type ResponseProxyHandler = (context: import("@helios-starling/utils").ResponseContext, starlings: import("../managers/starlings").StarlingsManager) => import("./starling").Starling;
export type NotificationProxyHandler = (context: import("@helios-starling/utils").NotificationContext, starlings: import("../managers/starlings").StarlingsManager) => import("./starling").Starling;
export type ErrorMessageProxyHandler = (context: import("@helios-starling/utils").ErrorMessageContext, starlings: import("../managers/starlings").StarlingsManager) => import("./starling").Starling;
export type ProxiesMiddlewares = {
    onRequest?: RequestProxyHandler | null;
    onResponse?: ResponseProxyHandler | null;
    onNotification?: NotificationProxyHandler | null;
    onErrorMessage?: ErrorMessageProxyHandler | null;
};
import { NetworkNode } from "@helios-starling/utils";
import { StarlingsManager } from "../managers/starlings";
