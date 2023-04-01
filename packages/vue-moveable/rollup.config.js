const buildHelper = require("@daybrush/builder");
const vuePlugin = require("rollup-plugin-vue");

const defaultOptions = {
    sourcemap: true,
    input: "./src/index.ts",
    exports: "named",
    external: true,
    typescript2: true,
    plugins: [
        vuePlugin(),
    ]
};
module.exports = buildHelper([
    {
        ...defaultOptions,
        format: "es",
        output: "./dist/moveable.esm.js",
    },
    {
        ...defaultOptions,
        format: "cjs",
        input: "./src/index.umd.ts",
        exports: "default",
        output: "./dist/moveable.cjs.js",
    },
]);
