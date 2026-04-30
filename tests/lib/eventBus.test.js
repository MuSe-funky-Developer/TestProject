import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../js/lib/eventBus.js';

describe('EventBus', () => {
  describe('emit/on', () => {
    it('ruft einen Subscriber bei emit mit Payload auf', () => {
      const bus = new EventBus();
      const fn = vi.fn();
      bus.on('foo', fn);

      bus.emit('foo', { x: 1 });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith({ x: 1 });
    });

    it('emit ohne Payload ruft Subscriber mit undefined auf', () => {
      const bus = new EventBus();
      const fn = vi.fn();
      bus.on('foo', fn);

      bus.emit('foo');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(undefined);
    });

    it('ruft mehrere Subscriber desselben Events alle auf', () => {
      const bus = new EventBus();
      const a = vi.fn();
      const b = vi.fn();
      const c = vi.fn();
      bus.on('foo', a);
      bus.on('foo', b);
      bus.on('foo', c);

      bus.emit('foo', 'payload');

      expect(a).toHaveBeenCalledWith('payload');
      expect(b).toHaveBeenCalledWith('payload');
      expect(c).toHaveBeenCalledWith('payload');
    });

    it('ruft Subscriber bei wiederholtem emit erneut auf', () => {
      const bus = new EventBus();
      const fn = vi.fn();
      bus.on('foo', fn);

      bus.emit('foo', 1);
      bus.emit('foo', 2);
      bus.emit('foo', 3);

      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenNthCalledWith(1, 1);
      expect(fn).toHaveBeenNthCalledWith(2, 2);
      expect(fn).toHaveBeenNthCalledWith(3, 3);
    });

    it('isoliert verschiedene Events voneinander', () => {
      const bus = new EventBus();
      const fooFn = vi.fn();
      const barFn = vi.fn();
      bus.on('foo', fooFn);
      bus.on('bar', barFn);

      bus.emit('foo', 'foo-payload');

      expect(fooFn).toHaveBeenCalledWith('foo-payload');
      expect(barFn).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('entfernt einen Subscriber, sodass emit ihn nicht mehr aufruft', () => {
      const bus = new EventBus();
      const fn = vi.fn();
      bus.on('foo', fn);

      bus.off('foo', fn);
      bus.emit('foo', { x: 1 });

      expect(fn).not.toHaveBeenCalled();
    });

    it('entfernt nur den angegebenen Subscriber, andere bleiben aktiv', () => {
      const bus = new EventBus();
      const keep = vi.fn();
      const remove = vi.fn();
      bus.on('foo', keep);
      bus.on('foo', remove);

      bus.off('foo', remove);
      bus.emit('foo', 'payload');

      expect(keep).toHaveBeenCalledWith('payload');
      expect(remove).not.toHaveBeenCalled();
    });

    it('off auf nicht registrierte Handler-Funktion ist no-op', () => {
      const bus = new EventBus();
      const registered = vi.fn();
      const notRegistered = vi.fn();
      bus.on('foo', registered);

      expect(() => bus.off('foo', notRegistered)).not.toThrow();

      bus.emit('foo', 'p');
      expect(registered).toHaveBeenCalledWith('p');
    });

    it('off auf unbekanntes Event ist no-op', () => {
      const bus = new EventBus();
      const fn = vi.fn();

      expect(() => bus.off('unknown', fn)).not.toThrow();
    });
  });

  describe('emit auf unbekanntes Event', () => {
    it('emit auf unbekanntes Event wirft nicht', () => {
      const bus = new EventBus();

      expect(() => bus.emit('unknown')).not.toThrow();
    });

    it('emit auf unbekanntes Event mit Payload wirft nicht', () => {
      const bus = new EventBus();

      expect(() => bus.emit('unknown', { data: 42 })).not.toThrow();
    });

    it('emit nach off des letzten Subscribers wirft nicht', () => {
      const bus = new EventBus();
      const fn = vi.fn();
      bus.on('foo', fn);
      bus.off('foo', fn);

      expect(() => bus.emit('foo', 'payload')).not.toThrow();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('Instanz-Isolation', () => {
    it('separate EventBus-Instanzen teilen keine Subscriber', () => {
      const busA = new EventBus();
      const busB = new EventBus();
      const fn = vi.fn();
      busA.on('foo', fn);

      busB.emit('foo', 'payload');

      expect(fn).not.toHaveBeenCalled();
    });
  });
});
