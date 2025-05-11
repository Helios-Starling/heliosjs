/**
 * @typedef {Object} ProxyMetrics
 * @property {number} totalProxied Nombre total de messages proxy
 * @property {number} activeProxies Messages en cours de proxy
 * @property {number} deniedProxies Nombre de proxy refusés
 * @property {number} successfulProxies Nombre de proxy réussis
 * @property {Object} byType Statistiques par type de message
 * @property {number[]} latencies Latences des derniers proxy (ms)
 */
/**
 * @callback ProxyRuleHandler
 * @returns {Promise<import('../core/starling').Starling>} Cible du proxy
 */
/**
 * @typedef {Object} ProxyRule
 * @property {Function} handler Handler de décision pour le proxy
 * @property {Object} options Options du handler
 * @property {boolean} [options.allowRequests=true] Autorise les requêtes
 * @property {boolean} [options.allowNotifications=true] Autorise les notifications
 * @property {number} [options.timeout=30000] Timeout pour les requêtes proxy
 */
/**
 * Gère le routage proxy entre clients
 */
export class ProxyManager {
    /**
     * @param {import('../core/helios').Helios} helios Instance Helios
     */
    constructor(helios: import("../core/helios").Helios);
    /** @private */
    private _helios;
    /** @private */
    private _events;
    /** @private */
    private _rules;
    /** @private */
    private _metrics;
    /** @private */
    private _activeProxies;
    /**
     * Configure les règles de proxy
     * @param {ProxyRule} rule Configuration du proxy
     */
    setRule(rule: ProxyRule): void;
    /**
     * Gère un message à proxifier
     * @param {import('@helios-starling/utils').BaseMessage} message Message à proxy
     * @param {import('../core/starling').Starling} source Client source
     * @returns {Promise<boolean>} Succès du proxy
     */
    handleProxy(message: import("@helios-starling/utils").BaseMessage, source: import("../core/starling").Starling): Promise<boolean>;
    /**
     * Gère une réponse à une requête proxy
     * @param {import('@helios-starling/utils').Response} response Réponse
     * @param {import('../core/starling').Starling} source Client répondant
     */
    handleProxyResponse(response: import("@helios-starling/utils").Response, source: import("../core/starling").Starling): Promise<void>;
    /**
     * @private
     */
    private _validateProxy;
    /**
     * @private
     */
    private _resolveTarget;
    /**
     * @private
     */
    private _enrichMessage;
    /**
     * @private
     */
    private _trackProxyRequest;
    /**
     * @private
     */
    private _sendToTarget;
    /**
     * @private
     */
    private _handleProxyError;
    /**
     * @private
     */
    private _handleProxyTimeout;
    /**
     * @private
     */
    private _updateMetrics;
    /**
     * Récupère les métriques de proxy
     * @returns {ProxyMetrics}
     */
    getMetrics(): ProxyMetrics;
}
export type ProxyMetrics = {
    /**
     * Nombre total de messages proxy
     */
    totalProxied: number;
    /**
     * Messages en cours de proxy
     */
    activeProxies: number;
    /**
     * Nombre de proxy refusés
     */
    deniedProxies: number;
    /**
     * Nombre de proxy réussis
     */
    successfulProxies: number;
    /**
     * Statistiques par type de message
     */
    byType: any;
    /**
     * Latences des derniers proxy (ms)
     */
    latencies: number[];
};
export type ProxyRuleHandler = () => Promise<import("../core/starling").Starling>;
export type ProxyRule = {
    /**
     * Handler de décision pour le proxy
     */
    handler: Function;
    /**
     * Options du handler
     */
    options: {
        allowRequests?: boolean;
        allowNotifications?: boolean;
        timeout?: number;
    };
};
