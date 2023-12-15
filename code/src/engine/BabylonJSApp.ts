import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Color4, MeshBuilder } 
from "@babylonjs/core";

import { CellGrid } from "../components/CellGrid";
import { Simulator } from "../simulation/Simulator";

export class BabylonJSApp {
  // Canvas and engine
  canvas: HTMLCanvasElement;
  engine!: WebGPUEngine;

  // BabylonJS objects
  scene!: Scene;
  camera!: ArcRotateCamera;

  // My Objects
  simulator!: Simulator;
  cellGrid!: CellGrid;

  // Simulator updates
  lastUpdate = 0;
  updateInterval = 100;
  inUpdate = false;

  constructor() {
    // First create and add the canvas to the html document
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.id = "renderCanvas";
    document.body.appendChild(this.canvas);

    this.engine = new WebGPUEngine(this.canvas);

    this.engine.initAsync().then(() => {
      this.simulator = new Simulator();

      this.createScene();
      this.cellGrid = new CellGrid(this.simulator.world_size, this.scene);
      this.cellGrid.addCells(this.simulator.new_cells);
      this.camera.setTarget(this.cellGrid.grid);

      // Add resize listener
      window.addEventListener("resize", () => {
        this.engine.resize();
      });

      // Add key listener
      window.addEventListener("keydown", (event) => {
        this.keyDown(event);
      });

      // Run the simulation step every second
      this.engine.runRenderLoop(() => {
        this.scene.render();
        if (!this.inUpdate && Date.now() - this.lastUpdate > this.updateInterval) {
          this.updateSimulator();
        }
      });
    });
  }

  updateSimulator() {
    this.inUpdate = true;
    this.simulator.step();

    let sUpdate = Date.now();
    this.cellGrid.addCells(this.simulator.new_cells);
    this.cellGrid.removeCells(this.simulator.dead_cells);
    //console.log("CellGrid update time: " + (Date.now() - sUpdate));
    this.lastUpdate = Date.now();
    this.inUpdate = false;
  }

  createScene() {
    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0,0,0,1);

    const camera = new ArcRotateCamera("Camera", -Math.PI / 5, Math.PI / 3, 150, new Vector3(0, 50, 0), this.scene);
    camera.attachControl(this.canvas, false);
    this.camera = camera;

    // Create a light
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
    ground.position = new Vector3(0, -this.simulator.world_size/2, 0);

    return this.scene;
  }

  keyDown(event: KeyboardEvent) {
    // Shift+Ctrl+Alt+I = Toggle Inspector
    if (event.shiftKey && event.ctrlKey && event.altKey && event.key == "I") {
      if (this.scene.debugLayer.isVisible()) {
        this.scene.debugLayer.hide();
      } else {
        this.scene.debugLayer.show();
      }
    }
  }
}
