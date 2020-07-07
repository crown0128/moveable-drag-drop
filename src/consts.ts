import { MoveableEvents, MoveableOptions } from "./types";
import { MoveableInterface } from "react-moveable/declaration/types";

export const PROPERTIES: Array<keyof MoveableOptions> = [
    "draggable", "resizable", "scalable", "rotatable",
    "warpable", "pinchable", "snappable", "origin", "target", "edge",
    "throttleDrag", "throttleDragRotate", "throttleResize",
    "throttleScale", "throttleRotate", "keepRatio",
    "dragArea",
    "pinchThreshold",
    "snapCenter", "snapThreshold",
    "horizontalGuidelines", "verticalGuidelines", "elementGuidelines",
    "bounds",
    "innerBounds",
    "className",
    "renderDirections",
    "scrollable",
    "getScrollPosition",
    "scrollContainer",
    "scrollThreshold",
    "baseDirection",
    "snapElement",
    "snapVertical",
    "snapHorizontal",
    "snapGap",
    "isDisplaySnapDigit",
    "snapDigit",
    "zoom",
    "triggerAblesSimultaneously",
    "padding",
    "snapDistFormat",
    "dragTarget",
];
export const EVENTS: Array<keyof MoveableEvents> = [
    "dragStart",
    "drag",
    "dragEnd",
    "resizeStart",
    "resize",
    "resizeEnd",
    "scaleStart",
    "scale",
    "scaleEnd",
    "rotateStart",
    "rotate",
    "rotateEnd",
    "warpStart",
    "warp",
    "warpEnd",
    "pinchStart",
    "pinch",
    "pinchEnd",
    "dragGroupStart",
    "dragGroup",
    "dragGroupEnd",
    "resizeGroupStart",
    "resizeGroup",
    "resizeGroupEnd",
    "scaleGroupStart",
    "scaleGroup",
    "scaleGroupEnd",
    "rotateGroupStart",
    "rotateGroup",
    "rotateGroupEnd",
    "pinchGroupStart",
    "pinchGroup",
    "pinchGroupEnd",

    "click",
    "clickGroup",

    "scroll",
    "scrollGroup",

    "renderStart",
    "render",
    "renderEnd",
    "renderGroupStart",
    "renderGroup",
    "renderGroupEnd",

    "snap",
];
