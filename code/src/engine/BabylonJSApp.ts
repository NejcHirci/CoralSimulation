import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, HemisphericLight, Vector3, Color4, MeshBuilder, UniversalCamera, DirectionalLight } 
from "@babylonjs/core";

import { CellGrid } from "../components/CellGrid";
import { Simulator, getCells, GrowthForm  } from "../simulation/Simulator";

export class BabylonJSApp {
  // Canvas and engine
  canvas: HTMLCanvasElement;
  engine!: WebGPUEngine;

  // BabylonJS objects
  scene!: Scene;
  camera!: UniversalCamera;

  // My Objects
  simulator!: Simulator;
  cellGrid!: CellGrid;

  // Simulator updates
  lastUpdate = 0;
  updateInterval = 250;
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
        if (!this.inUpdate && this.lastUpdate + this.updateInterval < Date.now() && this.simulator.sim_ready) {
          this.updateSimulator();
        }
      });
    });
  }

  updateSimulator() {
    this.inUpdate = true;
    this.cellGrid.addCells(this.simulator.new_cells);
    this.cellGrid.removeCells(this.simulator.dead_cells);
    this.simulator.step();
    this.lastUpdate = Date.now();
    this.inUpdate = false;
  }

  createScene() {
    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0,0,0,1);

    const camera = new UniversalCamera("Camera", new Vector3(150, 20, 0), this.scene);
    camera.setTarget(new Vector3(0, -this.simulator.world_size/2, 0));
    this.camera = camera;

    // Create a light
    const light = new DirectionalLight("light", new Vector3(0, -1, 0), this.scene);
    light.intensity = 1;

    const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
    ground.position = new Vector3(0, -this.simulator.world_size/2-1, 0);

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
