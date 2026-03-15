const fs = require('fs');

// Read the collision.js file.
const content = fs.readFileSync('collision.js', 'utf8');
const match = content.match(/window\.CollisionMatrix = (\[[\s\S]*?\]);/);

if (match) {
  const matrix = eval(match[1]);
  
  console.log('='.repeat(60));
  console.log('Collision Matrix Visualization');
  console.log('='.repeat(60));
  console.log('Map size: ' + matrix.length + ' rows × ' + matrix[0].length + ' columns');
  console.log('Legend: ■ = wall (1), ░ = walkable (0)');
  console.log('');
  
  // Print the matrix.
  for (let y = 0; y < matrix.length; y++) {
    let row = '';
    for (let x = 0; x < matrix[y].length; x++) {
      row += matrix[y][x] === 1 ? '■' : '░';
    }
    console.log(row);
  }
  
  console.log('');
  console.log('Coordinate system:');
  console.log('- Top-left corner is (0,0)');
  console.log('- X increases to the right, Y increases downward');
  console.log('- Player spawn: (1,2)');
}
