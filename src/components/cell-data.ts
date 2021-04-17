export interface CellData {
  x: number;
  y: number;
  hasFlag: boolean;
  isRevealed: boolean;
  isMine: boolean;
  numNeighborMines: number;
}
export default CellData;
