import fs from 'fs-extra'

// Global valid cells
let encrusting = [];
let hemispherical = [];
let tabular = [];
let branching = [];
let corymbose = [];

// Global morphology initialization
function initCellList(ws)
  {
  // Initialize the list of cells based on the growth form
  const allcells = createCellGrid(ws);

  encrusting = getEncrusting(allcells).filter((cell) => cell.pr < ws / 2);
  hemispherical = getHemispherical(allcells).filter((cell) => cell.pr < ws / 2);
  tabular = getTabular(allcells).filter((cell) => cell.pr < ws / 2);
  branching = getBranching(allcells, ws).filter((cell) => cell.pr < ws / 2);
  corymbose = getCorymbose(allcells).filter((cell) => cell.pr < ws / 4);

  const { outputJson, readJson } = fs;

  // Save the valid cells to files
  outputJson("encrusting.json", encrusting, err => {
    console.log(err) // => null
  
    readJson("encrusting.json", (err, data) => {
      if (err) return console.error(err)
      console.log("encrusting.json")
    })
  });
  outputJson("hemispherical.json", hemispherical, err => {
    console.log(err) // => null
  
    readJson("hemispherical.json", (err, data) => {
      if (err) return console.error(err)
      console.log("hemispherical.json")
    })
  });
  outputJson("tabular.json", tabular, err => {
    console.log(err) // => null
  
    readJson("tabular.json", (err, data) => {
      if (err) return console.error(err)
      console.log("tabular.json")
    })
  });
  outputJson("branching.json", branching, err => {
    console.log(err) // => null
  
    readJson("branching.json", (err, data) => {
      if (err) return console.error(err)
      console.log("branching.json")
    })
  });
  outputJson("corymbose.json", corymbose, err => {
    console.log(err) // => null
  
    readJson("corymbose.json", (err, data) => {
      if (err) return console.error(err)
      console.log("corymbose.json")
    })
  });
}

function getEncrusting(allcells) {
  // Modeled as one dimensional circle
  const validcells = allcells.filter((cell) => cell.y === 0);
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getHemispherical(allcells) {
  const validcells = allcells.filter((cell) => cell.y >= 0);
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getTabular(allcells) {
  // The stem is defined by xz_dist and the top is defined by y
  let stem_height = 12;
  let stem_radius = 2;
  const validcells = allcells.filter(
    (cell) =>
      ((cell.xz_dist <= stem_radius && cell.y < stem_height) ||
        cell.y === stem_height) &&
      cell.y >= 0
  );
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getBranching(allcells, ws) {
  const ok = allcells.map((cell) => cell.xz_dist <= 1.5);

  // Breakpoints should be generated according to world size
  const step_size = ws / 2 / 5;

  for (let bp = step_size; bp <= ws / 2; bp += step_size) {
    const y2 = allcells.map((cell) => cell.y - bp);
    const ok2 = allcells.map(
      (cell, index) =>
        Math.sqrt((cell.x + y2[index]) ** 2 + (cell.z + y2[index]) ** 2) <
          1.5 && y2[index] >= 0
    );
    const ok3 = allcells.map(
      (cell, index) =>
        Math.sqrt((cell.x - y2[index]) ** 2 + (cell.z + y2[index]) ** 2) <
          1.5 && y2[index] >= 0
    );
    const ok4 = allcells.map(
      (cell, index) =>
        Math.sqrt((cell.x + y2[index]) ** 2 + (cell.z - y2[index]) ** 2) <
          1.5 && y2[index] >= 0
    );
    const ok5 = allcells.map(
      (cell, index) =>
        Math.sqrt((cell.x - y2[index]) ** 2 + (cell.z - y2[index]) ** 2) <
          1.5 && y2[index] >= 0
    );

    ok.forEach((val, index) => {
      ok[index] = val || ok2[index] || ok3[index] || ok4[index] || ok5[index];
    });
  }

  const validcells = allcells.filter(
    (_, index) => ok[index] && allcells[index].y >= 0
  );
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getCorymbose(allcells) {
  let ok = allcells.map((cell) => cell.xz_dist <= 1.6);
  let ang1 = (2 * Math.PI) / 5;
  for (let ang = ang1; ang <= 2 * Math.PI; ang += ang1) {
    const dd = allcells.map((cell) => cell.y * Math.tan(Math.PI / 8));
    const x11 = dd.map((d) => d * Math.sin(ang));
    const z11 = dd.map((d) => d * Math.cos(ang));
    const ok2 = allcells.map(
      (cell, ind) =>
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 1.5
    );
    ok = ok.map((val, index) => val || ok2[index]);
  }
  ang1 = (2 * Math.PI) / 9;
  for (let ang = ang1 / 3; ang <= 2 * Math.PI; ang += ang1) {
    const dd = allcells.map((cell) => cell.y * Math.tan(Math.PI / 4));
    const x11 = dd.map((d) => d * Math.sin(ang));
    const z11 = dd.map((d) => d * Math.cos(ang));
    const ok2 = allcells.map(
      (cell, ind) =>
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 1.5
    );
    ok = ok.map((val, index) => val || ok2[index]);
  }
  ang1 = (2 * Math.PI) / 13;
  for (let ang = (2 * ang1) / 3; ang <= 2 * Math.PI; ang += ang1) {
    const dd = allcells.map((cell) => cell.y * Math.tan((3 * Math.PI) / 8));
    const x11 = dd.map((d) => d * Math.sin(ang));
    const z11 = dd.map((d) => d * Math.cos(ang));
    const ok2 = allcells.map(
      (cell, ind) =>
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 1.5
    );
    ok = ok.map((val, index) => val || ok2[index]);
  }

  const validcells = allcells.filter(
    (cell, index) => ok[index] && cell.y >= 0
  );
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function createCellGrid(ws) {
  const allcells = [];
  for (let y = 0; y < ws; y++) {
    for (let z = -ws / 2; z < ws / 2; z++) {
      for (let x = -ws / 2; x < ws / 2; x++) {
        const cell = { 
            x:x, 
            y:y, 
            z:z,
            l2_dist: 0,
            xz_dist: 0,
            pr: 0,
            alive: true,
         };
        allcells.push(cell);
      }
    }
  }

  allcells.forEach((cell) => {
    cell.l2_dist = Math.sqrt(cell.x ** 2 + cell.y ** 2 + cell.z ** 2);
    cell.xz_dist = Math.sqrt(cell.x ** 2 + cell.z ** 2);
  });
  return allcells;
}


// Run the code
initCellList(100);
