
/**
* @type {import("@helios-starling/utils").builtInMethods}
*/
export const builtInMethods = {
    "system:ping": async (context) => {
        context.success({
            timestamp: getCurrentTimestamp(),
            uptime: process.uptime()
        });
    },
    "system:capabilities": async context => {
        context.success({
            protocol: this.protocolInfo,
            features: {
                notifications: true,
                stateRecovery: true,
                binaryMessages: true
            }
        })
    },
    "starling:state": async context => {
        /**
        * @type {import('./starling').Starling} starling
        */
        const starling = context.starling;
        
        const token = await starling.states.generateToken();
        context.success({
            token,
            expiresIn: 3600,
            state: {
                connectd: starling.isConnected,
                lastConnected: starling.lastConnected
            }
        });
    }
}