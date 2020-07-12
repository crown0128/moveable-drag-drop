
import builder from "@daybrush/builder";
import reactCompat from "rollup-plugin-react-compat";

const external = {
    "react-simple-compat": "react-simple-compat",
    "react-compat-ruler": "react-compat-ruler",
    "react-compat-css-styled": "react-compat-css-styled",
    "@daybrush/utils": "utils",
    "css-styled": "css-styled",
    "framework-utils": "framework-utils",
    "@daybrush/drag": "Dragger",
    "@egjs/agent": "eg.Agent",
    "@egjs/children-differ": "eg.ChildrenDiffer",
    "@moveable/matrix": "@moveable/matrix",
    "@scena/dragscroll": "@scena/dragscroll",
};


const reactPlugin = reactCompat({
    useReactCompat: true,
    aliasModules: {
        "@scena/react-ruler": "react-compat-ruler",
        "react-css-styled": "react-compat-css-styled",
    }
})



export default builder([
    {
        sourcemap: false,
        input: "src/index.ts",
        output: "./dist/moveable.esm.js",
        exports: "named",
        format: "es",
        plugins: [reactPlugin],
        external,
    },
    {
        sourcemap: false,
        input: "src/index.ts",
        output: "./dist/moveable.cjs.js",
        exports: "named",
        plugins: [reactPlugin],
        format: "cjs",
        external,
    },
]);
