export const FOOD_GRID_SIZE = 4;

export const DEFAULT_FOOD = {
  id: 'food',
  name: 'Standard Food',
  shapes: [
    {
      id: 'chip',
      name: 'Chip',
      emoji: 'CP',
      color: '#eab308',
      cells: [{ row: 0, col: 0 }],
      outsideValue: 1,
      insideValue: 1,
    },
    {
      id: 'potato-cake',
      name: 'Potato Cake',
      emoji: 'PC',
      color: '#a16207',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      outsideValue: 2,
      insideValue: 1,
    },
    {
      id: 'burger',
      name: 'Burger',
      emoji: 'BG',
      color: '#dc2626',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
      outsideValue: 2,
      insideValue: 1,
    },
  ],
};

let nextFoodShapeId = 1;

export function createFoodShape() {
  const id = `custom-food-${Date.now()}-${nextFoodShapeId++}`;
  return {
    id,
    name: 'New Food',
    emoji: 'NF',
    color: '#57534e',
    cells: [{ row: 0, col: 0 }],
    outsideValue: 1,
    insideValue: 1,
  };
}

function hasCell(cells, row, col) {
  return cells.some((c) => c.row === row && c.col === col);
}

// For each cell in the shape, computes its top/right/bottom/left values —
// an edge touching another cell of the same shape uses insideValue,
// otherwise it's on the shape's perimeter and uses outsideValue.
export function computeShapeCells(shape) {
  const cells = shape?.cells ?? [];
  return cells.map(({ row, col }) => ({
    row,
    col,
    sides: {
      top: hasCell(cells, row - 1, col)
        ? shape.insideValue
        : shape.outsideValue,
      right: hasCell(cells, row, col + 1)
        ? shape.insideValue
        : shape.outsideValue,
      bottom: hasCell(cells, row + 1, col)
        ? shape.insideValue
        : shape.outsideValue,
      left: hasCell(cells, row, col - 1)
        ? shape.insideValue
        : shape.outsideValue,
    },
  }));
}

function shapeBounds(shape) {
  const cells = shape?.cells ?? [];
  if (cells.length === 0) return { width: 0, height: 0 };
  return {
    width: Math.max(...cells.map((c) => c.col)) + 1,
    height: Math.max(...cells.map((c) => c.row)) + 1,
  };
}

// Places every shape in food.shapes onto a boardSize x boardSize board,
// packed as close to the center as possible without overlapping. Bigger
// shapes are placed first so smaller ones can fill in around them. Returns
// a { [boardIndex]: cardFace } map.
export function placeFoodShapes(food, boardSize) {
  const shapes = food?.shapes ?? [];
  const occupied = new Set();
  const board = {};

  const center = (boardSize - 1) / 2;
  const anchors = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      anchors.push({ row, col });
    }
  }
  anchors.sort(
    (a, b) =>
      (a.row - center) ** 2 +
      (a.col - center) ** 2 -
      ((b.row - center) ** 2 + (b.col - center) ** 2),
  );

  const bySize = [...shapes].sort((a, b) => b.cells.length - a.cells.length);

  bySize.forEach((shape) => {
    if (shape.cells.length === 0) return;
    const { width, height } = shapeBounds(shape);

    const anchor = anchors.find(({ row, col }) => {
      if (row + height > boardSize || col + width > boardSize) return false;
      return shape.cells.every(
        (cell) =>
          !occupied.has((row + cell.row) * boardSize + (col + cell.col)),
      );
    });
    if (!anchor) return;

    computeShapeCells(shape).forEach(({ row, col, sides }) => {
      const boardRow = anchor.row + row;
      const boardCol = anchor.col + col;
      const index = boardRow * boardSize + boardCol;
      occupied.add(index);
      board[index] = {
        id: `${shape.id}-${boardRow}-${boardCol}`,
        type: 'food',
        name: shape.name,
        emoji: shape.emoji,
        color: shape.color,
        sides,
      };
    });
  });

  return board;
}
