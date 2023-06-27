
const builder = require("@daybrush/builder");
const reactCompat = require("rollup-plugin-react-compat");

const external = {
    "croact": "croact",
    "croact-ruler": "croact-ruler",
    "croact-css-styled": "croact-css-styled",
    "@daybrush/utils": "utils",
    "css-styled": "css-styled",
    "framework-utils": "framework-utils",
    "gesto": "Gesto",
    "@scena/event-emitter": "@scena/event-emitter",
    "@egjs/agent": "eg.Agent",
    "@egjs/children-differ": "eg.ChildrenDiffer",
    "@moveable/matrix": "@moveable/matrix",
    "@scena/dragscroll": "@scena/dragscroll",
    "css-to-mat": "css-to-mat",
    "overlap-area": "overlap-area",
    "@scena/matrix": "@scena/matrix",
    "@egjs/list-differ": "eg.ListDiffer",
};


const reactPlugin = reactCompat({
    useCroact: true,
    aliasModules: {
        "@scena/react-ruler": "croact-ruler",
        "react-css-styled": "croact-css-styled",
    }
})



module.exports = builder([
    {
        sourcemap: false,
        input: "src/index.ts",
        output: "./dist/moveable.esm.js",
        exports: "named",
        format: "es",
        plugins: [reactPlugin],
        external,
        typescript2: true,
    },
    {
        sourcemap: false,
        input: "src/index.umd.ts",
        output: "./dist/moveable.cjs.js",
        exports: "named",
        plugins: [reactPlugin],
        format: "cjs",
        external,
        typescript2: true,
    },
]);
