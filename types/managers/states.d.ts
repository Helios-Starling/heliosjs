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
    constructor(starling: import("../core/starling").Starling);
    /** @private */
    private _starling;
    /**
     * Registered state providers by namespace
     * @type {Map<string, StateProvider>}
     * @private
     */
    private _providers;
    /**
     * State registration options by namespace
     * @type {Map<string, StateRegistrationOptions>}
     * @private
     */
    private _options;
    _stateGenerationLock: Promise<any>;
    _currentGenerationId: `${string}-${string}-${string}-${string}-${string}`;
    /**
     * Registers a new state provider
     * @param {string} namespace State namespace
     * @param {function(): Promise<*>} save Save function
     * @param {function(*): Promise<void>} restore Restore function
     * @param {StateRegistrationOptions} [options={}] Registration options
     * @throws {Error} If namespace is already registered
     */
    register: (namespace: string, save: () => Promise<any>, restore: (arg0: any) => Promise<void>, options?: StateRegistrationOptions) => void;
    /**
     * Generates a recovery token with current states
     * @param {StateTokenOptions} [options={}] Token options
     * @returns {Promise<string>} JWT token containing states
     */
    generateToken: (options?: StateTokenOptions) => Promise<string>;
    /**
     * Restores states from a recovery token
     * @param {string} token JWT token containing states
     * @returns {Promise<void>}
     */
    restore: (token: string) => Promise<void>;
    /**
     * Notifies the Starling of its current state token
     * @param {StateTokenOptions} [options={}] Token options
     */
    notifyState: (options?: StateTokenOptions) => Promise<void>;
    /**
     * @private
     */
    private _registerCoreStates;
    /**
     * Gets all registered state namespaces
     * @returns {string[]}
     */
    get namespaces(): string[];
    /**
     * Checks if a namespace is registered
     * @param {string} namespace Namespace to check
     * @returns {boolean}
     */
    hasNamespace: (namespace: string) => boolean;
}
export type StateProvider = {
    /**
     * Function to save state
     */
    save: () => Promise<any>;
    /**
     * Function to restore state
     */
    restore: (arg0: any) => Promise<void>;
    /**
     * Optional validation function
     */
    validate?: (arg0: any) => boolean;
};
export type StateTokenOptions = {
    /**
     * Token expiration time
     */
    expiresIn?: string;
    /**
     * Additional JWT claims
     */
    customClaims?: any;
};
export type StateRegistrationOptions = {
    /**
     * Whether this state is required for recovery
     */
    required?: boolean;
    /**
     * Custom validation function
     */
    validate?: (arg0: any) => boolean;
    /**
     * Default state if none exists
     */
    defaultState?: any;
};
