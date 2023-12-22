// Global valid cells
let encrusting: Cell[] = [];
let hemispherical: Cell[] = [];
let tabular: Cell[] = [];
let branching: Cell[] = [];
let corymbose: Cell[] = [];

// If files exist, load them instead of generating them
function loadCellList(): Promise<any> {
  // Create a promise that fetches all the files with fetch
  const promises = [
    fetch("encrusting.json").then((response) => response.json()),
    fetch("hemispherical.json").then((response) => response.json()),
    fetch("tabular.json").then((response) => response.json()),
    fetch("branching.json").then((response) => response.json()),
    fetch("corymbose.json").then((response) => response.json()),
  ];

  // Return a promise that resolves when all files are loaded
  return Promise.all(promises).then((values) => {
    console.log(values);
    encrusting = values[0];
    hemispherical = values[1];
    tabular = values[2];
    branching = values[3];
    corymbose = values[4];
  });
}

// Global morphology initialization
function initCellList(ws: number) {
  // Initialize the list of cells based on the growth form
  const allcells = createCellGrid(ws);

  encrusting = getEncrusting(allcells).filter((cell) => cell.pr! < ws / 2);
  hemispherical = getHemispherical(allcells).filter(
    (cell) => cell.pr! < ws / 4
  );
  tabular = getTabular(allcells).filter((cell) => cell.pr! < ws / 4);
  branching = getBranching(allcells, ws).filter((cell) => cell.pr! < ws / 2);
  corymbose = getCorymbose(allcells).filter((cell) => cell.pr! < ws / 2);

  const fs = require("fs-extra");

  // Save the valid cells to files
  fs.outputJson(
    "encrusting.json",
    JSON.stringify(encrusting, null, 2),
    (err) => {
      console.log(err); // => null

      fs.readJson("encrusting.json", (err, data) => {
        if (err) return console.error(err);
        console.log(data);
      });
    }
  );
}

function getEncrusting(allcells: Cell[]) {
  // Modeled as one dimensional circle
  const validcells = allcells.filter((cell) => cell.y === 0);
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getHemispherical(allcells: Cell[]) {
  const validcells = allcells.filter((cell) => cell.y >= 0);
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function getTabular(allcells: Cell[]) {
  // The stem is defined by xz_dist and the top is defined by y
  let stem_height = 20;
  let stem_radius = 5;
  const validcells = allcells.filter(
    (cell) =>
      ((cell.xz_dist! <= stem_radius && cell.y < stem_height) ||
        cell.y === stem_height) &&
      cell.y >= 0
  );
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist!;
  });
  return validcells;
}

