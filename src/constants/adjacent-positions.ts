export const northWest = { x: -1, y: -1 };
export const north = { x: 0, y: -1 };
export const northEast = { x: 1, y: -1 };
export const west = { x: -1, y: 0 };
export const east = { x: 1, y: 0 };
export const southWest = { x: -1, y: 1 };
export const south = { x: 0, y: 1 };
export const southEast = { x: 1, y: 1 };
/**
 * 
 */
export const adjacentPositions = [
  northWest, north, northEast,
  west,             east,
  southWest, south, southEast
];