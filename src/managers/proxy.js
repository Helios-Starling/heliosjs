// managers/proxy.js
import { Events } from "../core/events";
import { CommonErrors, getCurrentTimestamp } from "@helios-starling/utils";

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
  constructor(helios) {
    /** @private */
    this._helios = helios;

    /** @private */
    this._events = new Events();

    /** @private */
    this._rules = null;

    /** @private */
    this._metrics = {
      totalProxied: 0,
      activeProxies: 0,
      deniedProxies: 0,
      successfulProxies: 0,
      byType: {
        request: 0,
        notification: 0
      },
      latencies: []
    };

    /** @private */
    this._activeProxies = new Map();
  }



  /**
   * Configure les règles de proxy
   * @param {ProxyRule} rule Configuration du proxy
   */
  setRule(rule) {
    if (!rule?.handler || typeof rule.handler !== 'function') {
      throw new Error('Proxy rule must have a handler function');
    }

    this._rules = {
      handler: rule.handler,
      options: {
        allowRequests: true,
        allowNotifications: true,
        timeout: 30000,
        ...rule.options
      }
    };

    this._events.emit('proxy:rule:set', {
      debug: {
        type: 'info',
        message: 'Proxy rules configured'
      }
    });
  }

  /**
   * Gère un message à proxifier
   * @param {import('@helios-starling/utils').BaseMessage} message Message à proxy
   * @param {import('../core/starling').Starling} source Client source
   * @returns {Promise<boolean>} Succès du proxy
   */
  async handleProxy(message, source) {
    const startTime = getCurrentTimestamp();
    this._metrics.totalProxied++;
    this._metrics.activeProxies++;

    try {
      // Vérifier si le proxy est autorisé
      await this._validateProxy(message);

      // Demander au handler de règle la cible
      const target = await this._resolveTarget(message, source);

      // Enrichir le message avec les infos de proxy
      const proxyMessage = this._enrichMessage(message, source);

      // Tracker la requête si nécessaire
      if (message.type === 'request') {
        this._trackProxyRequest(proxyMessage, source);
      }

      // Envoyer au client cible
      await this._sendToTarget(proxyMessage, target);

      this._updateMetrics(startTime);
      return true;

    } catch (error) {
      this._handleProxyError(error, message, source);
      return false;

    } finally {
      this._metrics.activeProxies--;
    }
  }

  /**
   * Gère une réponse à une requête proxy
   * @param {import('@helios-starling/utils').Response} response Réponse 
   * @param {import('../core/starling').Starling} source Client répondant
   */
  async handleProxyResponse(response, source) {
    const proxyInfo = this._activeProxies.get(response.requestId);
    if (!proxyInfo) {
      throw new Error('Unknown proxy response');
    }

    try {
      const sourceClient = this._helios.starlings.get(proxyInfo.sourceId);
      if (!sourceClient) {
        throw new Error('Source client disconnected');
      }

      await sourceClient.send({
        ...response,
        _proxy: {
          ...proxyInfo,
          completed: true
        }
      });

      this._metrics.successfulProxies++;

    } finally {
      this._activeProxies.delete(response.requestId);
    }
  }

  /**
   * @private
   */
  async _validateProxy(message) {
    if (!this._rules) {
      throw new Error('No proxy rules configured');
    }

    if (message.type === 'request' && !this._rules.options.allowRequests) {
      throw new Error('Request proxying is disabled');
    }

    if (message.type === 'notification' && !this._rules.options.allowNotifications) {
      throw new Error('Notification proxying is disabled');
    }
  }

  /**
   * @private
   */
  async _resolveTarget(message, source) {
    const target = await this._rules.handler(message, source);
    
    if (!target || !this._helios.starlings.has(target)) {
      this._metrics.deniedProxies++;
      throw new Error('Proxy target not found or denied');
    }

    return this._helios.starlings.get(target);
  }

  /**
   * @private
   */
  _enrichMessage(message, source) {
    return {
      ...message,
      _proxy: {
        sourceId: source.id,
        timestamp: getCurrentTimestamp(),
        route: [source.id]
      }
    };
  }

  /**
   * @private
   */
  _trackProxyRequest(message, source) {
    this._activeProxies.set(message.requestId, {
      sourceId: source.id,
      timestamp: getCurrentTimestamp()
    });

    // Cleanup si pas de réponse
    setTimeout(() => {
      if (this._activeProxies.has(message.requestId)) {
        this._handleProxyTimeout(message);
      }
    }, this._rules.options.timeout);
  }

  /**
   * @private
   */
  async _sendToTarget(message, target) {
    try {
      await target.send(message);
      this._metrics.byType[message.type]++;
    } catch (error) {
      throw new Error(`Failed to send to target: ${error.message}`);
    }
  }

  /**
   * @private
   */
  _handleProxyError(error, message, source) {
    this._events.emit('proxy:error', {
      error,
      message,
      source: source.id,
      debug: {
        type: 'error',
        message: `Proxy error: ${error.message}`
      }
    });

    if (message.type === 'request') {
      source.send({
        type: 'response',
        requestId: message.requestId,
        success: false,
        error: {
          code: CommonErrors.PROXY_ERROR,
          message: error.message
        }
      });
    }
  }

  /**
   * @private
   */
  _handleProxyTimeout(message) {
    this._activeProxies.delete(message.requestId);
    this._events.emit('proxy:timeout', {
      requestId: message.requestId,
      debug: {
        type: 'warning',
        message: `Proxy request ${message.requestId} timed out`
      }
    });
  }

  /**
   * @private
   */
  _updateMetrics(startTime) {
    const latency = getCurrentTimestamp() - startTime;
    this._metrics.latencies.push(latency);
    
    // Garder seulement les 100 dernières latences
    if (this._metrics.latencies.length > 100) {
      this._metrics.latencies.shift();
    }
  }

  /**
   * Récupère les métriques de proxy
   * @returns {ProxyMetrics}
   */
  getMetrics() {
    return {
      ...this._metrics,
      averageLatency: this._metrics.latencies.reduce((a, b) => a + b, 0) / this._metrics.latencies.length
    };
  }
}