export class EventBus {
  #subscribers = new Map();

  on(event, handler) {
    let handlers = this.#subscribers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#subscribers.set(event, handlers);
    }
    handlers.add(handler);
  }

  off(event, handler) {
    this.#subscribers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.#subscribers.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }
}
