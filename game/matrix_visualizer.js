const fs = require('fs');

// 读取collision.js文件
const content = fs.readFileSync('collision.js', 'utf8');
const match = content.match(/window\.CollisionMatrix = (\[[\s\S]*?\]);/);

if (match) {
  const matrix = eval(match[1]);
  
  console.log('='.repeat(60));
  console.log('地图碰撞矩阵可视化');
  console.log('='.repeat(60));
  console.log('地图尺寸: ' + matrix.length + ' 行 × ' + matrix[0].length + ' 列');
  console.log('图例: ■ = 墙壁(1), ░ = 可通行(0)');
  console.log('');
  
  // 输出矩阵
  for (let y = 0; y < matrix.length; y++) {
    let row = '';
    for (let x = 0; x < matrix[y].length; x++) {
      row += matrix[y][x] === 1 ? '■' : '░';
    }
    console.log(row);
  }
  
  console.log('');
  console.log('坐标系统:');
  console.log('- 左上角为 (0,0)');
  console.log('- X轴向右增加, Y轴向下增加');
  console.log('- 玩家出生点: (1,2)');
}
