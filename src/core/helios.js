import { NetworkNode } from "@helios-starling/utils";
import { StarlingsManager } from "../managers/starlings";
import { builtInMethods } from "../config/methods.config";
import { proxyConfiguration } from "../config/proxy.config";

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
    constructor(options = {}) {
        super({
            builtInMethods,
            proxyConfiguration
        }, {...options})
        
        /**
        * Encryption keys used by the server
        * @private
        */
        this._keys = {
            connection: options.connectionKey || crypto.getRandomValues(new Uint8Array(32))
        }

        /**
         * Proxy middlewares
         * @type {ProxiesMiddlewares}
         */
        this._proxies = {
            onRequest: false,
            onResponse: false,
            onNotification: false,
            onErrorMessage: false,
        }
        
        this._starlings = new StarlingsManager(this);

        // this.broadcast = this._starlings.broadcast;
    }
    
    _handlers = {
        /**
        * Handles new WebSocket connections
        * Implements connection recovery and Starling initialization
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        */
        open: async (ws) => {
            
            try {
                await this._starlings.handleConnection(ws);
                
                this._events.emit('connection:open', {
                    debug: {
                        type: 'connection',
                        message: `New connection established`
                    }
                });
            } catch (error) {
                this._events.emit('connection:error', {
                    error,
                    debug: {
                        type: 'error',
                        message: `Connection error: ${error.message}`
                    }
                });
            }
        },
        /**
        * Handles incoming WebSocket messages
        * Validates and routes messages to appropriate handlers
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string|ArrayBuffer|Uint8Array} message Raw message data
        */
        message: (ws, message) => {
            const starling = this._starlings.get(ws);
            if (!starling) {
                return;
            }
            
            try {
                starling.handleMessage(message);
            } catch (error) {
                this._events.emit('handling:error', {
                    starling,
                    error,
                    debug: {
                        type: 'error',
                        message: `Message handling error: ${error.message}`
                    }
                });
            }
        },
        /**
        * Handles WebSocket connection closures
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {string} code Close code
        * @param {string} reason Close reason
        */
        close: (ws, code, reason) => {
            try {
                const starling = this._starlings.get(ws);
                if (starling) {
                    starling.unlink();
                }
                this._events.emit('connection:close', {
                    code,
                    reason,
                    debug: {
                        type: 'disconnection',
                        message: `Connection closed: ${reason} (${code})`
                    }
                });
            } catch (error) {
                this._events.emit('connection:error', {
                    error,
                    debug: {
                        type: 'error',
                        message: `Close handling error: ${error.message}`
                    }
                });
            }
        },
        /**
        * Handles WebSocket errors
        * @param {Bun.ServerWebSocket} ws WebSocket connection
        * @param {Error} error Error object
        */
        error: (ws, error) => {
            const starling = this._starlings.get(ws);
            this._events.emit('connection:error', {
                starling,
                error,
                debug: {
                    type: 'error',
                    message: `WebSocket error: ${error.message}`
                }
            });
        }
    }
    
    /**
     * Starts the Helios server with Bun
     * @param {number?} [port]
     */
    serve = (port) => {
        try {
            Bun.serve({
                ...(port ? {port} : {}),
                fetch: (req, server) => {
                    if (server.upgrade(req)) {
                        return;
                    }
                    return new Response("Upgrade failed", {status: 500});
                },
                websocket: this.handlers
            })
            console.log(`🚀 Helios server started on port ${port}`);
        } catch (error) {
            console.error(`❌ Failed to start Helios server: ${error.message}`);
        }
        
    }

    /**
     * @param {ProxiesMiddlewares} proxies 
     */
    useProxies = (proxies = {}) => {
        this._proxies = {
            ...this._proxies,
            ...proxies
        }
    }

    /**
     * Handle new Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onConnection = handler => this._events.on('starling:connected', event => handler(event.data.starling));

    /**
     * Handle lost Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onDisconnection = handler => this._events.on('starling:disconnected', event => handler(event.data.starling));

    /**
     * Handle recovered Starling connection
     * @param {(starling: import('./starling').Starling) => void} handler
     */
    onRecovery = handler => this._events.on('starling:recovered', event => handler(event.data.starling));
    
    /**
    * Gets server options
    * @returns {HeliosOptions}
    */
    get options() {
        return this._options;
    }

    /**
     * Bun Websocket handlers
     */
    get handlers() {
        return this._handlers;
    }

    /**
     * Gets the Proxy middlewares
     */
    get proxies() {
        return this._proxies;
    }
    
    /**
     * Gets the Starlings manager
     */
    get starlings() {
        return this._starlings;
    }

    /**
     * Gets event emitter
     */
    get events() {
        return this._events;
    };
}