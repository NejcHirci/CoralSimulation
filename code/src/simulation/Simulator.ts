export class Simulator {
  // Private parameters
  private world: number[][][];  // 0 -> barren ground, -1 -> dead coral, >0 -> living coral
  private light: number[][][];
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
  substrate_resolution = 6; // Resource cap: how many units can store energy in each colony
  substrate_start = 1; // Resource start: how much energy each colony starts with

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
      const init_level = this.light_lvl * this.light_atten^(this.world_size - y);
      for (let z = 0; z < this.world_size; z++) {
        this.light[y][z] = new Array(this.world_size);
        for (let x = 0; x < this.world_size; x++) {
          this.light[y][z][x] = this.light_lvl * init_level;
        }
      }
    }

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
      this.colonies.push(new Colony(id, location, GrowthForm.Branching, this.substrate_start));
      this.world[location[0]][location[1]][location[2]] = id++;
    }
  }

  step() {
    // Light Update ---
    this.lightUpdate();

    // Update Resources per Colony ----
    // Death ----
    // Growth ----

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
    let lightuptake = this.light
    for (let y = 0; y < this.world_size; y++) {
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          if (this.world[y][z][x] <= 0) {
            lightuptake[y][z][x] = 0;
          }
        }
      }
    }
    // Set light world to zero where there are coral cells (dead or alive)
    for (let y = 0; y < this.world_size; y++) {
      for (let z = 0; z < this.world_size; z++) {
        for (let x = 0; x < this.world_size; x++) {
          if (this.world[y][z][x] != 0) {
            lightuptake[y][z][x] = 0;
          }
        }
      }
    }
  }

  updateResources() {
    // Take each colony and update its resources

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

class Colony {

  id: number;
  location: number[];
  growthForm: GrowthForm;
  resources: number = 0;
  alive: boolean = true;
  age: number = 0;

  constructor(id:number, loc:number[], form:GrowthForm, res:number = 0) {
    this.id = id;
    this.location = loc;
    this.growthForm = form;
    this.resources = res;
  }
}

enum GrowthForm {
  Encrusting,
  Hemispherical,
  Tabular,
  Branching,
}
