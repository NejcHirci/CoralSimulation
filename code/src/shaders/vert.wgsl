struct VertexOutput {
	@builtin(position) pos: vec4f,
	@location(0) cell: vec2f,
}

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;

@vertex
fn vertexMain(@location(0) pos: vec2f,
							@builtin(instance_index) instance: u32,) -> VertexOutput {

	let i = f32(instance);
	let cell = vec2f(i % grid.x, floor(i / grid.x));
	let state = f32(cellState[instance]);

	let cellOffset = cell / grid * 2.0;
	let gridPos = (pos*state+1.0) / grid - 1.0 + cellOffset;

	var output: VertexOutput;
	output.pos = vec4f(gridPos, 0.0, 1.0);
	output.cell = cell;
	return output;
}