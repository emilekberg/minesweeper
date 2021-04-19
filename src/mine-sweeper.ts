import type CellData from "./interfaces/cell-data";
import Result from "./constants/result";
import Grid from "./grid";
/**
 * Minesweeper game.
 */
export default class MineSweeper {
  protected gameResult: Result | undefined;
  grid: Grid<CellData>;

  /**
   * Number of mines in the current game.
   */
  protected numberOfMines: number;

  constructor() {
    this.grid = new Grid();
  }

  /**
   * Initializes a new game.
   * @param width 
   * @param height 
   * @param numMines 
   */
  public init(width: number, height: number, numMines: number) {
    this.gameResult = undefined;
    this.generateGrid(width, height);
    this.generateMines(numMines);
    this.generateAdjacentMineNumbers();
  }

  protected generateGrid(width: number, height: number) {
    this.grid.init(width, height, (_, { x, y }) => {
      return {
        x,
        y,
        isMine: false,
        hasFlag: false,
        numAdjacentMines: 0,
        isRevealed: false
      }
    });
  }

  protected generateMines(numberOfMines: number) {
    this.numberOfMines = numberOfMines;
    // generate unique mines by cloning data 
    // and removing available positions after each generation.
    const availablePositions = this.grid.data.concat();
    for (let i = 0; i < numberOfMines; i++) {
      let index: number = Math.floor(Math.random() * availablePositions.length);
      this.grid.getDataFromIndex(index).isMine = true;
      availablePositions.splice(index, 1);
    }
  }

  protected generateAdjacentMineNumbers() {
    for (let i = 0; i < this.grid.width * this.grid.height; i++) {
      if (this.grid.getDataFromIndex(i).isMine) continue;
      const data = this.grid.getDataFromIndex(i);
      const adjacent = this.grid.getAdjacentTilePositions(data.x, data.y);
      data.numAdjacentMines = adjacent.filter(pos => this.grid.get(pos.x, pos.y).isMine).length;
    }
  }

  public toggleFlag(x: number, y: number) {
    if (!this.grid.isPointWithinBoundries(x, y)) {
      return;
    }
    this.grid.get(x, y).hasFlag = !this.grid.get(x, y).hasFlag;
  }

  /**
   * Reveals the position.
   * If it's blank, reveal the entire shape.
   * @param x 
   * @param y 
   * @returns 
   */
  public reveal(x: number, y: number) {
    const data = this.grid.get(x, y);
    if (data.isRevealed) {
      return;
    }
    if (data.isMine) {
      this.revealList(this.grid.data);
      this.gameResult = Result.LOST;
      return;
    }
    data.isRevealed = true;
    if (data.numAdjacentMines > 0) {
      // return since we should only reveal single digit here.
      return;
    }
    // if the clicked square is blank, traverse adjacent cells
    // and reveal them.
    const result: CellData[] = [];
    this.getAdjacentWithoutMine(x, y, result);
    this.revealList(result);
    this.checkWinCondition();
  }

  /**
   * Mark all cells in the list as revealed.
   * This means they will be rendered.
   * @param toReveal 
   */
  protected revealList(toReveal: CellData[]) {
    toReveal.forEach(x => x.isRevealed = true);
  }

  protected checkWinCondition() {
    var unrevealed = this.grid.data.filter(x => !x.isRevealed);
    if (unrevealed.length === this.numberOfMines) {
      this.gameResult = Result.WON;
      alert('you won!');
      return true;
    }
    return false;
  }

  /**
   * Traverses adjacent nodes of the specified position.
   * Adds them to the out array if they're not present already
   * and recursivly traverse the array with nodes left.
   * @param x 
   * @param y 
   * @param out 
   */
  protected getAdjacentWithoutMine(startX: number, startY: number, out: CellData[]) {
    const adjacentTiles = this.grid.getAdjacentTilePositions(startX, startY);
    for (const { x, y } of adjacentTiles) {
      const data = this.grid.get(x, y);
      if (data.isMine) {
        continue;
      }
      if (out.find(pos => pos.x === x && pos.y === y)) {
        continue;
      }
      out.push(data);
      if (data.numAdjacentMines > 0) {
        continue;
      }
      this.getAdjacentWithoutMine(x, y, out);
    }
  }

  /**
   * Returns a soft-readonly copy of the cell data.
   * @returns 
   */
  public getData(): Readonly<CellData[]> {
    return this.grid.data;
  }

  public hasGameFinished(): boolean {
    if (this.gameResult === undefined) {
      return false;
    }
    if (this.gameResult === Result.ONGOING) {
      return false;
    }
    return true;
  }

  public getGameResult(): Result {
    return this.gameResult;
  }
}