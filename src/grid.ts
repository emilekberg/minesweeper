import { neighbourPositions } from "./constants/neighbour-positions";

export default class Grid<T> {
  width: number;
  height: number;
  data: T[];

  /**
   * initializes the grid.
   * Callback is called for each element in the grid.
   * @param width 
   * @param height 
   * @param callback 
   */
  init(width: number, height: number, getDataCallback: (i: number, position: { x: number, y: number }) => T) {
    this.data = [];
    this.width = width;
    this.height = height;
    for (let i = 0; i < width * height; i++) {
      const position = this.getPositionFromIndex(i);
      this.data.push(getDataCallback(i, position));
    }
  }

  get(x: number, y: number): T {
    const index = this.getIndexFromPosition(x, y);
    return this.getDataFromIndex(index);
  }

  getDataFromIndex(index: number): T {
    return this.data[index];
  }

  /**
   * Returns the index of a 2d array, from the specified x and y paramters.
   * @param x 
   * @param y 
   * @returns 
   */
  getIndexFromPosition(x: number, y: number): number {
    return y * this.width + x;
  }
  /**
   * gets the position from an index value.
   * @param index 
   * @returns 
   */
  getPositionFromIndex(index: number): { x: number, y: number } {
    return {
      x: index % this.width,
      y: Math.floor(index / this.width)
    }
  }

  /**
  * Validates that the provided point is within the broundries
  * of the grid.
  * @param x 
  * @param y 
  * @returns 
  */
  isPointWithinBoundries(x: number, y: number): boolean {
    if (x < 0 || x >= this.width) return false;
    if (y < 0 || y >= this.height) return false;
    return true;
  }

  getAdjacentTilePositions(startX: number, startY: number): Array<{ x: number, y: number }> {
    const result = [];
    for (const adjacent of neighbourPositions) {
      const x = startX + adjacent.x;
      const y = startY + adjacent.y;
      if (!this.isPointWithinBoundries(x, y)) continue;
      result.push({ x, y });
    }
    return result;
  }
}