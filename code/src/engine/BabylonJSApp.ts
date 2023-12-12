import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, ArcRotateCamera, Vector3, Color4 } 
from "@babylonjs/core";

import { CellularAutomata } from "../components/CellularAutomata";

export class BabylonJSApp {
  // Canvas and engine
  canvas: HTMLCanvasElement;
  engine!: WebGPUEngine;

  // BabylonJS objects
  scene!: Scene;
  camera!: ArcRotateCamera;

  // My Objects
  simulator!: CellularAutomata;

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

      this.simulator = new CellularAutomata(20, this.scene);

      this.camera.setTarget(this.simulator.grid);
      
      window.addEventListener("keydown", (event) => this.keyDown(event));

      window.addEventListener("resize", () => { this.engine.resize(); });

      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    });
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