function getBranching(allcells: Cell[], ws: number) {
  const ok = allcells.map((cell) => cell.xz_dist! <= 1.5);

  // Breakpoints should be generated according to world size
  const step_size = ws / 2 / 5;

  for (let bp = step_size; bp < ws / 2; bp += step_size) {
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

function getCorymbose(allcells: Cell[]) {
  let ok = allcells.map((cell) => cell.xz_dist! <= 1.6);
  let ang1 = (2 * Math.PI) / 5;
  for (let ang = ang1; ang <= 2 * Math.PI; ang += ang1) {
    const dd = allcells.map((cell) => cell.y * Math.tan(Math.PI / 8));
    const x11 = dd.map((d) => d * Math.sin(ang));
    const z11 = dd.map((d) => d * Math.cos(ang));
    const ok2 = allcells.map(
      (cell, ind) =>
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 2
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
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 2
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
        Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 2
    );
    ok = ok.map((val, index) => val || ok2[index]);
  }

  const validcells = allcells.filter((cell, index) => ok[index] && cell.y >= 0);
  validcells.forEach((cell) => {
    cell.pr = cell.l2_dist;
  });
  return validcells;
}

function createCellGrid(ws: number): Cell[] {
  const allcells: Cell[] = [];
  for (let y = 0; y < ws; y++) {
    for (let z = -ws / 2; z < ws / 2; z++) {
      for (let x = -ws / 2; x < ws / 2; x++) {
        const cell: Cell = { x, y, z };
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

export function getCells(form: GrowthForm, offset: number[]) {
  let cells: Cell[] = [];
  switch (form) {
    case GrowthForm.Branching:
      cells = branching;
      break;
    case GrowthForm.Corymbose:
      cells = corymbose;
      break;
    case GrowthForm.Encrusting:
      cells = encrusting;
      break;
    case GrowthForm.Hemispherical:
      cells = hemispherical;
      break;
    case GrowthForm.Tabular:
      cells = tabular;
      break;
  }
  return cells.map((cell) => {
    return [
      cell.x + offset[0],
      cell.y + offset[1],
      cell.z + offset[2],
      form + 1,
    ];
  });
}

export class Simulator {
  world: number[][][]; // 0 -> barren ground, >0 -> living coral

  // Private parameters
  private light: number[][][];
  private lightuptake: number[][][];
  private colonies: Colony[];
  private deadcolonies: Colony[] = [];

  // User defined parameters
  runs: number = 1;
  timesteps: number = 52 * 100; // 100 years
  world_size: number = 100;

  // Spawning parameters
  spawn_freq = 52; // every year
  init_agents = 10; // initial agents
  nnew_agents = 5; // new agents on each spawning event
  random_recruits = 1; // 1 random allocation of growth forms, else according to the number of live cells of each colony

  // Disturbance parameters
  low_disturb_freq = 52 * 2;   // every 2 years
  high_disturb_freq = 52 * 5;  // every 5 years
  low_disturb_int = 20;        // smaller number is higher disturbance
  high_disturb_int = 1.5       // smaller number is higher disturbance

  // Light and Substrate parameters
  maint = 0.1;
  surface_light = 1.0;
  k: number; // Depth decreasing coefficient
  light_lvl: number;
  light_side = 0.5;
  light_atten: number;
  res_cap = 6; // Resource cap: how many units can store energy in each colony
  res_start = 1; // Resource start: how much energy each colony starts with

  // Active parameters
  nlooplight = 50; // Number of loops for light to reach bottom
  ts = 0; // Current timestep
  new_cells: number[][] = []; // New cells added in the last step [x, y, z, id]
  dead_cells: number[][] = [];
  next_colony_id = 1;

  sim_ready = false;

  constructor() {
    loadCellList().then(() => {
      // Initialize parameters
      this.k = Math.log(1) - Math.log(0.72); // Depth decreasing coefficient
      this.light_lvl = this.surface_light * Math.pow(Math.exp(1), -this.k * 0);
      this.light_atten = Math.pow(0.72, 1 / 100);

      // Initialize live world
      this.world = Array.from({ length: this.world_size }, () =>
        Array.from({ length: this.world_size }, () =>
          Array(this.world_size).fill(0)
        )
      );

      // Initialize light
      this.light = new Array(this.world_size);
      this.lightuptake = new Array(this.world_size);
      for (let y = 0; y < this.world_size; y++) {
        this.light[y] = new Array(this.world_size);
        this.lightuptake[y] = new Array(this.world_size);
        const init_level =
          this.light_lvl * Math.pow(this.light_atten, this.world_size - 1 - y);
        for (let z = 0; z < this.world_size; z++) {
          this.lightuptake[y][z] = new Array(this.world_size);
          this.light[y][z] = new Array(this.world_size);
          for (let x = 0; x < this.world_size; x++) {
            this.lightuptake[y][z][x] = 0;
            this.light[y][z][x] = init_level;
          }
        }
      }

      // Distribute agents randomly but make sure they are not too close
      const locations: Set<number[]> = new Set();
      for (let i = 0; i < this.init_agents; i++) {
        let x = Math.floor(Math.random() * this.world_size);
        let z = Math.floor(Math.random() * this.world_size);
        let y = 0;
        locations.add([x, y, z]);
      }

      // Mark locations in world and create colonies
      let forms = [
        GrowthForm.Branching,
        GrowthForm.Corymbose,
        GrowthForm.Encrusting,
        GrowthForm.Hemispherical,
        GrowthForm.Tabular,
      ];
      this.colonies = [];
      for (const location of locations.values()) {
        let form = forms[(this.next_colony_id - 1) % 5];
        this.colonies.push(
          new Colony(
            this.next_colony_id,
            location,
            form,
            this.res_start,
            this.world_size
          )
        );
        console.log(
          `New colony ${
            this.next_colony_id
          } at ${location} with form ${formToStr(form)}`
        );
        this.world[location[1]][location[2]][location[0]] = this.next_colony_id;
        this.new_cells.push([location[0], location[1], location[2], form]);
        this.next_colony_id += 1;
      }
      this.sim_ready = true;
    });
  }

  step() {
    if (this.sim_ready === false) return;

    this.new_cells = [];
    this.dead_cells = [];
    let sLight = Date.now();
    this.lightUpdate();
    //console.log(`Light update took ${Date.now() - sLight} ms`);

    let sRes = Date.now();
    this.updateResources();
    //console.log(`Resource update took ${Date.now() - sRes} ms`);
    // Death ----
    let sDeath = Date.now();
    this.death();
    //console.log(`Death took ${Date.now() - sDeath} ms`);
    // Growth ----
    let sGrowth = Date.now();
    this.growth();
    //console.log(`Growth took ${Date.now() - sGrowth} ms`);

    // Spawning/Reproduction ----
    this.spawning();
    // Background Mortality ----
    this.naturalMortality();
    // Disturbance low intensity ----
    // Disturbance high intensity ----
    this.ts += 1;
  }

  // NAIVE IMPLEMENTATION

  lightUpdate() {
    for (let i = 0; i < this.nlooplight; i++) {
      // Update Light but not the top level
      for (let y = 0; y < this.world_size - 1; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            // Update the light from the top
            this.light[y][z][x] = this.light[y + 1][z][x] * this.light_atten;
          }
        }
      }
      // Store a slice without the top level
      const lighttoside = this.light.slice(0, this.world_size - 1);
      const lightleft = lighttoside.map((row) =>
        row.map((col) =>
          col
            .slice(1)
            .concat(col.slice(0, 1))
            .map((val) => val * 0.25)
        )
      );
      const lightright = lighttoside.map((row) =>
        row.map((col) =>
          col
            .slice(-1)
            .concat(col.slice(0, -1))
            .map((val) => val * 0.25)
        )
      );
      const lightup = lighttoside.map((row) =>
        row
          .slice(1)
          .concat(row.slice(0, 1))
          .map((col) => col.map((val) => val * 0.25))
      );
      const lightdown = lighttoside.map((row) =>
        row
          .slice(-1)
          .concat(row.slice(0, -1))
          .map((col) => col.map((val) => val * 0.25))
      );
      for (let y = 0; y < this.world_size - 1; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            this.light[y][z][x] =
              this.light[y][z][x] -
              lighttoside[y][z][x] + // remove the base
              lightleft[y][z][x] + // left
              lightright[y][z][x] + // right
              lightup[y][z][x] + // up
              lightdown[y][z][x]; // down
          }
        }
      }
      // Update the top level
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          this.light[this.world_size - 1][z][x] = this.light_lvl;
        }
      }

      // Light uptake ---
      // Reset light uptake
      for (let y = 0; y < this.world_size; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            this.lightuptake[y][z][x] = 0;
          }
        }
      }

      // Fill with light only where there are colonies
      for (let y = 0; y < this.world_size; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            if (this.world[y][z][x] > 0) {
              this.lightuptake[y][z][x] = this.light[y][z][x];
            }
            // We set to 0 where there are either dead colonies or barren ground
            if (this.world[y][z][x] === 0) {
              this.lightuptake[y][z][x] = 0;
            }
          }
        }
      }
    } // End of light loop

    this.nlooplight = 1; // Reset the number of loops, which will be updated if a colony dies
  }

  updateResources() {
    for (const colony of this.colonies) {
      // Update resources
      for (let y = 0; y < this.world_size; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            if (this.world[y][z][x] === colony.id) {
              colony.resources += this.lightuptake[y][z][x] - this.maint;
            }
          }
        }
      }
      colony.resources = Math.min(colony.resources, this.res_cap);
    }
  }

  death() {
    // Create a list of dead cells for each colony
    let deadcells: { [key: number]: number } = {};
    let alivecells: { [key: number]: number } = {};
    this.light.forEach((row, y) =>
      row.forEach((col, z) =>
        col.forEach((_, x) => {
          // If the light level is below the maintenance level, the cell dies
          if (
            this.lightuptake[y][z][x] < this.maint &&
            this.world[y][z][x] > 0
          ) {
            if (deadcells[this.world[y][z][x]] === undefined) {
              deadcells[this.world[y][z][x]] = 0;
              alivecells[this.world[y][z][x]] = 0;
            }

            deadcells[this.world[y][z][x]] += 1;
            this.world[y][z][x] = -1;
          } else if (this.world[y][z][x] > 0) {
            if (alivecells[this.world[y][z][x]] === undefined) {
              deadcells[this.world[y][z][x]] = 0;
              alivecells[this.world[y][z][x]] = 0;
            }
            alivecells[this.world[y][z][x]] += 1;
          }
        })
      )
    );

    // for all values in deadcells, check if they are equal to alivecells
    for (const key of Object.keys(deadcells)) {
      if (deadcells[key] === alivecells[key]) {
        const id = parseInt(key);
        console.log(`Colony ${id} died due to light.`);
        // Set world to 0 where disturbed colonies have been removed
        this.world.forEach((row, y) =>
          row.forEach((col, z) =>
            col.forEach((_, x) => {
              if (this.world[y][z][x] === id) {
                this.world[y][z][x] = -1;
                this.dead_cells.push([x, y, z, id]);
              }
            })
          )
        );
        this.colonies[id].alive = false;
        const colony = this.colonies.find((colony) => colony.id === id);
        this.deadcolonies.push(colony);
        this.nlooplight = 50;
      }
    }
    // Remove dead colonies
    this.colonies = this.colonies.filter((colony) => colony.alive);
  }

  growth() {
    // permutation of all cell indices
    const growthorder = sample(0, this.colonies.length);

    for (let i of growthorder) {
      const colony = this.colonies[i];
      const ngrowths = Math.floor(colony.resources / 1); // divide available resources by the cost of growth

      if (ngrowths > 0) {
        const flatCurrentCells: number[][] = [];
        for (let y = 0; y < this.world_size; y++) {
          for (let z = 0; z < this.world_size; z++) {
            for (let x = 0; x < this.world_size; x++) {
              if (this.world[y][z][x] === colony.id) {
                flatCurrentCells.push([x, y, z]);
              }
            }
          }
        }

        let up = flatCurrentCells.map((arr) => arr.slice());
        let down = flatCurrentCells.map((arr) => arr.slice());
        let left = flatCurrentCells.map((arr) => arr.slice());
        let right = flatCurrentCells.map((arr) => arr.slice());
        let front = flatCurrentCells.map((arr) => arr.slice());
        let back = flatCurrentCells.map((arr) => arr.slice());

        // Update the coordinates of the cells but make the x and z coordinates wrap around
        down.forEach((coord) => (coord[1] = Math.max(coord[1] - 1, 0)));
        up.forEach((coord) => (coord[1] = Math.min(coord[1] + 1, this.world_size - 1)));
        left.forEach((coord) => (coord[0] = (coord[0] - 1 + this.world_size) % this.world_size));
        right.forEach((coord) => (coord[0] = (coord[0] + 1) % this.world_size));
        front.forEach((coord) => (coord[2] = (coord[2] - 1 + this.world_size) % this.world_size));
        back.forEach((coord) => (coord[2] = (coord[2] + 1) % this.world_size));

        // Merge and check potentials
        const potentials = Array.from(
          new Set([...up, ...down, ...left, ...right, ...front, ...back])
        );

        // Check if world is barren ground
        const ifempty = potentials.filter(
          // X, Y, Z -> Y, Z, X
          (coord) => this.world[coord[1]][coord[2]][coord[0]] === 0
        );
        // Extract coordinates
        const neighb = ifempty.map((coords) => coords.slice(0));

        // Get priorities based on the possible cell locations
        const priorities = neighb.map((coord) => colony.getPr(coord));

        // Count cells with priority above 0
        const npot = priorities.filter((val) => val > 0).length;

        // Determine cells to use for growth
        let use: number[] = [];
        if (npot <= ngrowths) {
          use = priorities
            .map((_, index) => index)
            .filter((i) => priorities[i] > 0);
        } else {
          // Grow in order of priority
          use = priorities
            .map((_, index) => index)
            .sort((a, b) => {
              return priorities[a] > priorities[b] ? -1 : 1;
            })
            .filter((index) => priorities[index] > 0);
        }

        // Extract first ngrowths
        const newcells = use
          .slice(0, ngrowths + 1)
          .map((index) => neighb[index]);

        if (newcells.length > 0) {
          // Update world with new cells
          newcells.forEach((coord) => {
            // X, Y, Z -> Y, Z, X
            if (colony === undefined) {
              console.log("Colony is undefined");
            }
            if (coord === undefined || coord.length < 3) {
              throw new Error("Coord is undefined");
              console.log("Coord is undefined");
            }
            if (coord[3] === 0) {
              console.log("WHY ARE WE GROWING IF 0!");
              throw new Error("WHY ARE WE GROWING IF 0!");
            }
            this.world[coord[1]][coord[2]][coord[0]] = colony.id;
            // Add new cells to the new_cells list
            this.new_cells.push([
              coord[0],
              coord[1],
              coord[2],
              colony.growthForm,
            ]);
            colony.size += 1;
          });
        }
        colony.age += 1;
      }
    }
  }

  spawning() {
    if ((this.ts + this.spawn_freq / 2 + 6) % this.spawn_freq === 0) {
      console.log("Spawning");
      for (let i = 0; i < this.nnew_agents; i++) {
        const loc = [
          Math.floor(Math.random() * this.world_size),
          0,
          Math.floor(Math.random() * this.world_size),
        ];
        if (this.world[loc[1]][loc[2]][loc[0]] === 0) {
          // Choose form with probability based on the number of live cells of each type
          let formCount: number[] = [0,0,0,0,0];
          let total = 0;
          for (const colony of this.colonies) {
            formCount[colony.growthForm] += colony.size;
            total += colony.size;
          }
          let prob = formCount.map((val) => val / total);

          // Select form based on the number of live cells
          let form = 0;
          if (this.random_recruits === 1) {
            form = Math.floor(Math.random() * 5);
          } else {
            form = sampleProb(prob);
          }
          this.colonies.push(
            new Colony(
              this.next_colony_id,
              loc,
              form,
              this.res_start,
              this.world_size
            )
          );
          this.world[loc[1]][loc[2]][loc[0]] = this.next_colony_id;
          this.new_cells.push([loc[0], loc[1], loc[2], form]);
          console.log(
            `New colony ${this.next_colony_id} at ${loc} with form ${formToStr(
              form
            )}`
          );
          this.next_colony_id += 1;
        }
      }
      this.nlooplight = 49;
    }
  }

  naturalMortality() {
    // Called once per year
    if (this.ts % 52 !== 0) return;

    // Background mortality
    for (const colony of this.colonies) {
      // Check if colony dies
      const mort = Math.random();
      if (mort < colony.mort && colony.alive) {
        console.log(`Colony ${colony.id} died due to natural mortality.`);
        // Set world to 0 where disturbed colonies have been removed
        this.world.forEach((row, y) =>
          row.forEach((col, z) =>
            col.forEach((_, x) => {
              if (this.world[y][z][x] === colony.id) {
                this.world[y][z][x] = -1;
                this.dead_cells.push([x, y, z, colony.id]);
              }
            })
          )
        );
        colony.alive = false;
        this.deadcolonies.push(colony);
        this.nlooplight = 50;
      }
    }
    // Remove dead colonies
    this.colonies = this.colonies.filter((colony) => colony.alive);
  }

  disturbanceLow() {
    if (this.ts % this.low_disturb_freq !== 0) return;

    console.log("Low disturbance");

    for (const colony of this.colonies) {
      // We need to compute Colony Shape Factor
      
    }
  }

  // Utility functions

  getColCount(): number {
    return this.colonies.length;
  }

  // FROM A DIFFERNET PAPER

  /** Patches of agents are randomly selected and grazed
   * until a target proportion of the reef is reached. */
  Grazing() {
    // Update display
    // Fish eating based on rugosity
    // Circular clusters of agents are randomly grazed
  }

  /**
   * Thermal disturbance, if triggered causes colonies to bleach and/or die.
   */
  Bleaching() {
    // all coral colonies selected and bleached according to a probability
    // agents of dying colony die
    // agents of a surviving bleached colony are converted to bleached agents
    // update agent colony size
  }

  /**
   * Effect of waves and cyclones causes colonies to be dislodged and fragmented.
   */
  Dislodgement() {
    // according to shape factor and cyclone intensity, colonies are dislodged
    // updated agent colony size
  }

  /**
   * Barren ground agents  are converted to sand and vice versa until
   * the desired sand cover is reached.
   */
  Sedimentation() {
    // sand is added or removed by converting random barren ground
    // ends when desired sand cover is reached
  }
}

