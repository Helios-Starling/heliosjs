import { Starling } from "../core/starling";
import { jwtVerify } from "jose";

/**
* Manages Starling connections and their lifecycle
*/
export class StarlingsManager {
    
    /**
    * @param {import('../core/helios').Helios} helios Helios instance
    */
    constructor(helios) {
        
        /** @private */
        this._helios = helios;
        
        /**
        * Map of active WebSocket connections to their Starling instances
        * @type {Map<import('bun').ServerWebSocket, import('../core/starling').Starling>}
        * @private
        */
        this._connections = new Map();
        
        /**
        * Map of Starling IDs to their instances
        * @type {Map<import('bun').ServerWebSocket, import('../core/starling').Starling>}
        * @private
        */
        this._starlingsById = new Map();
    }
    
    /**
    * Handles new WebSocket connections and recovery attempts
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    */
    handleConnection = async (ws) => {
        let shouldCreateNewStarling = true;
        let recoverToken;
        
        try {
            recoverToken = ws.data?.recover;
            
            if (recoverToken) {
                const recoveredStarling = await this._attemptRecovery(ws, recoverToken);
                if (recoveredStarling) {
                    shouldCreateNewStarling = false;
                }
            }
        } catch (error) {
            this._helios.events.emit('starling:recovery:failed', {
                error,
                debug: {
                    type: 'warning',
                    message: `Recovery failed: ${error.message}`
                }
            });
        }
        
        if (shouldCreateNewStarling) {
            await this._createNewStarling(ws, recoverToken);
        }
    }
    
    /**
    * Attempts to recover a previous Starling connection
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @param {string} token Recovery token
    * @returns {Promise<import('../core/starling').Starling|null>}
    * @private
    */
    _attemptRecovery = async (ws, token) => {
        const { payload } = await jwtVerify(token, this._helios.keys.connection);
        const existingStarling = this._starlingsById.get(payload.starlingId);
        
        if (!existingStarling) {
            return null;
        }
        
        // Unlink from old connection if it exists
        if (this._connections.has(existingStarling.ws)) {
            this._connections.delete(existingStarling.ws);
        }
        
        // Link to new connection
        await existingStarling.link(ws);
        this._connections.set(ws, existingStarling);
        
        // Notify successful recovery
        existingStarling.notify({
            topic: 'connection:recovered',
            data: {
                timestamp: Date.now(),
                recoveredFrom: payload.timestamp
            }
        });
        
        this._helios.events.emit('starling:recovered', {
            starling: existingStarling,
            debug: {
                type: 'connection',
                message: `Starling ${existingStarling.id} recovered`
            }
        });
        
        return existingStarling;
    }
    
    /**
    * Creates a new Starling instance
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @param {string} [recoverToken] Optional recovery token for state restoration
    * @private
    */
    _createNewStarling = async (ws, recoverToken = null) => {
        
        const starling = new Starling(this._helios, ws, {
            networkNode: this._helios
        });
        
        if (recoverToken) {
            try {
                await starling.states.restore(recoverToken);
            } catch (error) {
                this._helios.events.emit('starling:state:restore:failed', {
                    error,
                    starling,
                    debug: {
                        type: 'warning',
                        message: `State restoration failed: ${error.message}`
                    }
                });
            }
        }
        
        this._connections.set(ws, starling);
        this._starlingsById.set(starling.id, starling);
        
        this._helios.events.emit('starling:new', {
            starling,
            debug: {
                type: 'connection',
                message: `New Starling ${starling.id} created`
            }
        });
        
        return starling;
    }
    
    /**
    * Gets a Starling instance by WebSocket connection
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @returns {import('../core/starling').Starling|undefined}
    */
    get = (ws) => {
        return this._connections.get(ws);
    }
    
    /**
    * Gets a Starling instance by ID
    * @param {string} id Starling ID
    * @returns {import('../core/starling').Starling|undefined}
    */
    getById = (id) => {
        return this._starlingsById.get(id);
    }
    
    /**
    * Filters Starlings based on a predicate
    * @param {function(import('../core/starling').Starling): boolean} predicate Filter function
    * @returns {import('../core/starling').Starling[]}
    */
    filter = (predicate) => {
        return Array.from(this._starlingsById.values()).filter(predicate);
    }

    /**
     * Finds a Starling based on a predicate
     * @param {function(import('../core/starling').Starling, number, import('../core/starling').Starling[]): boolean} predicate Find function
     * @returns {import('../core/starling').Starling|undefined}
     * @private
     */
    find = (predicate) => {
        return Array.from(this._starlingsById.values()).find(predicate);
    }
    
    /**
    * Removes a Starling from the manager
    * @param {import('../core/starling').Starling} starling Starling instance
    * @returns {boolean} Whether the Starling was removed
    */
    remove = (starling) => {
        if (!this._starlingsById.has(starling.id)) {
            return false;
        }
        
        this._connections.delete(starling.ws);
        this._starlingsById.delete(starling.id);
        
        this._helios.events.emit('starling:removed', {
            starling,
            debug: {
                type: 'disconnection',
                message: `Starling ${starling.id} removed`
            }
        });
        
        return true;
    }
    
    /**
    * Broadcasts a notification to all connected Starlings
    * @param {string} topic Notification topic
    * @param {*} data Notification data
    * @param {function(import('../core/starling').Starling): boolean} [filter] Optional filter predicate
    */
    broadcast = (topic, data, filter = null) => {
        const targets = filter 
        ? this.filter(filter)
        : Array.from(this._starlingsById.values());
        
        for (const starling of targets) {
            if (starling.isConnected) {
                starling.notify({ topic, data });
            }
        }
    }
    
    /**
    * Gets the count of connected Starlings
    */
    get connectedCount() {
        return Array.from(this._starlingsById.values())
        .filter(s => s.isConnected)
        .length;
    }
    
    /**
    * Gets the total count of Starlings (connected + disconnected)
    */
    get totalCount() {
        return this._starlingsById.size;
    }
    
}