import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, ArcRotateCamera, Vector3, Color4 } 
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

  constructor() {
    // First create and add the canvas to the html document
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.id = "renderCanvas";
    document.body.appendChild(this.canvas);

    this.engine = new WebGPUEngine(this.canvas);

    this.engine.initAsync().then(() => {
      this.createScene();

      this.simulator = new Simulator();
      this.cellGrid = new CellGrid(this.simulator.world_size, this.scene);

      this.camera.setTarget(this.cellGrid.grid);
      
      window.addEventListener("keydown", (event) => this.keyDown(event));

      window.addEventListener("resize", () => { this.engine.resize(); });

      // Run the simulation step every second
      setInterval(this.updateSimulator.bind(this), 1000);

      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    });
  }

  updateSimulator() {
    console.log("Updating simulator");
    this.simulator.step();
    // Update the cell grid
    this.cellGrid.update(this.simulator.world);
  }

  createScene() {
    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0,0,0,1);

    const camera = new ArcRotateCamera("Camera", -Math.PI / 5, Math.PI / 3, 50, Vector3.Zero(), this.scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.canvas, true);
    this.camera = camera;

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
