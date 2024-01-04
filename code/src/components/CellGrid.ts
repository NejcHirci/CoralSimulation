import { Color3, Color4, Engine, InstancedMesh, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export class CellGrid {
  // Grid size
  size: number;
  grid!: Mesh;

  offset: number;
  colors: Float32Array;

  color_wheel: Color4[];


  // List of active cells [x, y, z, InstancedMesh]
  active_cells: Cell[];

  constructor(size: number, scene: Scene) {
    this.size = size;
    this.offset = this.size / 2;

    this.color_wheel = [];
    let huedelta = Math.trunc(360 / 5);
    for (let i = 0; i < 60; i++) {
      let hue = i * huedelta;
      let color = Color3.FromHSV(hue, 1, 1);
      this.color_wheel.push(new Color4(color.r, color.g, color.b, 1));
    }

    this.active_cells = [];
    this.grid = this.generateBaseInstance(scene);
  }

  generateBaseInstance(scene: Scene) {
    let mesh = MeshBuilder.CreateSphere('sphere', {diameter: 1, segments: 1}, scene);
    mesh.setAbsolutePosition(new Vector3(0, 0, 0));
    mesh.registerInstancedBuffer("color", 4);
    mesh.instancedBuffers.color = new Color4(1,1,1,1);
    mesh.hasVertexAlpha = true;
    mesh.isVisible = false;
  
    let material = new StandardMaterial("base", scene);
    material.transparencyMode = 3;
    material.forceDepthWrite = true;
    mesh.material = material;

    return mesh;
  }

  // Generate grid
  generateGrid(scene: Scene) {
    const bufferMatrices = new Float32Array(this.size * this.size * this.size * 16);

    // Set positions
    let ind = 0;
    let matrix;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
          matrix = Matrix.Translation(this.offset - x, this.offset - y, this.offset - z);
          matrix.copyToArray(bufferMatrices, ind);
          ind += 16;
        }
      }
    }

    const colors = new Float32Array(this.size * this.size * this.size * 4);
    for (let i = 0; i < this.colors.length; i += 4) 
    {
      colors[i + 0] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;
      colors[i + 3] = 1;
    }

    // Create grid of cubes
    const mesh = MeshBuilder.CreateSphere('sphere', {diameter: 1}, scene);
    mesh.hasVertexAlpha = true;
    mesh.position = Vector3.Zero();

    mesh.thinInstanceSetBuffer("matrix", bufferMatrices);
    mesh.thinInstanceSetBuffer("color", colors, 4);

    let material = new StandardMaterial("base", scene);
    material.forceDepthWrite = true;
    material.depthFunction = Engine.ALWAYS; 
    material.emissiveColor = Color3.White();


    mesh.material = material;

    return mesh;
  }

  // Get Grid
  getGrid() {
    return this.grid;
  }

  // OLD UPDATE FUNCTION
  /*
  update(world: number[][][]) {
    for (let y = 0; y < this.size; y++) {
      for (let z = 0; z < this.size; z++) {
        for (let x = 0; x < this.size; x++) {
          let real_y = this.size - y - 1;
          const i = real_y * this.size * this.size + z * this.size + x;
          let id = world[y][z][x] > 0 ? world[y][z][x] : 0;
          this.setColorAt(i, this.color_wheel[id]);
        }
      }
    }
  }
  */
  addCells(cells: number[][]) {
    // Cells is a list of [x, y, z, id, form]
    let ind = 0;
    for (let cell of cells) {
      let last = cells.length - 1 === ind; 
      // Check if cell already exists
      const active_cell = this.active_cells.find((c) => c.x === cell[0] && c.y === cell[1] && c.z === cell[2]);
      if (active_cell !== undefined) {
        active_cell.instance.isVisible = true;
        active_cell.instance.alwaysSelectAsActiveMesh = true;
        active_cell.instance.instancedBuffers.color = this.color_wheel[cell[3]];
      } else {
        this.addInstance(cell[0], cell[1], cell[2], this.color_wheel[cell[3]]);
      }
      ind += 1;
    }
  }

  addInstance(x: number, y: number, z: number, color: Color4) {
    // Create a new thin instance
    const instance = this.grid.createInstance("i" + this.active_cells.length);
    instance.setPositionWithLocalVector(new Vector3(x - this.offset + 1, y, z - this.offset + 1));
    instance.instancedBuffers.color = color;
    instance.hasVertexAlpha = true;
    instance.isVisible = true;
    instance.material = this.grid.material;
    this.active_cells.push({x: x, y: y, z: z, instance: instance});
  }

  deadCells(cells: number[][]) {
    for (let cell of cells) {
      // Get IDX of cell
      let active_cell = this.active_cells.find((c) => c.x === cell[0] && c.y === cell[1] && c.z === cell[2]);
      active_cell.instance.instancedBuffers.color = new Color4(1,1,1,0.3);
    }
  }

  bareGround(cells: number[][]) {
    for (let cell of cells) {
      // Get IDX of cell
      let active_cell = this.active_cells.find((c) => c.x === cell[0] && c.y === cell[1] && c.z === cell[2]);
      active_cell.instance.isVisible = false;
    }
  }

  setColorAt(i: number, color: number[]) {
    this.grid.thinInstanceSetAttributeAt("color", i, color);
  }
}

interface Cell {
  x: number;
  y: number;
  z: number;
  instance: InstancedMesh;
}
