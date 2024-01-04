import { Pane } from "tweakpane";
import { Chart, registerables } from "chart.js";

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
  ui: SimulatorUI;
  world: number[][][]; // 0 -> barren ground, >0 -> living coral

  // Data to track for graphs
  // For each time stamp we store:
  // - number of cells
  // - current timestamp
  // - number of % cover
  // - number of colonies
  // - rugosity
  data_frame: number[][] = [];

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
  spawn_freq = 52 * 2; // every year
  init_agents = 10; // initial agents
  nnew_agents = 5; // new agents on each spawning event
  random_recruits = 1; // 1 random allocation of growth forms, else according to the number of live cells of each colony

  // Disturbance parameters
  disturb_freq = 52 * 2; // every 2 years
  low_disturb_int = 25; // smaller number is higher disturbance
  high_disturb_int = 3; // smaller number is higher disturbance

  // Sedimentation parameters
  sediment_freq = 52; // every 3 years

  // Light and Substrate parameters
  maint = 0.1;
  surface_light = 1.0;
  k: number; // Depth decreasing coefficient
  light_lvl: number;
  light_side = 0.5;
  light_atten: number;
  res_start = 1; // Resource start: how much energy each colony starts with

  // Active parameters
  nlooplight = 50; // Number of loops for light to reach bottom
  ts = 0; // Current timestep
  new_cells: number[][] = []; // New cells added in the last step [x, y, z, id]
  dead_cells: number[][] = []; // Dead cells added in the last step [x, y, z]
  new_ground: number[][] = []; // New ground added in the last step [x, y, z]
  next_colony_id = 1;
  sim_ready = false;
  logBuffer: string = "";

  // Graph Data
  morphologyData: number[] = []; // Count of the total colonies of each morphology
  percentageCover: number[] = []; // Percentage cover of each morphology (including dead voxels)
  volumeData: number[] = []; // Volume of each morphology
  rugosity: number = 0; // Linear rugosity: Mean increase in distance required to traverse over the top of the coral communities relative to a flat sruface without corals
  diversity: number = 0; // Simpson's Diversity Index: Measure of the diversity of the coral communities 1 - sum((ni/N)^2)

  constructor() {
    this.sim_ready = false;
    this.ui = new SimulatorUI(this);
  }

  start() {
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
        this.log(
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
    if (this.sim_ready === false || this.ts > this.timesteps) return;

    this.ui.updateEvent("", this);

    this.new_cells = [];
    this.dead_cells = [];
    this.new_ground = [];
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
    // Disturbance low/high intensity ----
    this.disturbance();

    // Sedimentation ----
    this.sedimentation();

    // Update graphs
    this.saveData();
    this.ts += 1;
  }

  lightUpdate() {
    for (let i = 0; i < this.nlooplight; i++) {
      // Update Light but not the top level
      for (let y = this.world_size - 1; 0 < y; y--) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            let back =
              (((z - 1) % this.world_size) + this.world_size) % this.world_size;
            let front = (z + 1) % this.world_size;
            let left =
              (((x - 1) % this.world_size) + this.world_size) % this.world_size;
            let right = (x + 1) % this.world_size;

            this.light[y - 1][z][x] =
              this.light[y][z][x] * this.light_atten * 0.5 +
              this.light[y - 1][back][x] * 0.125 +
              this.light[y - 1][front][x] * 0.125 +
              this.light[y - 1][z][left] * 0.125 +
              this.light[y - 1][z][right] * 0.125;
          }
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
            if (this.world[y][z][x] !== 0) {
              this.light[y][z][x] = 0;
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
      colony.resources = Math.min(colony.resources, colony.res_cap);
    }
  }

  death() {
    // Create a list of dead cells for each colony
    let deadcells: { [key: number]: number } = {};
    let alivecells: { [key: number]: number } = {};
    this.light.forEach((row, y) =>
      row.forEach((col, z) =>
        col.forEach((_, x) => {
          // If the light level isbelow  the maintenance level, the cell dies
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
        this.log(`Colony ${id} died due to light.`);
        // Set world to 0 where disturbed colonies have been removed
        for (let cell of this.colonies[id].cells) {
          this.world[cell[1]][cell[2]][cell[0]] = -1;
          this.dead_cells.push([cell[0], cell[1], cell[2]]);
        }
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
        up.forEach(
          (coord) => (coord[1] = Math.min(coord[1] + 1, this.world_size - 1))
        );
        left.forEach(
          (coord) =>
            (coord[0] = (coord[0] - 1 + this.world_size) % this.world_size)
        );
        right.forEach((coord) => (coord[0] = (coord[0] + 1) % this.world_size));
        front.forEach(
          (coord) =>
            (coord[2] = (coord[2] - 1 + this.world_size) % this.world_size)
        );
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
            let cell = [coord[0], coord[1], coord[2]];
            // X, Y, Z -> Y, Z, X
            this.world[coord[1]][coord[2]][coord[0]] = colony.id;
            // Add new cells to the new_cells list
            this.new_cells.push([
              coord[0],
              coord[1],
              coord[2],
              colony.growthForm,
            ]);
            colony.cells.push(cell);
            colony.size += 1;

            // Update the colony's cells per layer
            colony.profile[coord[1]][coord[0]] = 1;
          });
        }
        colony.age += 1;
      }
    }
  }

  spawning() {
    if ((this.ts + this.spawn_freq / 2 + 6) % this.spawn_freq === 0) {
      this.log("Spawning");
      this.ui.updateEvent(`Spawning`, this);
      for (let i = 0; i < this.nnew_agents; i++) {
        const loc = [
          Math.floor(Math.random() * this.world_size),
          0,
          Math.floor(Math.random() * this.world_size),
        ];
        if (this.world[loc[1]][loc[2]][loc[0]] === 0) {
          // Select form based on the number of live cells
          let form = 0;
          if (this.random_recruits === 1) {
            form = Math.floor(Math.random() * 5);
          } else {
            // Choose form with probability based on the number of live cells of each type
            let formCount: number[] = [0, 0, 0, 0, 0];
            let total = 0;
            for (const colony of this.colonies) {
              formCount[colony.growthForm] += colony.size;
              total += colony.size;
            }
            let prob = formCount.map((val) => val / total);
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
          this.log(
            `New colony ${this.next_colony_id} at ${loc} with form ${formToStr(
              form
            )}`
          );
          this.next_colony_id += 1;
        }
      }
      this.nlooplight = 50;
    }
  }

  naturalMortality() {
    // Called once per year
    if (this.ts % 52 !== 0) return;

    this.ui.updateEvent(`Natural Mortality`, this);

    // Background mortality
    for (const colony of this.colonies) {
      // Check if colony dies
      const mort = Math.random();
      if (mort < colony.mort && colony.alive) {
        this.log(`Colony ${colony.id} died due to natural mortality.`);
        for (let cell of colony.cells) {
          this.world[cell[1]][cell[2]][cell[0]] = -1;
          this.dead_cells.push([cell[0], cell[1], cell[2]]);
        }
        colony.alive = false;
        this.deadcolonies.push(colony);
        this.nlooplight = 50;
      }
    }
    // Remove dead colonies
    this.colonies = this.colonies.filter((colony) => colony.alive);
  }

  disturbance() {
    let disturbance = 0;
    let randomSurvive = 0;
    let echoDisturb = "";
    if ((this.ts + this.disturb_freq / 4) % this.disturb_freq === 0) {
      disturbance = Math.random() * this.low_disturb_int;
      echoDisturb = "low";
      randomSurvive = 0.05;
    } else if (
      (this.ts + this.disturb_freq / 2) % (this.disturb_freq * 4) ===
      0
    ) {
      disturbance = Math.random() * this.high_disturb_int;
      echoDisturb = "high";
      randomSurvive = 0.005;
    } else return;

    this.log(`Disturbance ${echoDisturb} of ${disturbance}`);
    this.ui.updateEvent(`Disturbance ${echoDisturb} of ${disturbance}`, this);

    for (const colony of this.colonies) {
      let integral = 0;
      for (let layer = 0; layer < this.world_size; layer++) {
        let sum = 0;
        for (let row = 0; row < this.world_size; row++) {
          sum += colony.profile[layer][row];
        }
        integral += sum * (layer + 1);
      }

      let rowSums = Array.from({ length: this.world_size }, () => 0);
      let colSums = Array.from({ length: this.world_size }, () => 0);
      for (let cell of colony.cells) {
        if (cell[1] === 0) {
          rowSums[cell[2]] += 1;
          colSums[cell[0]] += 1;
        }
      }
      let d1 = Math.max(...rowSums);
      let d2 = Math.max(...colSums);

      colony.csf = (16 / (Math.pow(d1, 2) * d2 * Math.PI)) * integral;

      // Check if a colony dies
      if (colony.csf > disturbance && Math.random() > randomSurvive) {
        this.log(
          `Colony ${colony.id}:${formToStr(
            colony.growthForm
          )} died due to ${echoDisturb} disturbance.`
        );
        // Set world to 0 where disturbed colonies have been removed
        for (let cell of colony.cells) {
          this.world[cell[1]][cell[2]][cell[0]] = -1;
          this.dead_cells.push([cell[0], cell[1], cell[2]]);
        }
        colony.alive = false;
        this.deadcolonies.push(colony);
        this.nlooplight = 50;
      }
    }
    // Remove dead colonies
    this.colonies = this.colonies.filter((colony) => colony.alive);
  }

  sedimentation() {
    // Convert random dead colony to sand
    if (
      this.ts % this.sediment_freq !== 0 ||
      this.deadcolonies.length < 1 ||
      this.ts === 0
    )
      return;

    this.log("Sedimentation");
    this.ui.updateEvent(`Sedimentation`, this);

    const coloniesToSand = Math.floor(Math.random() * this.deadcolonies.length) + 1;

    for (let i = 0; i < coloniesToSand; i++) {
      if (this.deadcolonies.length < 1) return;
      const dead =
        this.deadcolonies[Math.floor(Math.random() * this.deadcolonies.length)];
      this.log(
        `Colony ${dead.id}:${formToStr(
          dead.growthForm
        )} converted to Barren Ground.`
      );
      for (let cell of dead.cells) {
        this.world[cell[1]][cell[2]][cell[0]] = 0;
        this.new_ground.push([cell[0], cell[1], cell[2]]);
      }
      this.deadcolonies = this.deadcolonies.filter(
        (colony) => colony.id !== dead.id
      );
    }
    this.nlooplight = 50;
  }

  // Utility functions

  saveData() {
    /**
    Count of the total colonies of each morphology
    Percentage cover of each morphology (including dead voxels)
    Volume of each morphology
    Linear rugosity: Mean increase in distance required to traverse over the top of the coral communities relative to a flat sruface without corals
    Simpson's Diversity Index: Measure of the diversity of the coral communities 1 - sum((ni/N)^2) 
    */
    // Encrusting, Hemispherical, Tabular, Branching, Corymbose
    const liveCells = [0, 0, 0, 0, 0];
    const flatCover = [0, 0, 0, 0, 0];
    const volumeCover = [0, 0, 0, 0, 0];
    let rugosity = 0;
    let diversity = 0;

    let flatWorld = Array.from({ length: this.world_size }, () =>
      Array.from({ length: this.world_size }, () =>
        Array.from({ length: 5 }, () => 0)
      )
    );

    let htWorld = Array.from({ length: this.world_size }, () =>
      Array.from({ length: this.world_size }, () => 0)
    );

    let totalCells = 0;
    for (let colony of this.colonies) {
      liveCells[colony.growthForm] += colony.cells.length;
      totalCells += colony.cells.length;
      for (let cell of colony.cells) {
        flatWorld[cell[0]][cell[2]][colony.growthForm] = 1;
        htWorld[cell[0]][cell[2]] = Math.max(
          htWorld[cell[0]][cell[2]],
          cell[1]
        );
      }
    }

    volumeCover.forEach((_, index) => {
      volumeCover[index] = liveCells[index] / this.world_size ** 3;
    });
    this.volumeData = volumeCover;

    flatCover.forEach((_, index) => {
      flatCover[index] =
        flatWorld
          .map((row) => row.map((col) => col[index]))
          .flat()
          .reduce((a, b) => a + b, 0) /
        this.world_size ** 2;
    });

    // Calculate linear rugosity
    for (let col = 0; col < this.world_size; col++) {
      let traverse = this.world_size;
      for (let row = 1; row < this.world_size; row++) {
        traverse += Math.abs(htWorld[row][col] - htWorld[row - 1][col]);
      }
      rugosity += traverse;
    }
    this.rugosity = rugosity / this.world_size;

    // Calculate diversity
    this.diversity =
      1 -
      liveCells
        .map((val) => (val / totalCells) ** 2)
        .reduce((a, b) => a + b, 0);

    // Save data
    this.morphologyData = liveCells;
    this.percentageCover = flatCover;
    this.volumeData = volumeCover;
    this.rugosity = rugosity;
    this.diversity = diversity;

    this.ui.updateGraphs(this);
  }

  log(msg: string) {
    this.logBuffer += msg + "\n";
  }
}

