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
    constructor(helios: import("../core/helios").Helios, ws: import("bun").ServerWebSocket, options?: BaseStarlingOptions & StarlingOptions, events: import("@helios-starling/utils").Events);
    /** @protected */
    protected _helios: import("../core/helios").Helios;
    _reconnecting: boolean;
    _states: StatesManager;
    /**
    * Closes the Starling connection permanently
    * @param {string} [reason='Connection closed'] Close reason
    */
    close: (reason?: string) => void;
    /**
    * Links a new WebSocket connection
    * @param {import('bun').ServerWebSocket} ws New WebSocket connection
    */
    link: (ws: import("bun").ServerWebSocket) => Promise<void>;
    _disconnectionTimeout: Timer;
    /**
    * Unlinks the current WebSocket connection
    */
    unlink: () => void;
    get states(): StatesManager;
}
export type BaseStarlingOptions = import("@helios-starling/utils").BaseStarlingOptions;
export type StarlingOptions = {
    /**
     * Time in ms before a disconnected Starling is removed
     */
    disconnectionTTL?: number;
};
import { BaseStarling } from "@helios-starling/utils";
import { StatesManager } from "../managers/states";
