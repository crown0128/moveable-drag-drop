import { makeStoryGroup } from "../utils/story";


const group = makeStoryGroup("Variable Situations", module);


group.add("No Target", {
    app: require("./ReactNoTargetApp").default,
    text: require("!!raw-loader!./ReactNoTargetApp").default,
});
group.add("Click a tag", {
    app: require("./ReactATagApp").default,
    text: require("!!raw-loader!./ReactATagApp").default,
});

group.add("Any native input element", {
    app: require("./ReactInputApp").default,
    text: require("!!raw-loader!./ReactInputApp").default,
});
group.add("Test Control Box in Safari", {
    app: require("./ReactSafariApp").default,
    text: require("!!raw-loader!./ReactSafariApp").default,
});
group.add("Test Custom Element Offset", {
    app: require("./ReactCustomElementApp").default,
    text: require("!!raw-loader!./ReactCustomElementApp").default,
});
group.add("Test Custom Element with Bounds", {
    app: require("./ReactCustomElementBoundsApp").default,
    text: require("!!raw-loader!./ReactCustomElementBoundsApp").default,
});
group.add("Check drag accuracy when using bounds", {
    app: require("./ReactAccuracyApp").default,
    text: require("!!raw-loader!./ReactAccuracyApp").default,
});
group.add("Check element guidelines accuracy when zoom is large", {
    app: require("./ReactLargeZoomElementGuidelinesApp").default,
    text: require("!!raw-loader!./ReactLargeZoomElementGuidelinesApp").default,
});
group.add("Test flex element", {
    app: require("./ReactFlexApp").default,
    text: require("!!raw-loader!./ReactFlexApp").default,
});
group.add("Test Container with will change", {
    app: require("./ReactWillChangeApp").default,
    text: require("!!raw-loader!./ReactWillChangeApp").default,
});
group.add("Stop drag if target is select, input, textarea", {
    app: require("./ReactStopDragApp").default,
    text: require("!!raw-loader!./ReactStopDragApp").default,
});
group.add("Stop Click event's Propagation for dragStart", {
    app: require("./ReactClickApp").default,
    text: require("!!raw-loader!./ReactClickApp").default,
});
group.add("Nested Moveable's target", {
    app: require("./ReactNestedTargetApp").default,
    text: require("!!raw-loader!./ReactNestedTargetApp").default,
});
group.add("Zoomed Cursor", {
    app: require("./ReactZoomedCursorApp").default,
    text: require("!!raw-loader!./ReactZoomedCursorApp").default,
});

group.add("Test performance for large number instances", {
    app: require("./ReactHandleLargeNumberApp").default,
    text: require("!!raw-loader!./ReactHandleLargeNumberApp").default,
});