export class Colony {
  id: number;
  location: number[];
  valid_cells: Cell[];

  profile: number[][] = [];
  cells: number[][] = [];

  d1: number = 0;
  d2: number = 0;

  growthForm: GrowthForm;
  resources: number = 0;
  res_cap: number = 6;
  alive: boolean = true;
  age: number = 0;
  world_size: number;
  mort: number;

  // Active parameters
  size = 1;
  csf = 1;

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
    this.mort = 0.01;

    // Initialize valid cells
    switch (this.growthForm) {
      case GrowthForm.Branching:
        this.valid_cells = branching;
        this.res_cap = 10;
        break;
      case GrowthForm.Corymbose:
        this.valid_cells = corymbose;
        this.res_cap = 10;
        break;
      case GrowthForm.Encrusting:
        this.valid_cells = encrusting;
        this.mort = 0.1;
        this.res_cap = 2;
        break;
      case GrowthForm.Hemispherical:
        this.valid_cells = hemispherical;
        this.mort = 0.05;
        this.res_cap = 6;
        break;
      case GrowthForm.Tabular:
        this.valid_cells = tabular;
        this.res_cap = 8;
        break;
    }

    // Initialize profile
    this.profile = Array.from({ length: this.world_size }, () =>
      Array.from({ length: this.world_size }, () => 0)
    );
    this.profile[this.location[1]][this.location[0]] = 1;

