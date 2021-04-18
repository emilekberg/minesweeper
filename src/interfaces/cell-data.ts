export interface CellData {
  x: number;
  y: number;
  hasFlag: boolean;
  isRevealed: boolean;
  isMine: boolean;
  numAdjacentMines: number;
}
export default CellData;
