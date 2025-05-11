/**
* Manages Starling connections and their lifecycle
*/
export class StarlingsManager {
    /**
    * @param {import('../core/helios').Helios} helios Helios instance
    */
    constructor(helios: import("../core/helios").Helios);
    /** @private */
    private _helios;
    /**
    * Map of active WebSocket connections to their Starling instances
    * @type {Map<import('bun').ServerWebSocket, import('../core/starling').Starling>}
    * @private
    */
    private _connections;
    /**
    * Map of Starling IDs to their instances
    * @type {Map<import('bun').ServerWebSocket, import('../core/starling').Starling>}
    * @private
    */
    private _starlingsById;
    /**
    * Handles new WebSocket connections and recovery attempts
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    */
    handleConnection: (ws: import("bun").ServerWebSocket) => Promise<void>;
    /**
    * Attempts to recover a previous Starling connection
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @param {string} token Recovery token
    * @returns {Promise<import('../core/starling').Starling|null>}
    * @private
    */
    private _attemptRecovery;
    /**
    * Creates a new Starling instance
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @param {string} [recoverToken] Optional recovery token for state restoration
    * @private
    */
    private _createNewStarling;
    /**
    * Gets a Starling instance by WebSocket connection
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @returns {import('../core/starling').Starling|undefined}
    */
    get: (ws: import("bun").ServerWebSocket) => import("../core/starling").Starling | undefined;
    /**
    * Gets a Starling instance by ID
    * @param {string} id Starling ID
    * @returns {import('../core/starling').Starling|undefined}
    */
    getById: (id: string) => import("../core/starling").Starling | undefined;
    /**
    * Filters Starlings based on a predicate
    * @param {function(import('../core/starling').Starling): boolean} predicate Filter function
    * @returns {import('../core/starling').Starling[]}
    */
    filter: (predicate: (arg0: import("../core/starling").Starling) => boolean) => import("../core/starling").Starling[];
    /**
     * Finds a Starling based on a predicate
     * @param {function(import('../core/starling').Starling, number, import('../core/starling').Starling[]): boolean} predicate Find function
     * @returns {import('../core/starling').Starling|undefined}
     * @private
     */
    private find;
    /**
    * Removes a Starling from the manager
    * @param {import('../core/starling').Starling} starling Starling instance
    * @returns {boolean} Whether the Starling was removed
    */
    remove: (starling: import("../core/starling").Starling) => boolean;
    /**
    * Broadcasts a notification to all connected Starlings
    * @param {string} topic Notification topic
    * @param {*} data Notification data
    * @param {function(import('../core/starling').Starling): boolean} [filter] Optional filter predicate
    */
    broadcast: (topic: string, data: any, filter?: (arg0: import("../core/starling").Starling) => boolean) => void;
    /**
    * Gets the count of connected Starlings
    */
    get connectedCount(): number;
    /**
    * Gets the total count of Starlings (connected + disconnected)
    */
    get totalCount(): number;
}
