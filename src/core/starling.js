import { BaseStarling, getCurrentTimestamp } from "@helios-starling/utils";
import { StatesManager } from "../managers/states";
import { randomUUIDv7 } from "bun";

/**
* @typedef {import('@helios-starling/utils').BaseStarlingOptions} BaseStarlingOptions
*/

/**
* @typedef {Object} StarlingOptions
* @property {number} [disconnectionTTL=300000] Time in ms before a disconnected Starling is removed
*/

/**
* Starling instance
*/
export class Starling extends BaseStarling {
    /**
    * @param {import('../core/helios').Helios} helios Helios server instance
    * @param {import('bun').ServerWebSocket} ws WebSocket connection
    * @param {BaseStarlingOptions & StarlingOptions} [options={}] Starling configuration options
    * @param {import('@helios-starling/utils').Events} events Event manager
    */
    constructor(helios, ws, options = {}, events) {
        super({
            disconnectionTTL: 300000,
            id: randomUUIDv7(),
            ...options
        }, events);

        /** @protected */
        this._helios = helios;
        
        /** @protected @type {import('bun').ServerWebSocket} */
        this._ws = ws;

         // Reconnection flag
         this._reconnecting = false;

        this._states = new StatesManager(this);
    }
    
    
    /**
    * Closes the Starling connection permanently
    * @param {string} [reason='Connection closed'] Close reason
    */
    close = (reason = 'Connection closed') => {
        this._requests.cancelAll();
        this._buffer.flush();
        this._data.clear();
        
        if (this._ws) {
            try {
                this._ws.close(1000, reason);
            } catch (error) {
                error;
            }
        }
        
        this._helios.events.emit('starling:closed', {
            starling: this,
            reason,
            debug: {
                type: 'disconnection',
                message: `Starling ${this.id} closed: ${reason}`
            }
        });
    }
    
    /**
    * Links a new WebSocket connection
    * @param {import('bun').ServerWebSocket} ws New WebSocket connection
    */
    link = async (ws) => {
        if (this._reconnecting) {
            this._helios.events.emit('starling:reconnect:duplicate', {
                starling: this,
                debug: {
                    type: 'warning',
                    message: `Ignoring duplicate reconnection attempt for Starling ${this.id}`
                }
            });
            return;
        }
        
        try {
            this._reconnecting = true;
            this._ws = ws;
            this._lastConnected = getCurrentTimestamp();
            this._disconnectedAt = null;
            
            if (this._disconnectionTimeout) {
                clearTimeout(this._disconnectionTimeout);
                this._disconnectionTimeout = null;
            }
            
            this.events.emit('starling:connected', {
                starling: this,
                debug: {
                    type: 'connection',
                    message: `Starling ${this.id} connected, processed buffered messages`
                }
            })
            this._buffer.flush();
            
            this._helios.events.emit('starling:connected', {
                starling: this,
                debug: {
                    type: 'connection',
                    message: `Starling ${this.id} connected, processed buffered messages`
                }
            });
        } catch (error) {
            this._helios.events.emit('starling:reconnect:failed', {
                starling: this,
                error,
                debug: {
                    type: 'error',
                    message: `Reconnection failed for Starling ${this.id}: ${error.message}`
                }
            });
            
            // Revert to disconnected state
            this.unlink();
            throw error;
            
        } finally {
            this._reconnecting = false;
        }
    }
    
    /**
    * Unlinks the current WebSocket connection
    */
    unlink = () => {
        this._ws = null;
        this._disconnectedAt = getCurrentTimestamp();
        this.events.emit('starling:disconnected');
        
        this._disconnectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this.close('Connection timed out');
            }
        }, this._helios.options?.disconnectionTTL || 300000);
        
        this._helios.events.emit('starling:disconnected', {
            starling: this,
            bufferedMessages: this._buffer.size,
            queuedRequests: this._requests._queue.stats.size,
            debug: {
                type: 'disconnection',
                message: `Starling ${this.id} disconnected`
            }
        });
    }
    
    
    
    get states() {
        return this._states;
    }
}