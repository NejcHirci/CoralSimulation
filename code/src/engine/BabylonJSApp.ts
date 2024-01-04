import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, Vector3, Color4, MeshBuilder, UniversalCamera, DirectionalLight, StandardMaterial, Color3, NodeMaterial, RawTexture, NodeMaterialTextureBlocks } 
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
        //this.scene.debugLayer.show();
        if (!this.inUpdate && this.lastUpdate + this.updateInterval < Date.now() && this.simulator.sim_ready) {
          this.updateSimulator();
        }
      });
    });
  }

  updateSimulator() {
    this.inUpdate = true;
    this.cellGrid.addCells(this.simulator.new_cells);
    this.cellGrid.deadCells(this.simulator.dead_cells);
    this.cellGrid.bareGround(this.simulator.new_ground);
    this.simulator.step();
    this.lastUpdate = Date.now();
    this.inUpdate = false;
  }

  createScene() {
    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0,0,0,1);

    const camera = new UniversalCamera("Camera", new Vector3(100, 90, 100), this.scene);
    camera.setTarget(new Vector3(0, 0, 0));
    this.camera = camera;

    // Create a light
    const light = new DirectionalLight("light", new Vector3(0, -1, 0), this.scene);
    light.intensity = 1;

    const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
    ground.position = new Vector3(0, 0, 0);
    let mat =  new StandardMaterial("ground", this.scene);
    mat.diffuseColor = new Color3(0.8, 0.8, 0.6);
    ground.material = mat;

    // Create a water cube
    const water = MeshBuilder.CreateBox("water", {width: 101, height: 50, depth: 101}, this.scene);

    const depthArray = new Float32Array(100 * 100 * 4);
    const depthTex = RawTexture.CreateRGBAStorageTexture(depthArray, 100, 100, this.scene);
    water.position = new Vector3(0, 25, 0);
    let testMaterial = NodeMaterial.ParseFromSnippetAsync(("JDJXE4#11"), this.scene).then((nodeMat) => {
      nodeMat.name = "nodeMaterial";
      water.material = nodeMat;
      let block = nodeMat.getBlockByPredicate((b) => b.name === "Texture") as NodeMaterialTextureBlocks;
      if (block) {
        block.texture = depthTex;
      }
    });

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
