import { Color3, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";

import { Colony, GrowthForm } from "../simulation/Simulator";

export class CellularAutomata {
  // Grid size
  size: number;
  grid!: Mesh;

  offset: number;
  colors: Float32Array;

  constructor(size: number, scene: Scene) {
    this.size = size;

    this.colors = new Float32Array(this.size * this.size * this.size * 4); // 4 for RGBA

    this.grid = this.generateGrid(scene);

    // Testing different Corals
    let testColony = new Colony(
      1,
      [this.size / 2, 0, this.size / 2],
      GrowthForm.Hemispherical,
      1,
      this.size
    );
    let grid = testColony.getGrid();

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        for (let k = 0; k < this.size; k++) {
          let index = i * this.size * this.size + j * this.size + k;
          if (grid[j][k][i] == 1) {
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
    let matrix = Matrix.Identity();
    let ind = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
          matrix = Matrix.Translation(this.offset - x, this.offset - y, this.offset - z);
          matrix.copyToArray(bufferMatrices, (ind * 16));
          ind++;
        }
      }
    }

    var col = 0;
    for (let i = 0; i < this.colors.length; i += 4) {
      var coli = Math.floor(col);

      this.colors[i + 0] = ((coli & 0xff0000) >> 16) / 255;
      this.colors[i * 4 + 1] = ((coli & 0x00ff00) >> 8) / 255;
      this.colors[i * 4 + 2] = ((coli & 0x0000ff) >> 0) / 255;
      this.colors[i * 4 + 3] = 1.0;

      col += 0xffffff / (this.colors.length / 4);
    }

    // Create grid of cubes
    const mesh = MeshBuilder.CreateBox('box', {}, scene);

    mesh.thinInstanceSetBuffer("matrix", bufferMatrices, 16, true);
    mesh.thinInstanceSetBuffer("color", this.colors, 4);

    let mat = new StandardMaterial("mat", scene);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(1, 1, 1);
    mesh.material = mat;

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
    this.colors[i * 4] = color[0];
    this.colors[i * 4 + 1] = color[1];
    this.colors[i * 4 + 2] = color[2];
    this.colors[i * 4 + 3] = color[3];
  }
}
