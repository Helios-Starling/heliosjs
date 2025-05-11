import { CommonErrors, createApplicationError, createErrorResponse, createNotification, createRequest, createSuccessResponse } from "@helios-starling/utils";
import { Starling } from "../core/starling";

/**
 * @typedef {import("@helios-starling/utils").ProxyHandlers} ProxyHandlers
 */

/**
 * @type {import("@helios-starling/utils").ProxyHandlers}
 */
export const proxyConfiguration = {
    request: async (context) => {
        const {peer, payload, starling} = context;

        /** @type {import("../core/helios").Helios} */
        const helios = starling._networkNode;
        const handler = helios.proxies.onRequest
        
        if (!handler) {
            context.error(CommonErrors.PROXY_FORBIDDEN, 'Proxy is disabled for requests by the server');
            return;
        }

        try {
            const target = await Promise.resolve(handler(context, helios._starlings));
            
            if (!target || !(target instanceof Starling)) {
                context.error(CommonErrors.PROXY_FORBIDDEN, 'Invalid proxy target returned');
                return;
            }

            target.send(createRequest(context.method, payload, {
                requestId: context.requestId,
                metadata: context.metadata,
                peer: {
                    source: starling.id,
                    _peer: peer
                }
            }));
        } catch (error) {
            context.error(
                error.code || CommonErrors.PROXY_ERROR,
                error.message || 'Proxy request failed',
                error.details
            );
        }
    },
    response: async (context) => {
        const {peer, data, starling} = context;

        /** @type {import("../core/helios").Helios} */
        const helios = starling._networkNode;
        const handler = helios.proxies.onResponse;
        if (!handler) {
            starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Proxy is disabled for responses by the server');
            return;
        }

        try {
            const target = await Promise.resolve(handler(context, helios._starlings));
            if (!target || !(target instanceof Starling)) {
                starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Invalid proxy target returned');
                return;
            }

            if (context.error) {
                target.send(createErrorResponse(context.requestId, context.error.code, context.error.message, context.error.details, {
                    metadata: context.metadata,
                    peer: {
                        source: starling.id,
                        _peer: peer
                    }
                }));
            } else {
                target.send(createSuccessResponse(context.requestId, data, {
                    metadata: context.metadata,
                    peer: {
                        source: starling.id,
                        _peer: peer
                    }
                }));
            } 
        } catch (error) {
            starling.sendError(
                error.code || CommonErrors.PROXY_ERROR,
                error.message || 'Proxy response failed',
                error.details
            );
        }
    },
    notification: async (context) => {
        const {peer, data, starling} = context;

        /** @type {import("../core/helios").Helios} */
        const helios = starling._networkNode;
        const handler = helios.proxies.onNotification;
        if (!handler) {
            starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Proxy is disabled for notifications by the server');
            return;
        }

        try {
            const target = await Promise.resolve(handler(context, helios._starlings));
            if (!target || !(target instanceof Starling)) {
                starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Invalid proxy target returned');
                return;
            }

            target.send(createNotification(context.topic, data, {
                metadata: context.metadata,
                peer: {
                    source: starling.id,
                    _peer: peer
                }
            }));
        } catch (error) {
            starling.sendError(
                error.code || CommonErrors.PROXY_ERROR,
                error.message || 'Proxy notification failed',
                error.details
            );
        }
    },
    errorMessage: async (context) => {
        const {peer, message, details, starling} = context;


        /** @type {import("../core/helios").Helios} */
        const helios = starling._networkNode;
        const handler = helios.proxies.onNotification;

        if (!handler) {
            starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Proxy is disabled for notifications by the server');
            return;
        }

        try {
            const target = await Promise.resolve(handler(context, helios._starlings))
            if (!target || !(target instanceof Starling)) {
                starling.sendError(CommonErrors.PROXY_FORBIDDEN, 'Invalid proxy target returned');
                return;
            }

            target.send(createApplicationError(context.code, message, details, {
                metadata: context.metadata,
                peer: {
                    source: starling.id,
                    _peer: peer
                }
            }));
        } catch (error) {
            starling.sendError(
                error.code || CommonErrors.PROXY_ERROR,
                error.message || 'Proxy error message failed',
                error.details
            );
        }
    }
}