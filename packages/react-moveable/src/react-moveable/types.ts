
export interface MoveableProps {
    target?: SVGElement | HTMLElement;
    container?: SVGElement | HTMLElement | null;
    origin?: boolean;
    rotatable?: boolean;
    draggable?: boolean;
    scalable?: boolean;
    resizable?: boolean;
    keepRatio?: boolean;

    onRotateStart?: (e: OnRotateStart) => void;
    onRotate?: (e: OnRotate) => void;
    onRotateEnd?: (e: OnRotateEnd) => void;

    onDragStart?: (e: OnDragStart) => void;
    onDrag?: (e: OnDrag) => void;
    onDragEnd?: (e: OnDragEnd) => void;

    onScaleStart?: (e: OnScaleStart) => void;
    onScale?: (e: OnScale) => void;
    onScaleEnd?: (e: OnScaleEnd) => void;

    onResizeStart?: (e: OnResizeStart) => void;
    onResize?: (e: OnResize) => void;
    onResizeEnd?: (e: OnResizeEnd) => void;
}

export interface MoveableState {
    target: SVGElement | HTMLElement | null | undefined;
    left: number;
    top: number;
    width: number;
    height: number;
    beforeMatrix: number[];
    matrix: number[];
    transform: string;
    transformOrigin: number[];
    origin: number[];
    direction: 1 | -1;
    rotationRad: number;
    rotationPos: number[];
    pos1: number[];
    pos2: number[];
    pos3: number[];
    pos4: number[];
}

/**
 * @typedef
 * @memberof Moveable
 * @property - a target to drag
 */
export interface OnDragStart {
    target: HTMLElement | SVGElement;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a dragging target
 * @property - The delta of [left, top]
 * @property - The distance of [left, top]
 * @property - The delta of [translateX, translateY]
 * @property - The distance of [translateX, translateY]
 * @property - a target's transform
 * @property - a target's left
 * @property - a target's top
 * @property - a target's bottom
 * @property - a target's right
 */
export interface OnDrag {
    target: HTMLElement | SVGElement;
    beforeDelta: number[];
    beforeDist: number[];
    delta: number[];
    dist: number[];
    transform: string;
    left: number;
    top: number;
    bottom: number;
    right: number;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a drag finished target
 * @property - Whether drag called
 */
export interface OnDragEnd {
    target: HTMLElement | SVGElement;
    isDrag: boolean;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a target to scale
 */
export interface OnScaleStart {
    target: HTMLElement | SVGElement;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a scaling target
 * @property - a target's scale
 * @property - The distance of scale
 * @property - The delta of scale
 * @property - a target's transform
 */
export interface OnScale {
    target: HTMLElement | SVGElement;
    scale: number[];
    dist: number[];
    delta: number[];
    transform: string;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a scale finished target
 * @property - Whether scale called
 */
export interface OnScaleEnd {
    target: HTMLElement | SVGElement;
    isDrag: boolean;
}

/**
 * @typedef
 * @memberof Moveable
 * @property - a target to resize
 */
export interface OnResizeStart {
    target: HTMLElement | SVGElement;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a resizng target
 * @property - a target's width
 * @property - a target's height
 * @property - The distance of [width, height]
 * @property - The delta of [width, height]
 */
export interface OnResize {
    target: HTMLElement | SVGElement;
    width: number;
    height: number;
    dist: number[];
    delta: number[];
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a resize finished target
 * @property - Whether resize called
 */
export interface OnResizeEnd {
    target: HTMLElement | SVGElement;
    isDrag: boolean;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a target to rotate
 */
export interface OnRotateStart {
    target: HTMLElement | SVGElement;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a rotating target
 * @property - The distance of rotation rad
 * @property - The delta of rotation rad
 * @property - The distance of rotation rad before transform is applied
 * @property - The delta of rotation rad before transform is applied
 * @property - a target's transform
 */
export interface OnRotate {
    target: HTMLElement | SVGElement;
    dist: number;
    delta: number;
    beforeDist: number;
    beforeDelta: number;
    transform: string;
}
/**
 * @typedef
 * @memberof Moveable
 * @property - a rotate finished target
 * @property - Whether rotate called
 */
export interface OnRotateEnd {
    target: HTMLElement | SVGElement;
    isDrag: boolean;
}
