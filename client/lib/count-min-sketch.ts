export class CountMinSketch {
  private readonly width: number;
  private readonly depth: number;
  private readonly table: Uint32Array;

  constructor(width = 256, depth = 4) {
    this.width = width;
    this.depth = depth;
    this.table = new Uint32Array(width * depth);
  }

  add(key: string, count = 1) {
    for (let row = 0; row < this.depth; row++) {
      this.table[row * this.width + this.column(key, row)] += count;
    }
  }

  estimate(key: string) {
    let min = Number.POSITIVE_INFINITY;
    for (let row = 0; row < this.depth; row++) {
      min = Math.min(min, this.table[row * this.width + this.column(key, row)]);
    }
    return min;
  }

  private column(key: string, row: number) {
    let hash = 2166136261 ^ Math.imul(row + 1, 0x9e3779b1);
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % this.width;
  }
}
