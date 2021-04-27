import type Markers from "../constants/markers";

export interface CellData {
  x: number;
  y: number;
  icon: Markers;
  isRevealed: boolean;
  isMine: boolean;
  numAdjacentMines: number;
}
export default CellData;
