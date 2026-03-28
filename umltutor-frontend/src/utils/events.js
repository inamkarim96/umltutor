/**
 * Lightweight global event emitter to bridge services and components
 */


class EventEmitter {constructor() { EventEmitter.prototype.__init.call(this); }
     __init() {this.events = {}}

    on(event, handler) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(handler);
    }

    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(h => h !== handler);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(handler => handler(data));
    }
}

export const eventBus = new EventEmitter();

// Defined global event keys
export const GLOBAL_EVENTS = {
    SHOW_TOAST: 'SHOW_TOAST',
    AUTH_FAILURE: 'AUTH_FAILURE',
};
