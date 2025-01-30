import { SignJWT, jwtVerify } from "jose";
import { getCurrentTimestamp } from "@helios-starling/utils";

/**
 * @typedef {Object} StateProvider
 * @property {function(): Promise<*>} save Function to save state
 * @property {function(*): Promise<void>} restore Function to restore state
 * @property {function(*): boolean} [validate] Optional validation function
 */

/**
 * @typedef {Object} StateTokenOptions
 * @property {string} [expiresIn='1h'] Token expiration time
 * @property {Object} [customClaims={}] Additional JWT claims
 */

/**
 * @typedef {Object} StateRegistrationOptions
 * @property {boolean} [required=false] Whether this state is required for recovery
 * @property {function(*): boolean} [validate] Custom validation function
 * @property {Object} [defaultState=null] Default state if none exists
 */

/**
 * Manages Starling state persistence and recovery
 */
export class StatesManager {
  /**
   * @param {import('../core/starling').Starling} starling Starling instance
   */
  constructor(starling) {
    /** @private */
    this._starling = starling;

    /**
     * Registered state providers by namespace
     * @type {Map<string, StateProvider>}
     * @private
     */
    this._providers = new Map();

    /**
     * State registration options by namespace
     * @type {Map<string, StateRegistrationOptions>}
     * @private
     */
    this._options = new Map();

    this._stateGenerationLock = null;
    this._currentGenerationId = null;

    // Register core states
    this._registerCoreStates();
  }

  /**
   * Registers a new state provider
   * @param {string} namespace State namespace
   * @param {function(): Promise<*>} save Save function
   * @param {function(*): Promise<void>} restore Restore function
   * @param {StateRegistrationOptions} [options={}] Registration options
   * @throws {Error} If namespace is already registered
   */
  register = (namespace, save, restore, options = {}) => {
    if (this._providers.has(namespace)) {
      throw new Error(`State namespace ${namespace} is already registered`);
    }

    this._providers.set(namespace, {
      save: save.bind(this._starling),
      restore: restore.bind(this._starling),
      validate: options.validate?.bind(this._starling)
    });

    this._options.set(namespace, {
      required: false,
      defaultState: null,
      ...options
    });
    
    this._starling._helios.events.emit('state:registered', {
      starling: this._starling.id,
      namespace,
      debug: {
        type: 'info',
        message: `State provider registered for namespace ${namespace}`
      }
    });
  }

