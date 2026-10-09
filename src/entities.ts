// Tuyaux

export const PIPE_WIDTH = 80
export const pipe_gap = 200

export const pipes = [
  {
    x: window.innerWidth + 30,
    gapY: 200,
    passed: false
  },
    {
    x: window.innerWidth + Math.floor(Math.random() * (600 - 400 + 1)) + 400,
    gapY: 200,
    passed: false
  }
];

export const character = {
  x: window.innerWidth / 2 - 35,
  y: 285,
  targetY: 250,
  radius: 20
};