export class Colony {
  id: number;
  location: number[];
  valid_cells: Cell[];

  growthForm: GrowthForm;
  resources: number = 0;
  alive: boolean = true;
  age: number = 0;
  world_size: number;
  mort: number;

  // Active parameters
  size = 1;

  constructor(
    id: number,
    loc: number[],
    form: GrowthForm,
    res: number = 1,
    ws: number = 100
  ) {
    this.id = id;
    this.location = loc;
    this.growthForm = form;
    this.resources = res;
    this.world_size = ws;
    this.mort = 0.001;

    // Initialize valid cells
    switch (this.growthForm) {
      case GrowthForm.Branching:
        this.valid_cells = branching;
        break;
      case GrowthForm.Corymbose:
        this.valid_cells = corymbose;
        break;
      case GrowthForm.Encrusting:
        this.valid_cells = encrusting;
        this.mort = 0.005;
        break;
      case GrowthForm.Hemispherical:
        this.valid_cells = hemispherical;
        break;
      case GrowthForm.Tabular:
        this.valid_cells = tabular;
        break;
    }
  }

  getPr(coord: number[]) {
    let probability = 0;
    const cell: Cell = this.valid_cells.find(
      (el) =>
        el.x === coord[0] - this.location[0] &&
        el.y === coord[1] - this.location[1] &&
        el.z === coord[2] - this.location[2]
    );
    if (cell) {
      probability = 999.0 - cell.pr!;
    } else {
      probability = 0;
    }
    return probability;
  }

  getValidCells(): Cell[] {
    return this.valid_cells;
  }
}

export enum GrowthForm {
  Encrusting, // Leather Corals
  Hemispherical, // Brain Corals
  Tabular, // Table Corals
  Branching, // Staghorn Corals
  Corymbose, // Plate Corals
}

interface Cell {
  x: number;
  y: number;
  z: number;
  l2_dist?: number;
  xz_dist?: number;
  pr?: number;
  alive?: boolean;
}

// Utility functions
function sample(min: number, max: number): number[] {
  const result: number[] = [];
  for (let i = min; i < max; i++) {
    result.push(i);
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sampleProb(prob: number[]) {
  let ind = 0;
  let r = Math.random();
  while (r > 0) {
    r -= prob[ind];
    ind += 1;
  }
  return ind - 1;
}

function formToStr(form: GrowthForm) {
  switch (form) {
    case GrowthForm.Branching:
      return "Branching";
    case GrowthForm.Corymbose:
      return "Corymbose";
    case GrowthForm.Encrusting:
      return "Encrusting";
    case GrowthForm.Hemispherical:
      return "Hemispherical";
    case GrowthForm.Tabular:
      return "Tabular";
  }
}
