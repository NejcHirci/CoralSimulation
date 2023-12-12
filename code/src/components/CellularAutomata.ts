import { Color3, Color4, Engine, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

import { Colony, GrowthForm } from "../simulation/Simulator";

export class CellularAutomata {
  // Grid size
  size: number;
  grid!: Mesh;

  offset: number;
  colors: Float32Array;

  constructor(size: number, scene: Scene) {
    this.size = size;
    this.offset = this.size / 2;

    this.colors = new Float32Array(this.size * this.size * this.size * 4); // 4 for RGBA

    this.grid = this.generateGrid(scene);
    
    // Testing different Corals
    let testColony = new Colony(
      1,
      [this.size / 2, this.size / 2, 0],
      GrowthForm.Tabular,
      1,
      this.size
    );
    let grid = testColony.getGrid();

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
          let index = x * this.size * this.size + y * this.size + z;
          if (grid[x][y][z] == 1) {
            this.setColorAt(index, [1, 1, 0, 1]);
          }
        }
      }
    }
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
      colors[i + 0] = 0;
      colors[i + 1] = 0;
      colors[i + 2] = 0;
      colors[i + 3] = 0;
    }

    // Create grid of cubes
    const mesh = MeshBuilder.CreateBox('box', {size: 1}, scene);
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.hasVertexAlpha = true;
    mesh.edgesColor = new Color4(1,1,1,0.1);
    mesh.enableEdgesRendering(0.95);
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

  update() {
    if (this.grid) {
    }
  }

  setColorAt(i: number, color: number[]) {
    this.grid.thinInstanceSetAttributeAt("color", i, color);
  }
}
