// Convert map2bomp_merged_data.txt into a collision matrix.
const fs = require('fs');

// Read the source file.
const content = fs.readFileSync('map2bomp_merged_data.txt', 'utf8');

// Extract the data section.
const dataMatch = content.match(/"data":\[(.*)\]/s);
if (!dataMatch) {
  console.log('Data section not found');
  process.exit(1);
}

const dataStr = dataMatch[1];
const values = dataStr.split(',').map(v => parseInt(v.trim()));

// Convert to a collision matrix: 0,1,3,4,6,10 -> 1 (blocked), others -> 0 (walkable).
const collisionValues = values.map(v => {
  if (v === 0 || v === 1 || v === 3 || v === 4 || v === 6 || v === 10) {
    return 1; // Blocked
  } else {
    return 0; // Walkable
  }
});

// Determine matrix dimensions.
const size = Math.sqrt(collisionValues.length);
if (size % 1 !== 0) {
  console.log('Data is not a square matrix');
  process.exit(1);
}

const rows = Math.floor(size);
const cols = rows;

// Rebuild the data as a 2D array.
const collisionMatrix = [];
for (let i = 0; i < rows; i++) {
  const row = [];
  for (let j = 0; j < cols; j++) {
    const index = i * cols + j;
    row.push(collisionValues[index]);
  }
  collisionMatrix.push(row);
}

console.log('Collision matrix size: ' + rows + 'x' + cols);
console.log('Blocked cells: ' + collisionValues.filter(v => v === 1).length);
console.log('Walkable cells: ' + collisionValues.filter(v => v === 0).length);

// Generate a JavaScript-formatted collision matrix.
let matrixStr = 'collisionMatrix: [\n';
collisionMatrix.forEach((row, index) => {
  matrixStr += '  [' + row.join(', ') + ']';
  if (index < collisionMatrix.length - 1) {
    matrixStr += ',';
  }
  matrixStr += '\n';
});
matrixStr += ']';

// Save the text version.
fs.writeFileSync('map2-collision-matrix.txt', matrixStr);
console.log('Collision matrix saved to map2-collision-matrix.txt');

// Save the JSON version as well.
const fullConfig = {
  collisionMatrix: collisionMatrix
};
fs.writeFileSync('map2-collision-matrix.json', JSON.stringify(fullConfig, null, 2));
console.log('JSON version saved to map2-collision-matrix.json');
