import buildHelper from "@daybrush/builder";
import svelte from 'rollup-plugin-svelte';

const defaultOptions = {
    tsconfig: "",
    input: './src/index.js',
    external: {
        "svelte": "svelte",
    },
    plugins: [
        svelte(),
    ],
}
export default buildHelper([
    {
        ...defaultOptions,
        output: "dist/moveable.cjs.js",
        format: "cjs",
    },
    {
        ...defaultOptions,
        output: "dist/moveable.esm.js",
        format: "es",
    },
]);
