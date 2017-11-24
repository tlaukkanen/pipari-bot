const http = require('http');
const THREE = require('three');
let [port] = process.argv.slice(2);
if (!port) {
  port = 8080;
}

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

const getPlaceBombDirection = (nextTickInfo) => {
  const myName = nextTickInfo.currentPlayer.name;
  const currentCoordinates = nextTickInfo.players.find(p => p.name === nextTickInfo.currentPlayer.name);

  // Get player who is farthest from me
  let myVec = new THREE.Vector3(currentCoordinates.x, currentCoordinates.y, currentCoordinates.z);
  let bestBombPlace;
  let highestDistance = 0;
  let bestEnemyName = '';
  nextTickInfo.players.filter(p => p.name !== nextTickInfo.currentPlayer.name).forEach((enemy)=>{
    let enemyVec = new THREE.Vector3(enemy.x, enemy.y, enemy.z);
    let distanceToEnemy = myVec.distanceTo(enemyVec);
    if(highestDistance<distanceToEnemy) {
      highestDistance = distanceToEnemy;
      bestBombPlace = enemyVec;
      bestEnemyName = enemy.name;
    }
    console.log(`Distance to ${enemy.name} ${distanceToEnemy}`);
  });

  console.log(`Aiming ${bestEnemyName} location ${JSON.stringify(bestBombPlace)} for bomb placement`);

  let whatAxel = getRandomInt(0,2);
  console.log(`what axel: ${whatAxel}`);
  switch(whatAxel) {
    case(0):
      bestBombPlace.x = getValidCubeCoordinate(bestBombPlace.x + getRandomInt(-1, 1), nextTickInfo);
      break;
    case(1):
      bestBombPlace.y = getValidCubeCoordinate(bestBombPlace.y + getRandomInt(-1, 1), nextTickInfo);
      break;
    case(2):
      bestBombPlace.z = getValidCubeCoordinate(bestBombPlace.z + getRandomInt(-1, 1), nextTickInfo);
      break;
    default:
  }
  console.log(`Bomb placed in ${JSON.stringify(bestBombPlace)}`);
  
  return {
    task: 'BOMB',
    x: bestBombPlace.x,
    y: bestBombPlace.y,
    z: bestBombPlace.z
  }
};

const getValidCubeCoordinate = (n, nextTickInfo) => {
  let x = n;
  if(x<0) { x = 0; }
  if(x>nextTickInfo.gameInfo.edgeLength-1) { x = nextTickInfo.gameInfo.edgeLength-1; }
  return x;
}

const coordEq = (p, q) => { 
  return (p.x == q.x && p.y == q.y && p.z == q.z); 
};
const hasBomb = (data, p) => { 
  let bombs = data.items.some(it => it.type === "BOMB" && coordEq(it, p)) 
  if(bombs) { 
    console.log(`Found bombs at ${JSON.stringify(p)}`);
  } else {
    console.log(`No bomb at ${JSON.stringify(p)}`);
  }
  return bombs;
};

const getMoveDirection = (nextTickInfo) => {
  const allDirections = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  const currentCoordinates = nextTickInfo.players.find(p => p.name === nextTickInfo.currentPlayer.name);

  const badCoordinates = [];
  if (currentCoordinates.x === 0) {
    badCoordinates.push('-X');
  }
  if (currentCoordinates.x === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+X'));
  }
  if (currentCoordinates.y === 0) {
    badCoordinates.push('-Y');
  }
  if (currentCoordinates.y === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+Y'));
  }
  if (currentCoordinates.z === 0) {
    badCoordinates.push('-Z');
  }
  if (currentCoordinates.z === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+Z'));
  }

  // -x check
  let bomb = hasBomb(nextTickInfo, currentCoordinates);
  console.log(`current ${JSON.stringify(currentCoordinates)} HasBomb: ${bomb}`);

  let possibleDirections = allDirections.filter(d => !badCoordinates.includes(d));
  possibleDirections.forEach((dir)=>{
    if(dir==='-X') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.x--;;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push('-X'); }
    }
    if(dir==='+X') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.x++;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push(('+X')); }
    }
    if(dir==='-Y') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.y--;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push('-Y'); }
    }
    if(dir==='+Y') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.y++;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push(('+Y')); }
    }
    if(dir==='-Z') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.z--;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push('-Z'); }
    }
    if(dir==='+Z') {
      const checkCoords = JSON.parse(JSON.stringify(currentCoordinates)); checkCoords.z++;
      if(hasBomb(nextTickInfo, checkCoords)) { badCoordinates.push(('+Z')); }
    }
  });  

  possibleDirections = allDirections.filter(d => !badCoordinates.includes(d));
  let movingTo = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
  console.log(`Moving to ${movingTo}`);

  return {
    task: 'MOVE',
    direction: movingTo
  };
};

const getDirections = (nextTickInfo) => {
  const numOfTasksToDo = nextTickInfo.gameInfo.numOfTasksPerTick;
  const botDirections = [];
  const possibleTasks = [getMoveDirection, getPlaceBombDirection];
  if(numOfTasksToDo>1) {
    const moveTask = getMoveDirection;
    botDirections.push(moveTask(nextTickInfo));
    for (let i = 1; i < numOfTasksToDo; i++) {
      const bombTask = getPlaceBombDirection;
      botDirections.push(bombTask(nextTickInfo));
    }
  } else {
    const task = possibleTasks[Math.floor(Math.random() * possibleTasks.length)];
    botDirections.push(task(nextTickInfo));
  }

  return botDirections;
};

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let jsonString = '';

    req.on('data', (data) => {
      jsonString += data;
    });

    req.on('end', () => {
      try {
        const nextTickInfo = JSON.parse(jsonString);
        console.log('we got next tick info', nextTickInfo);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Send the response body as "Hello World"
        res.end(JSON.stringify(getDirections(nextTickInfo)));
      } catch(e) {
        console.error(e);
      }
    });

  }
}).listen(port);

// Console will print the message
console.log(`Seer-bot running at http://127.0.0.1:${port}/`);