    // Initialize cells
    this.cells = [[this.location[0], this.location[1], this.location[2]]];
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

class SimulatorUI {
  eventTracker: HTMLDivElement;
  params: Pane;
  monitor: Pane;
  graph: Pane;

  // Line data
  chart: Chart;

  constructor(sim: Simulator) {
    this.eventTracker = document.getElementById(
      "event-tracker"
    ) as HTMLDivElement;

    this.params = new Pane({
      title: "Simulation Parameters",
      container: document.getElementById("panel-container"),
    });

    this.params.addBinding(sim, "timesteps", {
      label: "Timesteps\n[weeks]",
      min: 1,
      max: 5200,
      step: 1,
    });

    this.params.addBlade({ title: "Spawn Parameters", view: "separator" });
    this.params.addBinding(sim, "spawn_freq", {
      label: "Spawn\nFrequency",
      min: 52,
      max: 104,
      step: 1,
    });
    this.params.addBinding(sim, "init_agents", {
      label: "Initial\nPolyps",
      min: 1,
      max: 20,
      step: 1,
    });
    this.params.addBinding(sim, "nnew_agents", {
      label: "New Polyps",
      min: 1,
      max: 10,
      step: 1,
    });
    this.params.addBinding(sim, "random_recruits", {
      label: "Randomize\nForm",
      min: 0,
      max: 1,
      step: 1,
    });

    this.params.addBlade({
      title: "Disturbance Parameters",
      view: "separator",
    });
    this.params.addBinding(sim, "disturb_freq", {
      label: "Disturbance\n Frequency",
      min: 26,
      max: 52 * 10,
      step: 1,
    });
    this.params.addBinding(sim, "low_disturb_int", {
      label: "Low \nDisturbance\n Intensity",
      min: 10,
      max: 100,
      step: 1,
    });
    this.params.addBinding(sim, "high_disturb_int", {
      label: "High\nDisturbance\n Intensity",
      min: 1.5,
      max: 5,
      step: 0.1,
    });

    this.params.addBlade({
      title: "Sedimentation Parameters",
      view: "separator",
    });
    this.params.addBinding(sim, "sediment_freq", {
      label: "Sedimentation\nFrequency",
      min: 26,
      max: 100,
      step: 1,
    });

    this.params.addBlade({ title: "Light Parameters", view: "separator" });
    this.params.addBinding(sim, "maint", {
      label: "Stay\nAlive",
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.params.addBinding(sim, "surface_light", {
      label: "Surface\nLight",
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.params.addBinding(sim, "light_side", {
      label: "Light\nSide",
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.params.addBinding(sim, "res_start", {
      label: "Resource\nStart",
      min: 1,
      max: 10,
      step: 1,
    });

    const btn = this.params.addButton({ title: "Run" });
    btn.on("click", () => {
      sim.start();
    });

    this.monitor = new Pane({
      title: "Monitor",
      container: document.getElementById("log-container"),
    });
    this.monitor.addBinding(sim, "logBuffer", {
      label: "Log",
      readonly: true,
      multiline: true,
      rows: 10,
    });

    this.graph = new Pane({
      title: "Graph",
      container: document.getElementById("graphs-container"),
    });

    this.initGraphs();
  }

  initGraphs() {
    let container = document.getElementById("graphs-container");
    if (container === null) return;

    let content = container.getElementsByClassName("tp-rotv_c")[0];
    let canvas = document.createElement("canvas");
    canvas.width = container.clientWidth * 0.99;

    Chart.register(...registerables);

    this.chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Encrusting",
            borderColor: "red",
            borderWidth: 1,
            pointRadius: 0,
            data: [],
          },
          {
            label: "Hemispherical",
            borderColor: "yellow",
            borderWidth: 1,
            pointRadius: 0,
            data: [],
          },
          {
            label: "Tabular",
            borderColor: "green",
            borderWidth: 1,
            pointRadius: 0,
            data: [],
          },
          {
            label: "Branching",
            borderColor: "blue",
            borderWidth: 1,
            pointRadius: 0,
            data: [],
          },
          {
            label: "Corymbose",
            borderColor: "purple",
            borderWidth: 1,
            pointRadius: 0,
            data: [],
          },
        ],
      },
      options: {
        responsive: false,
        scales: {
          y: {
            title: {
              display: true,
              text: "% Cover",
            },
          },
          x: {
            title: {
              display: true,
              text: "Time Step",
            },
            beginAtZero: true,
            max: 5200,
            min: 0,
            ticks: {
              stepSize: 100,
            },
          },
        },
      },
    });
    content.appendChild(canvas);
  }

  updateGraphs(sim: Simulator) {
    this.chart.data.labels.push(sim.ts);
    this.chart.data.datasets[0].data.push(sim.percentageCover[0]);
    this.chart.data.datasets[1].data.push(sim.percentageCover[1]);
    this.chart.data.datasets[2].data.push(sim.percentageCover[2]);
    this.chart.data.datasets[3].data.push(sim.percentageCover[3]);
    this.chart.data.datasets[4].data.push(sim.percentageCover[4]);

    this.chart.update();
  }

  updateEvent(msg: string, sim: Simulator) {
    this.eventTracker.innerHTML = `Time step ${sim.ts} - ${msg}`;
  }
}
