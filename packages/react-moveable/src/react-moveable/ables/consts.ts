import Pinchable from "./Pinchable";
import Rotatable from "./Rotatable";
import Draggable from "./Draggable";
import Resizable from "./Resizable";
import Scalable from "./Scalable";
import Warpable from "./Warpable";
import Snappable from "./Snappable";
import DragArea from "./DragArea";
import Origin from "./Origin";
import Scrollable from "./Scrollable";
import Default from "./Default";
import Padding from "./Padding";
import Clippable from "./Clippable";
import OriginDraggable from "./OriginDraggable";
import Roundable from "./Roundable";
import { UnionToIntersection } from "../types";
import { invertObject } from "../utils";
import Groupable from "./Groupable";
import BeforeRenderable from "./BeforeRenderable";
import Renderable from "./Renderable";
import Clickable from "./Clickable";
import edgeDraggable from "./edgeDraggable";
import IndividualGroupable from "./IndividualGroupable";

export const MOVEABLE_ABLES = /*#__PURE__*/[
    BeforeRenderable,
    Default, Snappable, Pinchable, Draggable, edgeDraggable,
    Resizable, Scalable, Warpable, Rotatable, Scrollable, Padding, Origin,
    OriginDraggable,
    Clippable, Roundable, Groupable, IndividualGroupable,
    Clickable,
    DragArea,
    Renderable,
] as const;

export const MOVEABLE_EVENTS_PROPS_MAP = /*#__PURE__*/MOVEABLE_ABLES.reduce((current, able) => {
    return {...current, ...("events" in able ? able.events : {})};
}, {}) as UnionToIntersection<typeof MOVEABLE_ABLES[number]["events"]>;
export const MOVEABLE_PROPS_MAP = /*#__PURE__*/MOVEABLE_ABLES.reduce((current, able) => {
    return {...current, ...able.props};
}, {}) as UnionToIntersection<typeof MOVEABLE_ABLES[number]["props"]>;

export const MOVEABLE_EVENTS_MAP = /*#__PURE__*/invertObject(MOVEABLE_EVENTS_PROPS_MAP);
export const MOVEABLE_EVENTS: string[] = /*#__PURE__*/Object.keys(MOVEABLE_EVENTS_MAP);
export const MOVEABLE_PROPS: string[] = /*#__PURE__*/Object.keys(MOVEABLE_PROPS_MAP);
