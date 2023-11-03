import "./styles/style.css";
import { WebGPUEngine } from "./engine/WebGPUEngine";


const canvas = document.querySelector<HTMLCanvasElement>("#root")!;
const engine = new WebGPUEngine(canvas); 

await engine.initialize();


// Lets try running simple compute shader example
engine.CellularAutomata();