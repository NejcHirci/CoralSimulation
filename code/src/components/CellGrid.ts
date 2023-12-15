import { Color3, Color4, Engine, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export class CellGrid {
  // Grid size
  size: number;
  grid!: Mesh;

  offset: number;
  colors: Float32Array;

  color_wheel: number[][];


  // List of active cells [x, y, z, idx]
  active_cells: number[][];

  constructor(size: number, scene: Scene) {
    this.size = size;
    this.offset = this.size / 2;

    this.color_wheel = [];
    this.color_wheel.push([0,0,0,0]);
    let huedelta = Math.trunc(360 / 5);
    for (let i = 0; i < 60; i++) {
      let hue = i * huedelta;
      let color = Color3.FromHSV(hue, 1, 1);
      this.color_wheel.push([color.r, color.g, color.b, 1]);
    }

    this.active_cells = [];
    this.grid = this.generateBaseThinInstance(scene);
  }

  generateBaseThinInstance(scene: Scene) {
    let mesh = MeshBuilder.CreateSphere('sphere', {diameter: 1}, scene);
    mesh.hasVertexAlpha = true;
    mesh.position = Vector3.Zero();

    let material = new StandardMaterial("base", scene);
    material.forceDepthWrite = true;
    mesh.material = material;

    mesh.thinInstanceRegisterAttribute("color", 4);

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
    for (let cell of cells) {
      // Check if cell already exists
      if (this.active_cells.find((c) => c[0] === cell[0] && c[1] === cell[1] && c[2] === cell[2])) {
        this.grid.thinInstanceSetAttributeAt("color", cell[0], this.color_wheel[cell[3]]);
      } else {
        this.addInstance(cell[0], cell[1], cell[2], this.color_wheel[cell[3]]);
      }
    }
  }

  addInstance(x: number, y: number, z: number, color: number[]) {
    // Create a new thin instance
    const matrix = Matrix.Translation(this.offset - x, y - this.offset, this.offset - z);
    const idx = this.grid.thinInstanceAdd(matrix);
    this.active_cells.push([x, y, z, idx]);
    this.grid.thinInstanceSetAttributeAt("color", idx, color);
  }

  removeCells(cells: number[][]) {
    for (let cell of cells) {
      // Get IDX of cell
      let idx = this.active_cells.findIndex((c) => c[0] === cell[0] && c[1] === cell[1] && c[2] === cell[2]);
      this.grid.thinInstanceSetAttributeAt("color", idx, [1,1,1,0.5]);
    }
  }

  setColorAt(i: number, color: number[]) {
    this.grid.thinInstanceSetAttributeAt("color", i, color);
  }
}
