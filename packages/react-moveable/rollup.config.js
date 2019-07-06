import builder from "@daybrush/builder";

const defaultOptions = {
    tsconfig: "tsconfig.build.json",
};

export default builder([
    {
        ...defaultOptions,
        input: "src/react-moveable/index.ts",
        output: "./dist/moveable.esm.js",
        format: "es",
    },
    {
        ...defaultOptions,
        input: "src/react-moveable/index.ts",
        output: "./dist/moveable.cjs.js",
        format: "cjs",
    },
]);
