import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder } 
from "@babylonjs/core";

import { CellularAutomata } from "../components/CellularAutomata";

export class BabylonJSApp {
  // Canvas and engine
  canvas: HTMLCanvasElement;
  engine!: WebGPUEngine;

  // BabylonJS objects
  scene!: Scene;

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

      this.simulator = new CellularAutomata(6, this.scene);
      
      window.addEventListener("keydown", (event) => this.keyDown(event));

      window.addEventListener("resize", () => { this.engine.resize(); });

      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    });
  }

  createScene() {
    this.scene = new Scene(this.engine);

    const camera = new ArcRotateCamera("Camera", -Math.PI / 5, Math.PI / 3, 200, Vector3.Zero(), this.scene);
    camera.attachControl(this.canvas, true);

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
