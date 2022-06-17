import builder from "@daybrush/builder";

const defaultOptions = {
    tsconfig: "tsconfig.build.json",
};

export default builder([{
    ...defaultOptions,
    input: "src/index.ts",
    output: "./dist/snappable.esm.js",
    format: "es",
    exports: "named",
},
{
    ...defaultOptions,
    input: "src/index.umd.ts",
    output: "./dist/snappable.esm.js",
    format: "es",
    exports: "default",
    name: "Snappable",
},
{
    ...defaultOptions,
    input: "src/index.umd.ts",
    output: "./dist/snappable.cjs.js",
    format: "cjs",
    exports: "default",
},
]);
