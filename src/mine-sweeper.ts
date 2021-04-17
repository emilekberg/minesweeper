import type CellData from "./components/cell-data";
import { neighbourPositions } from './constants/neighbour-positions';
/**
 * Minesweeper game.
 */
export default class MineSweeper {
  protected _isGameOver: boolean = false;
  /**
   * Container for the cells.
   * Store multi-dimentional array in a single-dimension array.
   */
  protected data: CellData[];
  /**
   * Width of the game grid.
   */
  protected width: number;
  /**
   * Height of the game grid.
   */
  protected height: number

  /**
   * Initializes a new game.
   * @param width 
   * @param height 
   * @param numMines 
   */
  init(width: number, height: number, numMines: number) {
    this._isGameOver = false;
    this.width = width;
    this.height = height;
    this.data = [];
    for (let i = 0; i < width * height; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      this.data.push({
        x,
        y,
        isMine: false,
        hasFlag: false,
        numNeighborMines: 0,
        isRevealed: false
      });
      
    }

    for (let i = 0; i < numMines; i++) {
      const index = Math.floor(Math.random() * this.data.length);
      this.data[index].isMine = true;
    }

    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].isMine) continue;
      let numNeighbours = 0;
      const position = this.data[i];
  
      for (const neighbour of neighbourPositions) {
        const x = position.x + neighbour.x;
        const y = position.y + neighbour.y;
        if (!this.isPointWithinBoundries(x, y)) continue;
        const neighbourId = y * width + x;
        if (this.data[neighbourId].isMine) {
          numNeighbours++;
        }
      }
      position.numNeighborMines = numNeighbours;
    }
  }

  toggleFlag(x: number, y: number) {
    if (!this.isPointWithinBoundries(x, y)) {
      return;
    }
    const index = y * this.width + x;
    this.data[index].hasFlag = !this.data[index].hasFlag;
  }

  /**
   * Reveals the position.
   * If it's blank, reveal the entire shape.
   * @param x 
   * @param y 
   * @returns 
   */
  reveal(x: number, y: number) {
    const index = y * this.width + x;
    if (this.data[index].isRevealed) {
      return;
    }
    if (this.data[index].isMine) {
      this.revealList(this.data);
      this._isGameOver = true;
      return; 
    }
    this.data[index].isRevealed = true;
    if (this.data[index].numNeighborMines > 0) {
      // return since we should only reveal single digit here.
      return;
    }
    // if the clicked square is blank, traverse neighbour cells
    // and reveal them.
    const result: CellData[] = [];
    this.getNeighboursWithoutMine(x, y, result);
    this.revealList(result);
  }

  /**
   * Mark all cells in the list as revealed.
   * This means they will be rendered.
   * @param toReveal 
   */
  revealList(toReveal: CellData[]) {
    toReveal.forEach(x => x.isRevealed = true);
  }

  /**
   * Traverses neighbouring nodes of the specified position.
   * Adds them to the out array if they're not present already
   * and recursivly traverse the array with nodes left.
   * @param x 
   * @param y 
   * @param out 
   */
  getNeighboursWithoutMine(x: number, y: number, out: CellData[]) {
    for (const pos of neighbourPositions) {
      const checkX = pos.x + x;
      const checkY = pos.y + y;
      if (!this.isPointWithinBoundries(checkX, checkY)) continue;
      const index = checkY * this.width + checkX;
      const cell = this.data[index];
      if (cell.isMine) {
        continue;
      }
      if (out.find(x => x.x === checkX && x.y === checkY)) {
        continue;
      }
      out.push(cell);
      if (cell.numNeighborMines > 0) {
        continue;
      }
      this.getNeighboursWithoutMine(checkX, checkY, out);
    }
  }

  /**
   * Returns a soft-readonly copy of the cell data.
   * @returns 
   */
  public getData(): Readonly<CellData[]> {
    return this.data;
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
  
  
  isGameOver(): boolean {
    return this._isGameOver;
  }
}