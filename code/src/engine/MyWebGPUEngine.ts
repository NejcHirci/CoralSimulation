
export const SHADER_PATH = '/src/shaders/';

export class MyWebGPUEngine {

    canvas  : HTMLCanvasElement;
    device! : GPUDevice;
    context! : GPUCanvasContext;
    canvasFormat! : GPUTextureFormat;


    constructor(canvas : HTMLCanvasElement) {
        this.canvas = canvas;
    }


    async initialize() {
        console.log('Engine initialize');

        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error('Adapter not found during initialization');
        }
        this.device = await adapter.requestDevice();
        if (this.device === undefined) {
            throw new Error('Device not found during initialization');
        }
        console.log('Device', this.device);
        
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        const context = this.canvas.getContext('webgpu');
        if (!context) {
            throw new Error('WebGPU not supported');
        }
        this.context = context;

        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat
        });

        window.addEventListener('resize', this.resize.bind(this));
    }

    // This is a simple example of a compute shader
    async CellularAutomata() {
        console.log("Running Cellular Automata");
        const GRID_SIZE = 300;

        const vertices = new Float32Array([
            //   X,    Y,
              -0.8, -0.8, // Triangle 1 (Blue)
               0.8, -0.8,
               0.8,  0.8,
            
              -0.8, -0.8, // Triangle 2 (Red)
               0.8,  0.8,
              -0.8,  0.8,
        ]);
        const vertexBuffer = this.device.createBuffer({
            label: 'Cell vertices',
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.device.queue.writeBuffer(vertexBuffer, 0, vertices);

        const vertexBufferLayout:GPUVertexBufferLayout = {
            arrayStride: 2 * 4,
            attributes: [{
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2'
            }]
        }

        const cellVertShaderModule = await this.loadShaderModule('vert');
        const cellFragShaderModule = await this.loadShaderModule('frag');
        const simulationShaderModule = await this.loadShaderModule('cellular_automata');

        // Cell storage buffer
        const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
        const cellStateStorage = [
            this.device.createBuffer({
                label: 'Cell state A',
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: 'Cell state B',
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            })
        ];

        // into the storage buffer.
        for (let i = 0; i < cellStateArray.length; ++i) {
            cellStateArray[i] = Math.random() > 0.91 ? 1 : 0;
        }
        this.device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

        const bindGroupLayout = this.device.createBindGroupLayout({
            label: 'Cell simulation bind group layout',
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                buffer: {} // Grid Uniform Buffer
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state buffer
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" } // Cell state buffer
            }]
        });

        // Grid Uniform Buffer

        const uniformArray = new Float32Array([ GRID_SIZE, GRID_SIZE ]);
        const uniformBufer = this.device.createBuffer({
            label: 'Grid Uniform',
            size: uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(uniformBufer, 0, uniformArray);

        const bindGroups = [
            this.device.createBindGroup({
                label: 'Cell renderer bind group A',
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBufer }
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[0]}
                }, {
                    binding: 2,
                    resource: { buffer: cellStateStorage[1]}
                }]
            }),
            this.device.createBindGroup({
                label: 'Cell renderer bind group B',
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBufer }
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[1] }
                }, {
                    binding: 2,
                    resource: { buffer: cellStateStorage[0] }
                }]
            }),
        ]

        const cellPipelineLayout = this.device.createPipelineLayout({
            label: 'Cell pipeline layout',
            bindGroupLayouts: [bindGroupLayout]
        });
        const cellPipeline = this.device.createRenderPipeline({
            label: 'Cell pipeline',
            layout: cellPipelineLayout,
            vertex: {
                module: cellVertShaderModule,
                entryPoint: 'vertexMain',
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: cellFragShaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: this.canvasFormat
                }]
            }
        });
        const simulationPipeline = this.device.createComputePipeline({
            label: 'Simulation pipeline',
            layout: cellPipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: 'computeMain'
            }
        });


        // The Actual Render
        const UPDATE_INTERVAL = 100;
        let step = 0;
        function updateGrid(device: GPUDevice, context: GPUCanvasContext) {            
            // Start render pass
            const encoder = device.createCommandEncoder();

            // Compute pass
            const computePass = encoder.beginComputePass();

            computePass.setPipeline(simulationPipeline);
            computePass.setBindGroup(0, bindGroups[step % 2]);

            const workGroupCount = Math.ceil(GRID_SIZE / 8);
            computePass.dispatchWorkgroups(workGroupCount, workGroupCount);

            computePass.end();

            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });

            // Draw the grid
            pass.setPipeline(cellPipeline);
            pass.setBindGroup(0, bindGroups[step % 2]);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE); // 6 vertices

            // End render pass and submit
            pass.end();
            device.queue.submit([encoder.finish()]);
            step++;
        }
        setInterval(updateGrid, UPDATE_INTERVAL, this.device, this.context);
    }

    async loadShaderModule(name: string): Promise<GPUShaderModule> {
        const shaderUrl = `${SHADER_PATH}/${name}.wgsl`;
        const response = await fetch(shaderUrl);
        const shaderCode = await response.text();
        return this.device.createShaderModule({ code: shaderCode });
    }

    resize() {
        console.log('Engine resize');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.context.configure({
            device: this.device,
            format: this.canvasFormat
        });
    }
}