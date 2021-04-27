export const northWest = Object.freeze({ x: -1, y: -1 });
export const north = Object.freeze({ x: 0, y: -1 });
export const northEast = Object.freeze({ x: 1, y: -1 });
export const west = Object.freeze({ x: -1, y: 0 });
export const east = Object.freeze({ x: 1, y: 0 });
export const southWest = Object.freeze({ x: -1, y: 1 });
export const south = Object.freeze({ x: 0, y: 1 });
export const southEast = Object.freeze({ x: 1, y: 1 });
/**
 * 
 */
export const adjacentPositions = Object.freeze([
  northWest, north, northEast,
  west,             east,
  southWest, south, southEast
]);