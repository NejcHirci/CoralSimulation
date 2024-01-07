import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { WebGPUEngine, Scene, Vector3, Color4, MeshBuilder, UniversalCamera, DirectionalLight, StandardMaterial, Color3, NodeMaterial, RawTexture, NodeMaterialTextureBlocks, ArcRotateCamera } 
from "@babylonjs/core";

import { CellGrid } from "../components/CellGrid";
import { Simulator, getCells, GrowthForm  } from "../simulation/Simulator";
import { MarchingCubes } from "../components/MarchingCubes";
import { MeshGenerator } from "../components/MeshGenerator";

export class BabylonJSApp {
  // Canvas and engine
  canvas: HTMLCanvasElement;
  engine!: WebGPUEngine;

  // BabylonJS objects
  scene!: Scene;
  camera!: ArcRotateCamera;

  // My Objects
  simulator!: Simulator;
  meshGenerator!: MeshGenerator;
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
      this.meshGenerator = new MeshGenerator(this.scene, this.simulator.world_size);

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

    // Update using Space Colonization
    this.meshGenerator.AddCorals(this.simulator.new_mesh_corals);
    this.meshGenerator.Grow(this.simulator.new_mesh_cells);
    this.meshGenerator.DeadCorals(this.simulator.dead_mesh_cells);
    this.meshGenerator.RemoveCorals(this.simulator.new_mesh_ground);

    // Update using InstancedMesh
    this.cellGrid.addCells(this.simulator.new_cells);
    this.cellGrid.deadCells(this.simulator.dead_cells);
    this.cellGrid.bareGround(this.simulator.new_ground);
    
    this.simulator.step();
    this.lastUpdate = Date.now();
    this.inUpdate = false;
  }

  createScene() {
    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0,0.15,0.451,1);
    this.scene.fogColor = new Color3(0,0.15,0.451);
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogDensity = 0.35;
    this.scene.fogStart = 0;
    this.scene.fogEnd = 400;

    const camera = new ArcRotateCamera("Camera", Math.PI / 4, Math.PI / 3, 130, new Vector3(0, 0, 0), this.scene);
    camera.setTarget(new Vector3(0, 0, 0));
    camera.attachControl(this.canvas, true);
    this.camera = camera;

    // Create a light
    const light = new DirectionalLight("light", new Vector3(-1, -1, 0), this.scene);
    light.intensity = 2;

    const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
    ground.position = new Vector3(0, 0, 0);
    ground.receiveShadows = true;
    let mat =  new StandardMaterial("ground", this.scene);
    mat.diffuseColor = new Color3(0.8, 0.8, 0.8);
    mat.alpha = 0.5;
    ground.material = mat;

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
