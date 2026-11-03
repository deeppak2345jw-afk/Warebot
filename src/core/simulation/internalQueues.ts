/**
 * Internal simulation queue helpers used by the frontend engine runtime.
 * (The project's formal data structures are implemented exclusively in C++ under src/core/data-structures/)
 */

export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  public enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  public dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const min = this.heap[0].item;
    const end = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    return min;
  }

  public peek(): T | undefined {
    return this.heap[0]?.item;
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public clear(): void {
    this.heap = [];
  }

  public toArray(): { item: T; priority: number }[] {
    return [...this.heap];
  }

  private bubbleUp(index: number): void {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < element.priority) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        if (
          (swapIdx === null && this.heap[rightChildIdx].priority < element.priority) ||
          (swapIdx !== null && this.heap[rightChildIdx].priority < this.heap[leftChildIdx].priority)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      index = swapIdx;
    }
  }
}

export class Queue<T> {
  private items: T[] = [];
  private head: number = 0;

  public enqueue(item: T): void {
    this.items.push(item);
  }

  public dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const item = this.items[this.head];
    this.head++;
    if (this.head > 100 && this.head * 2 >= this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  public peek(): T | undefined {
    if (this.isEmpty()) return undefined;
    return this.items[this.head];
  }

  public size(): number {
    return this.items.length - this.head;
  }

  public isEmpty(): boolean {
    return this.size() === 0;
  }

  public clear(): void {
    this.items = [];
    this.head = 0;
  }

  public toArray(): T[] {
    return this.items.slice(this.head);
  }

  public remove(predicate: (item: T) => boolean): boolean {
    const active = this.toArray();
    const index = active.findIndex(predicate);
    if (index !== -1) {
      active.splice(index, 1);
      this.items = active;
      this.head = 0;
      return true;
    }
    return false;
  }

  public find(predicate: (item: T) => boolean): T | undefined {
    return this.toArray().find(predicate);
  }
}

export class Stack<T> {
  private items: T[] = [];

  public push(item: T): void {
    this.items.push(item);
  }

  public pop(): T | undefined {
    return this.items.pop();
  }

  public peek(): T | undefined {
    return this.items.length > 0 ? this.items[this.items.length - 1] : undefined;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public size(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items = [];
  }

  public toArray(): T[] {
    return [...this.items];
  }

  public toArrayReversed(): T[] {
    return [...this.items].reverse();
  }
}

export class LinkedList<T> {
  private items: T[] = [];

  public append(value: T): void {
    this.items.push(value);
  }

  public prepend(value: T): void {
    this.items.unshift(value);
  }

  public shift(): T | undefined {
    return this.items.shift();
  }

  public pop(): T | undefined {
    return this.items.pop();
  }

  public peekFirst(): T | undefined {
    return this.items[0];
  }

  public peekLast(): T | undefined {
    return this.items[this.items.length - 1];
  }

  public size(): number {
    return this.items.length;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public clear(): void {
    this.items = [];
  }

  public toArray(): T[] {
    return [...this.items];
  }

  public toArrayReversed(): T[] {
    return [...this.items].reverse();
  }
}

export class HashMap<K extends string | number, V> {
  private map: Map<K, V> = new Map();
  private accessCount: number = 0;
  private hitCount: number = 0;
  private missCount: number = 0;

  public set(key: K, value: V): void {
    this.map.set(key, value);
  }

  public get(key: K): V | undefined {
    this.accessCount++;
    if (this.map.has(key)) {
      this.hitCount++;
      return this.map.get(key);
    }
    this.missCount++;
    return undefined;
  }

  public has(key: K): boolean {
    return this.map.has(key);
  }

  public delete(key: K): boolean {
    return this.map.delete(key);
  }

  public clear(): void {
    this.map.clear();
    this.accessCount = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  public size(): number {
    return this.map.size;
  }

  public keys(): K[] {
    return Array.from(this.map.keys());
  }

  public values(): V[] {
    return Array.from(this.map.values());
  }

  public entries(): [K, V][] {
    return Array.from(this.map.entries());
  }

  public getMetrics() {
    const total = this.accessCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 100;
    return {
      size: this.map.size,
      accessCount: this.accessCount,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 10) / 10,
    };
  }
}
