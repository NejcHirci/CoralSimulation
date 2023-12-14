export class Simulator {
  world: number[][][]; // 0 -> barren ground, >0 -> living coral

  // Private parameters
  private dead: boolean[][][]; // true -> dead, false -> alive
  private light: number[][][];
  private lightuptake: number[][][];
  private colonies: Colony[];
  private deadcolonies: Colony[] = [];

  // User defined parameters
  runs: number = 1;
  timesteps: number = 52 * 100; // 100 years
  world_size: number = 25; // 100 x 100 x 100

  // Spawning parameters
  spawn_freq = 52; // every year
  nnew_agents = 1; // 5 new agents
  random_recruits = 1; // 1 random allocation of growth forms, else according to the number of live cells of each colony

  // Disturbance parameters
  disturbance_freq = 26; // every 2 years
  disturbance_intensity = 0.5; // smaller number is higher disturbance

  // Background mortality parameters
  mort_1 = 0.001; // 1% per year
  mort_2 = 0.005; // 5% per year

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
  nlooplight = 1; // Number of loops for light to reach bottom

  constructor() {
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

    // Initialize dead world
    this.dead = Array.from({ length: this.world_size }, () =>
      Array.from({ length: this.world_size }, () =>
        Array(this.world_size).fill(false)
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
        this.light[y][z] = new Array(this.world_size);
        this.lightuptake[y][z] = new Array(this.world_size);
        for (let x = 0; x < this.world_size; x++) {
          this.light[y][z][x] = init_level;
          this.lightuptake[y][z][x] = init_level;
        }
      }
    }

    // Randomly select locations to spawn new agents
    const locations = [];
    for (let i = 0; i < this.nnew_agents; i++) {
      const x = this.world_size / 2;
      const y = 0;
      const z = this.world_size / 2;
      locations.push([x, y, z]);
    }

    // Mark locations in world and create colonies
    let id = 1;
    this.colonies = [];
    for (const location of locations) {
      this.colonies.push(
        new Colony(id, location, GrowthForm.Branching, this.res_start)
      );
      // Y, Z, X
      const y = this.world_size - 1 - location[1];
      this.world[y][location[2]][location[0]] = id;
    }
  }

  step() {
    // Light Update ---
    this.lightUpdate();

    // Update Resources per Colony ----
    this.updateResources();
    // Death ----
    //this.death();
    // Growth ----
    this.growth();

    // Spawning/Reproduction ----
    // Background Mortality ----
    // Disturbance low intensity ----
    // Disturbance high intensity ----
  }

  // NAIVE IMPLEMENTATION

  lightUpdate() {
    for (let i of Array(this.nlooplight).keys()) {
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
      this.light.map((row) =>
        row.map((col) => (col[this.world_size - 1] = this.light_lvl))
      );

      this.lightuptake = Array.from({ length: this.world_size }, () =>
        Array.from({ length: this.world_size }, () =>
          Array(this.world_size).fill(0)
        )
      );

      for (let y = 0; y < this.world_size; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            if (this.world[y][z][x] > 0 && !this.dead[y][z][x]) {
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
      colony.resources +=
        this.lightuptake
          .flat(2)
          .filter(
            (_, i) =>
              this.world.flat(2)[i] === colony.id && !this.dead.flat(2)[i]
          )
          .reduce((sum, val) => sum + val, 0) - this.maint;
      colony.resources = Math.min(colony.resources, this.res_cap);
    }
  }

  death() {
    this.lightuptake.forEach((row, y) =>
      row.forEach((col, z) =>
        col.forEach((_, x) => {
          // If the light level is below the maintenance level, the colony dies
          if (
            this.lightuptake[y][z][x] < this.maint &&
            this.world[y][z][x] > 0
          ) {
            this.dead[y][z][x] = true;
          }
        })
      )
    );

    // Check if any colonies died
    for (const colony of this.colonies) {
      const allcellsdead = this.dead
        .flat(2)
        .filter((_, i) => this.world.flat(2)[i] === colony.id)
        .every((val) => val);
      if (allcellsdead) {
        // Set dead world to false where disturbed colonies have been removed
        this.dead.forEach((row, y) =>
          row.forEach((col, z) =>
            col.forEach((_, x) => {
              if (this.world[y][z][x] === colony.id) {
                this.dead[y][z][x] = false;
              }
            })
          )
        );
        // Set world to 0 where disturbed colonies have been removed
        this.world.forEach((row, y) =>
          row.forEach((col, z) =>
            col.forEach((_, x) => {
              if (this.world[y][z][x] === colony.id) {
                this.world[y][z][x] = 0;
              }
            })
          )
        );
        colony.alive = false;
        this.deadcolonies.push(colony);
        this.nlooplight = 1;
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
              if (this.world[y][z][x] === colony.id && !this.dead[y][z][x]) {
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

        // Update the coordinates of the cells
        down.forEach((coord) => (coord[1] = Math.max(coord[1] - 1, 0)));
        up.forEach(
          (coord) => (coord[1] = Math.min(coord[1] + 1, this.world_size - 1))
        );
        left.forEach((coord) => (coord[0] = Math.max(coord[0] - 1, 0)));
        right.forEach(
          (coord) => (coord[0] = Math.min(coord[0] + 1, this.world_size - 1))
        );
        front.forEach((coord) => (coord[2] = Math.max(coord[2] - 1, 0)));
        back.forEach(
          (coord) => (coord[2] = Math.min(coord[2] + 1, this.world_size - 1))
        );

        // Merge and check potentials
        const potentials = Array.from(
          new Set([...up, ...down, ...left, ...right, ...front, ...back])
        );

        // Check if world is barren ground
        const ifempty = potentials.filter(
          (coord) => this.world[coord[0]][coord[1]][coord[2]] === 0
        );
        // Extract coordinates
        const neighb = ifempty.map((coords) => coords.slice(0));

        // Get priorities based on the possible cell locations
        const priorities = neighb.map((coord) => colony.getPr(coord));

        // Count potentials
        const npot = priorities.reduce(
          (sum, val) => sum + (val > 0 ? 1 : 0),
          0
        );

        // Determine cells to use for growth
        let use: number[] = [];
        if (npot <= ngrowths) {
          use = priorities
            .map((priority, index) => (priority > 0 ? index : -1))
            .filter((index) => index !== -1);
        } else {
          const ord = priorities
            .map((priority, index) => ({ index, priority }))
            .sort((a, b) => b.priority - a.priority || Math.random() - 0.5)
            .map((item) => item.index);
          use = ord.slice(0, ngrowths);
        }

        // Extract new cells based on the use list
        const newcells = use.map((index) => neighb[index]);

        // Update world with new cells
        newcells.forEach((coord) => {
          const y = this.world_size - 1 - coord[1];
          this.world[y][coord[2]][coord[1]] = colony.id;
        });
        colony.age += 1;
      }
    }
  }

  // FROM A DIFFERNET PAPER

  /** This method just handles init in each step. */
  priSubInit() {
    // Update display
    // Check if the simulation is ended
    // checkDisturbance <- thermal, hydodynamics, grazing pressure, order of events
    // Set Default Agent Parameters
    // Update Agent Colony size
  }

  /** Patches of agents are randomly selected and grazed
   * until a target proportion of the reef is reached. */
  Grazing() {
    // Update display
    // Fish eating based on rugosity
    // Circular clusters of agents are randomly grazed
  }

  /**
   * Locally and regionally produced larvae attempt to settle.
   */
  Reproduction() {
    // Update display
    // coral larvae total production -> locally and coming from regional pool
    // coral larvae settlement -> random agents to be converted into new coral recruits from
    //														barren ground, dead corral and crustose coralline algae
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
   * Each living agent, attempt to convert its neighbors within a certain radius.
   */
  Growth() {
    // update display
    // each living agent attempt to convert its neighbors within a certain radius
    // coral colonies are smoothed by converting into barren ground
    // based on Von Neumann neighbor agents not from same colony
  }

  /**
   * Barren ground agents  are converted to sand and vice versa until
   * the desired sand cover is reached.
   */
  Sedimentation() {
    // sand is added or removed by converting random barren ground
    // ends when desired sand cover is reached
  }

  /**
   * Remaining ungrazed, barren-ground agents are converted to algae.
   */
  AlgaeInvasion() {}

  /**
   * The substrate composition is updated.
   */
  EndStep() {
    // increment year
    // update Agent colony size
  }
}

export class Colony {
  id: number;
  location: number[];
  cells: Cell[];

  growthForm: GrowthForm;
  resources: number = 0;
  alive: boolean = true;
  age: number = 0;
  world_size: number;
  size: number = 1;
  color: number[] = [0, 0, 0, 1];

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
    this.cells = [];

    // Generate color based on id
    const r = Math.floor((id % 256) / 256);
    const g = Math.floor((id % 65536) / 65536);
    const b = Math.floor((id % 16777216) / 16777216);
    this.color = [r, g, b, 1];

    this.initCellList();
  }

  initCellList() {
    // Initialize the list of cells based on the growth form
    const allcells = this.createCellGrid();

    switch (this.growthForm) {
      case GrowthForm.Encrusting:
        this.cells = this.encrusting(allcells);
        break;
      case GrowthForm.Hemispherical:
        this.cells = this.hemispherical(allcells);
        break;
      case GrowthForm.Tabular:
        this.cells = this.tabular(allcells);
        break;
      case GrowthForm.Branching:
        this.cells = this.branching(allcells);
        break;
      case GrowthForm.Corymbose:
        this.cells = this.corymbose(allcells);
        break;
    }

    // Limit to the maximum radius of 49
    this.cells = this.cells.filter((cell) => cell.pr! < this.world_size / 2);
  }

  encrusting(allcells: Cell[]) {
    // Modeled as one dimensional circle
    const validcells = allcells.filter((cell) => cell.y === 0);
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  hemispherical(allcells: Cell[]) {
    const validcells = allcells.filter((cell) => 0 < cell.y);
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  tabular(allcells: Cell[]) {
    // The stem is defined by xz_dist and the top is defined by y
    let stem_height = 10;
    let stem_radius = 2;
    const validcells = allcells.filter(
      (cell) =>
        ((cell.xz_dist! <= stem_radius && cell.y < stem_height) ||
          cell.y === stem_height) &&
        cell.y > 0
    );
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist!;
    });
    return validcells;
  }

  branching(allcells: Cell[]) {
    const ok = allcells.map((cell) => cell.xz_dist! <= 1.5);

    // Breakpoints should be generated according to world size
    const step_size = this.world_size / 2 / 5;

    for (let bp = step_size; bp < this.world_size / 2; bp += step_size) {
      const y2 = allcells.map((cell) => cell.y - bp);
      const ok2 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x + y2[index]) ** 2 + (cell.z + y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok3 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x - y2[index]) ** 2 + (cell.z + y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok4 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x + y2[index]) ** 2 + (cell.z - y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok5 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x - y2[index]) ** 2 + (cell.z - y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );

      ok.forEach((val, index) => {
        ok[index] = val || ok2[index] || ok3[index] || ok4[index] || ok5[index];
      });
    }

    const validcells = allcells.filter(
      (_, index) => ok[index] && allcells[index].y > 0
    );
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  corymbose(allcells: Cell[]) {
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

    const validcells = allcells.filter(
      (cell, index) => ok[index] && cell.y > 0
    );
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  // Utility functions

  createCellGrid(): Cell[] {
    const allcells: Cell[] = [];
    for (let y = -this.world_size / 2; y < this.world_size / 2; y++) {
      for (let z = -this.world_size / 2; z < this.world_size / 2; z++) {
        for (let x = -this.world_size / 2; x < this.world_size / 2; x++) {
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

  getCells(): Cell[] {
    // Return cells offset by the colony location
    return this.cells.map((cell) => ({
      x: cell.x + this.location[0],
      y: cell.y + this.location[1],
      z: cell.z + this.location[2],
    }));
  }

  getPr(coord: number[]) {
    let probability = 0;
    const cell: Cell = this.cells.find(
      (el) =>
        el.x + this.location[0] === coord[0] &&
        el.y + this.location[1] === coord[1] &&
        el.z + this.location[2] === coord[2]
    );
    if (cell) {
      probability = cell.pr!;
    }
    return probability;
  }

  getValidCells(): Cell[] {
    return this.cells;
  }

  getGrid(): number[][][] {
    // Return the grid with the colony cells marked
    const grid = new Array(this.world_size);
    for (let y = 0; y < this.world_size; y++) {
      grid[y] = new Array(this.world_size);
      for (let z = 0; z < this.world_size; z++) {
        grid[y][z] = new Array(this.world_size);
        for (let x = 0; x < this.world_size; x++) {
          grid[y][z][x] = 0;
        }
      }
    }

    for (const cell of this.getCells()) {
      let y = this.world_size - 1 - cell.y;
      grid[cell.z][y][cell.x] = this.id;
    }

    return grid;
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