  /**
   * Generates a recovery token with current states
   * @param {StateTokenOptions} [options={}] Token options
   * @returns {Promise<string>} JWT token containing states
   */
  generateToken = async (options = {}) => {
    const generationId = crypto.randomUUID();

    // Attendre si un autre processus est en cours
    while (this._stateGenerationLock) {
      await this._stateGenerationLock;
    }

    // Créer un nouveau verrou
    let unlockFn;
    this._stateGenerationLock = new Promise(resolve => {
      unlockFn = resolve;
    });
    this._currentGenerationId = generationId;

    try {
      const statePromises = [];
      const states = {};
      const errors = [];
      const timestamp = getCurrentTimestamp();

      // Collecter les états
      for (const [namespace, provider] of this._providers) {
        statePromises.push(
          provider.save()
            .then(state => {
              // Vérifier si nous sommes toujours le processus actif
              if (this._currentGenerationId === generationId) {
                states[namespace] = state;
              }
            })
            .catch(error => {
              const opts = this._options.get(namespace);
              if (opts.required) {
                errors.push(`Failed to save required state ${namespace}: ${error.message}`);
              } else {
                this._starling.helios.events.emit('state:save:failed', {
                  starling: this._starling.id,
                  namespace,
                  error,
                  debug: {
                    type: 'warning',
                    message: `Failed to save state for ${namespace}: ${error.message}`
                  }
                });
              }
            })
        );
      }

      await Promise.all(statePromises);

      // Vérifier si nous sommes toujours le processus actif
      if (this._currentGenerationId !== generationId) {
        throw new Error('State generation was superseded by newer request');
      }

      if (errors.length > 0) {
        throw new Error(`State token generation failed: ${errors.join(', ')}`);
      }

      return await new SignJWT({
        starlingId: this._starling.id,
        states,
        timestamp,
        ...options.customClaims
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(options.expiresIn || '1h')
        .sign(this._starling._helios.keys.connection);

    } finally {
      if (this._currentGenerationId === generationId) {
        this._stateGenerationLock = null;
        this._currentGenerationId = null;
      }
      unlockFn();
    }
  }

  /**
   * Restores states from a recovery token
   * @param {string} token JWT token containing states
   * @returns {Promise<void>}
   */
  restore = async (token) => {
    try {
      const { payload } = await jwtVerify(token, this._starling.helios.keys.connection);
      
      if (payload.starlingId !== this._starling.id) {
        throw new Error('Token starling ID mismatch');
      }

      const errors = [];
      const restoredStates = new Set();

      // Restore states from token
      for (const [namespace, state] of Object.entries(payload.states)) {
        const provider = this._providers.get(namespace);
        const options = this._options.get(namespace);

        if (!provider) continue;

        try {
          if (provider.validate && !provider.validate(state)) {
            throw new Error('State validation failed');
          }

          await provider.restore(state);
          restoredStates.add(namespace);

          this._starling.helios.events.emit('starling:state:restored', {
            starling: this._starling.id,
            namespace,
            debug: {
              type: 'info',
              message: `State restored for namespace ${namespace}`
            }
          });
        } catch (error) {
          if (options?.required) {
            errors.push(`Failed to restore required state ${namespace}: ${error.message}`);
          } else {
            this._starling.helios.events.emit('starling:state:restore:failed', {
              starling: this._starling.id,
              namespace,
              error,
              debug: {
                type: 'warning',
                message: `Failed to restore state for ${namespace}: ${error.message}`
              }
            });
          }
        }
      }

      // Check for missing required states
      for (const [namespace, options] of this._options) {
        if (options.required && !restoredStates.has(namespace)) {
          if (options.defaultState) {
            try {
              const provider = this._providers.get(namespace);
              await provider.restore(options.defaultState);
              restoredStates.add(namespace);
            } catch (error) {
              errors.push(`Failed to restore default state for ${namespace}: ${error.message}`);
            }
          } else {
            errors.push(`Required state ${namespace} missing from token`);
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

    } catch (error) {
      this._starling.helios.events.emit('state:restore:failed', {
        starling: this._starling.id,
        error,
        debug: {
          type: 'error',
          message: `State restoration failed: ${error.message}`
        }
      });
      throw error;
    }
  }

  /**
   * Notifies the Starling of its current state token
   * @param {StateTokenOptions} [options={}] Token options
   */
  notifyState = async (options = {}) => {
    try {
      const token = await this.generateToken(options);
      
      this._starling.notify({
        topic: 'state:token',
        data: {
          token,
          expiresIn: options.expiresIn || 3600
        }
      });
    } catch (error) {
      this._starling.helios.events.emit('state:notification:failed', {
        starling: this._starling.id,
        error,
        debug: {
          type: 'error',
          message: `Failed to notify state: ${error.message}`
        }
      });
    }
  }

  /**
   * @private
   */
  _registerCoreStates = () => {
    // Register connection state
    this.register('connection', 
      // Save
      async () => ({
        connected: this._starling.isConnected,
        lastConnected: this._starling.lastConnected
      }),
      // Restore
      async (state) => {
        // Connection state is handled automatically
      },
      { required: true }
    );

    // Register basic info state
    this.register('info',
      // Save
      async () => ({
        id: this._starling.id,
        createdAt: this._starling.createdAt
      }),
      // Restore
      async (state) => {
        // Basic info is restored automatically
      },
      { required: true }
    );
  }

  /**
   * Gets all registered state namespaces
   * @returns {string[]}
   */
  get namespaces() {
    return Array.from(this._providers.keys());
  }

  /**
   * Checks if a namespace is registered
   * @param {string} namespace Namespace to check
   * @returns {boolean}
   */
  hasNamespace = (namespace) => {
    return this._providers.has(namespace);
  }
}