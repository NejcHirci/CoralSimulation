export class Simulator {
  // Private parameters
  private world: number[][][]; // 0 -> barren ground, -1 -> dead coral, >0 -> living coral
  private light: number[][][];
  private lightuptake: number[][][];
  private colonies: Colony[];

  // User defined parameters
  runs: number = 1;
  timesteps: number = 52 * 100; // 100 years
  world_size: number = 100; // 100 x 100 x 100

  // Spawning parameters
  spawn_freq = 52; // every year
  nnew_agents = 5; // 5 new agents

  // Background mortality parameters
  mort_1 = 0.001; // 1% per year
  mort_2 = 0.005; // 5% per year

  // Light and Substrate parameters
  maint = 0.1;
  surface_light = 1.0;
  k = Math.log(1) - Math.log(0.72); // What is this?
  light_lvl = (this.surface_light * Math.exp(1)) ^ (-this.k * 0);
  light_side = 0.5;
  light_atten = 0.72 ^ (1 / 100);
  res_cap = 6; // Resource cap: how many units can store energy in each colony
  res_start = 1; // Resource start: how much energy each colony starts with

  constructor() {
    // Initialize world
    this.world = new Array(this.world_size);
    for (let y = 0; y < this.world_size; y++) {
      this.world[y] = new Array(this.world_size);
      for (let z = 0; z < this.world_size; z++) {
        this.world[y][z] = new Array(this.world_size);
        for (let x = 0; x < this.world_size; x++) {
          this.world[y][z][x] = 0;
        }
      }
    }

    // Initialize light
    this.light = new Array(this.world_size);
    for (let y = 0; y < this.world_size; y++) {
      this.light[y] = new Array(this.world_size);
      const init_level =
        (this.light_lvl * this.light_atten) ^ (this.world_size - y);
      for (let z = 0; z < this.world_size; z++) {
        this.light[y][z] = new Array(this.world_size);
        for (let x = 0; x < this.world_size; x++) {
          this.light[y][z][x] = this.light_lvl * init_level;
        }
      }
    }
    this.lightuptake = this.light;

    // Randomly select locations to spawn new agents
    const locations = [];
    for (let i = 0; i < this.nnew_agents; i++) {
      locations.push([
        0, // Y
        Math.random() * this.world_size, // Z
        Math.random() * this.world_size, // X
      ]);
    }

    // Mark locations in world and create colonies
    let id = 1;
    this.colonies = [];
    for (const location of locations) {
      this.colonies.push(
        new Colony(id, location, GrowthForm.Branching, this.res_start)
      );
      this.world[location[0]][location[1]][location[2]] = id++;
    }
  }

  step() {
    // Light Update ---
    this.lightUpdate();

    // Update Resources per Colony ----
    this.updateResources();
    // Death ----
    this.death();
    // Growth ----
    this.growth();

    // Spawning/Reproduction ----
    // Background Mortality ----
    // Disturbance low intensity ----
    // Disturbance high intensity ----
  }

  // NAIVE IMPLEMENTATION

  lightUpdate() {
    // Shift light down
    for (let y = this.world_size - 1; y >= 0; y--) {
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          this.light[y][z][x] = this.light[y - 1][z][x];
        }
      }
    }
    // Light uptake
    this.lightuptake = this.light;
    for (let y = 0; y < this.world_size; y++) {
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          if (this.world[y][z][x] <= 0) {
            this.lightuptake[y][z][x] = 0;
          }
        }
      }
    }
    // Set light world to zero where there are coral cells (dead or alive)
    for (let y = 0; y < this.world_size; y++) {
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          if (this.world[y][z][x] != 0) {
            this.lightuptake[y][z][x] = 0;
          }
        }
      }
    }
  }

  updateResources() {
    // Take each colony and update its resources

    for (const colony of this.colonies) {
      let resources = 0;
      for (let y = 0; y < this.world_size; y++) {
        for (let z = 0; z < this.world_size; z++) {
          for (let x = 0; x < this.world_size; x++) {
            if (this.world[y][z][x] === colony.id) {
              resources += this.lightuptake[y][z][x] - this.maint;
            }
          }
        }
      }
      colony.resources = Math.min(resources, this.res_cap);
    }
  }

  death() {
    for (const colony of this.colonies) {
      let dead_cells = 0;
      for (const cell of colony.getCells()) {
        if (this.lightuptake[cell.y][cell.z][cell.x] < this.maint) {
          dead_cells++;
        }
      }
      if (dead_cells === colony.cells.length) {
        colony.alive = false;
        // Set all cells in world to -1
        for (let cell of colony.getCells()) {
          this.world[cell.y][cell.z][cell.x] = -1;
        }
      }
    } 
  }

  growth() {
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

  constructor(
    id: number,
    loc: number[],
    form: GrowthForm,
    res: number = 0,
    ws: number = 100
  ) {
    this.id = id;
    this.location = loc;
    this.growthForm = form;
    this.resources = res;
    this.world_size = ws;
    this.cells = [];

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
    const validcells = allcells.filter((cell) => cell.z === 1);
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  hemispherical(allcells: Cell[]) {
    const validcells = allcells;
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  tabular(allcells: Cell[]) {
    const validcells = allcells.filter(
      (cell) => (cell.xz_dist! <= 3 && cell.z < 12) || cell.z === 12
    );
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  branching(allcells: Cell[]) {
    const ok = allcells.map((cell) => cell.xz_dist! <= 1.5);
    const breakpoints: number[] = [10, 20, 30, 40, 50];

    for (const bp of breakpoints) {
      const y2: number[] = allcells.map((cell) => Number(cell.y === bp));
      const ok2 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x + y2[index]) ** 2 + (cell.y + y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok3 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x - y2[index]) ** 2 + (cell.y + y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok4 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x + y2[index]) ** 2 + (cell.y - y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );
      const ok5 = allcells.map(
        (cell, index) =>
          Math.sqrt((cell.x - y2[index]) ** 2 + (cell.y - y2[index]) ** 2) <
            1.5 && y2[index] > 0
      );

      ok.forEach((val, index) => {
        ok[index] = val || ok2[index] || ok3[index] || ok4[index] || ok5[index];
      });
    }

    const validcells = allcells.filter((_, index) => ok[index]);
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
      const dd = allcells.map((cell) => cell.y * Math.tan(Math.PI / 8));
      const x11 = dd.map((d) => d * Math.sin(ang));
      const z11 = dd.map((d) => d * Math.cos(ang));
      const ok2 = allcells.map(
        (cell, ind) =>
          Math.sqrt(cell.x - x11[ind]) ** 2 + (cell.z - z11[ind]) ** 2 < 1.5
      );
      ok = ok.map((val, index) => val || ok2[index]);
    }

    const validcells = allcells.filter((_, index) => ok[index]);
    validcells.forEach((cell) => {
      cell.pr = cell.l2_dist;
    });
    return validcells;
  }

  // Utility functions

  createCellGrid(): Cell[] {
    const allcells: Cell[] = [];
    for (let y = 0; y < this.world_size; y++) {
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
      alive: cell.alive,
    }));
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
      grid[cell.y][cell.z][cell.x] = this.id;
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
