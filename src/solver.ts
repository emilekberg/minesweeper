import type Grid from "./grid";
import type CellData from "./interfaces/cell-data";

export default class Solver {
  generateScores(grid: Grid<CellData>) {
    const reducer = (acc: number, curr: CellData) => {
      const data = grid.get(curr.x, curr.y);
      if (!data.isRevealed) return acc;
      return data.numAdjacentMines + acc;
    }
    var scores = grid.data.map((val) => {
      if (!val.isRevealed) return null;
      const adjacent = grid.getAdjacentTilePositions(val.x, val.y);
      const score = adjacent.reduce(reducer, 0);
      return score;
    });

    // console.log('test test');
    let lastY = -1;
    let str = [];
    scores.forEach((score, i) => {
      let y = Math.floor(i / grid.width);
      if (y != lastY) {
        lastY = y;
        // console.log(str);
        str = [];
      }
      str.push(score);
    });
  }
}
