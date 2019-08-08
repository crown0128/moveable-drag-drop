import EgComponent from "@egjs/component";
import { ref, Properties } from "framework-utils";
import { h, render } from "preact";
import InnerMoveable from "./InnerMoveable";
import { MoveableOptions, MoveableGetterSetter } from "./types";
import {
    OnDragStart, OnDrag, OnResize, OnResizeStart,
    OnResizeEnd, OnScaleStart, OnScaleEnd, OnRotateStart,
    OnRotateEnd, OnDragEnd, OnRotate, OnScale, OnWarpStart, OnWarpEnd, OnWarp, OnPinchStart, OnPinch, OnPinchEnd,
} from "react-moveable/declaration/types";
import { PROPERTIES, EVENTS } from "./consts";
import { camelize } from "@daybrush/utils";

/**
 * Moveable is Draggable! Resizable! Scalable! Rotatable!
 * @sort 1
 * @extends eg.Component
 */
@Properties(PROPERTIES, (prototype, property) => {
    Object.defineProperty(prototype, property, {
        get() {
            return this.getMoveable().props[property];
        },
        set(value) {
            this.innerMoveable.setState({
                [property]: value,
            });
        },
        enumerable: true,
        configurable: true,
    });
})
class Moveable extends EgComponent {
    private innerMoveable!: InnerMoveable;

    /**
     *
     */
    constructor(parentElement: HTMLElement | SVGElement, options: MoveableOptions = {}) {
        super();
        const element = document.createElement("div");
        const nextOptions = { container: parentElement, ...options };

        const events: any = {};

        EVENTS.forEach(name => {
            events[camelize(`on ${name}`)] = (e: any) => this.trigger(name, e);
        });

        render(
            <InnerMoveable
                ref={ref(this, "innerMoveable")}
                {...nextOptions}
                {...events}
            />,
            element,
        );
        parentElement.appendChild(element.children[0]);
    }
    /**
     * Check if the target is an element included in the moveable.
     * @param - the target
     * @example
     * import Moveable from "moveable";
     *
     * const moveable = new Moveable(document.body);
     *
     * window.addEventListener("click", e => {
     *     if (!moveable.isMoveableElement(e.target)) {
     *         moveable.target = e.target;
     *     }
     * });
     */
    public isMoveableElement(target: HTMLElement | SVGElement) {
        return this.getMoveable().isMoveableElement(target);
    }
    /**
     * If the width, height, left, and top of all elements change, update the shape of the moveable.
     * @example
     * import Moveable from "moveable";
     *
     * const moveable = new Moveable(document.body);
     *
     * window.addEventListener("resize", e => {
     *     moveable.updateRect();
     * });
     */
    public updateRect() {
        this.getMoveable().updateRect();
    }
    /**
     * If the width, height, left, and top of the only target change, update the shape of the moveable.
     * @param - the values of x and y to move moveable.
     * @example
     * import Moveable from "moveable";
     *
     * const moveable = new Moveable(document.body);
     *
     * moveable.updateTarget();
     */
    public updateTarget(): void {
        this.getMoveable().updateTarget();
    }
    /**
     * Remove the Moveable object and the events.
     * @example
     * import Moveable from "moveable";
     *
     * const moveable = new Moveable(document.body);
     *
     * moveable.destroy();
     */
    public destroy() {
        const el = this.getMoveable().base;

        el.remove ? el.remove() : el.parentElement.removeChild(el);
        this.off();
        this.getMoveable().componentWillUnmount();
        this.innerMoveable = null;
    }
    private getMoveable() {
        return this.innerMoveable.preactMoveable;
    }
}
/**
 * Whether or not the origin controlbox will be visible or not
 * @name Moveable#origin
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.origin = true;
 */
/**
 * The target to indicate Moveable Control Box.
 * @name Moveable#target
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 * moveable.target = document.querySelector(".target");
 */
/**
 * Whether or not target can be dragged.
 * @name Moveable#draggable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.draggable = true;
 */
/**
 * Whether or not target can be resized.
 * @name Moveable#resizable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.resizable = true;
 */
/**
 * Whether or not target can scaled.
 * @name Moveable#scalable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.scalable = true;
 */
/**
 * Whether or not target can be rotated.
 * @name Moveable#rotatable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.rotatable = true;
 */
/**
 * Whether or not target can be warped.
 * @name Moveable#warpable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.warpable = true;
 */
/**
 * Whether or not target can be pinched with draggable, resizable, scalable, rotatable
 * @name Moveable#pinchable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.pinchable = true;
 */
/**
 * When resize or scale, keeps a ratio of the width, height.
 * @name Moveable#keepRatio
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.keepRatio = true;
 */
/**
 * throttle of x, y when drag.
 * @name Moveable#throttleDrag
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.throttleDrag = 1;
 */
/**
 * throttle of width, height when resize.
 * @name Moveable#throttleResize
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.throttleResize = 1;
 */
/**
 * throttle of scaleX, scaleY when scale.
 * @name Moveable#throttleScale
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.throttleScale = 0.1;
 */
/**
 * hrottle of angle(degree) when rotate.
 * @name Moveable#throttleRotate
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.throttleRotate = 1;
 */
/**
 * When the drag starts, the dragStart event is called.
 * @memberof Moveable
 * @event dragStart
 * @param {Moveable.OnDragStart} - Parameters for the dragStart event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { draggable: true });
 * moveable.on("dragStart", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When dragging, the drag event is called.
 * @memberof Moveable
 * @event drag
 * @param {Moveable.OnDrag} - Parameters for the drag event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { draggable: true });
 * moveable.on("drag", ({ target, transform }) => {
 *     target.style.transform = transform;
 * });
 */
/**
 * When the drag finishes, the dragEnd event is called.
 * @memberof Moveable
 * @event dragEnd
 * @param {Moveable.OnDragEnd} - Parameters for the dragEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { draggable: true });
 * moveable.on("dragEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */
/**
 * When the resize starts, the resizeStart event is called.
 * @memberof Moveable
 * @event resizeStart
 * @param {Moveable.OnResizeStart} - Parameters for the resizeStart event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { resizable: true });
 * moveable.on("resizeStart", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When resizing, the resize event is called.
 * @memberof Moveable
 * @event resize
 * @param {Moveable.OnResize} - Parameters for the resize event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { resizable: true });
 * moveable.on("resize", ({ target, width, height }) => {
 *     target.style.width = `${e.width}px`;
 *     target.style.height = `${e.height}px`;
 * });
 */
/**
 * When the resize finishes, the resizeEnd event is called.
 * @memberof Moveable
 * @event resizeEnd
 * @param {Moveable.OnResizeEnd} - Parameters for the resizeEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { resizable: true });
 * moveable.on("resizeEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */
/**
 * When the scale starts, the scaleStart event is called.
 * @memberof Moveable
 * @event scaleStart
 * @param {Moveable.OnScaleStart} - Parameters for the scaleStart event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { scalable: true });
 * moveable.on("scaleStart", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When scaling, the scale event is called.
 * @memberof Moveable
 * @event scale
 * @param {Moveable.OnScale} - Parameters for the scale event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { scalable: true });
 * moveable.on("scale", ({ target, transform, dist }) => {
 *     target.style.transform = transform;
 * });
 */
/**
 * When the scale finishes, the scaleEnd event is called.
 * @memberof Moveable
 * @event scaleEnd
 * @param {Moveable.OnScaleEnd} - Parameters for the scaleEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { scalable: true });
 * moveable.on("scaleEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */
/**
 * When the rotate starts, the rotateStart event is called.
 * @memberof Moveable
 * @event rotateStart
 * @param {Moveable.OnRotateStart} - Parameters for the rotateStart event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { rotatable: true });
 * moveable.on("rotateStart", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When rotating, the rotate event is called.
 * @memberof Moveable
 * @event rotate
 * @param {Moveable.OnRotate} - Parameters for the rotate event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { rotatable: true });
 * moveable.on("rotate", ({ target, transform, dist }) => {
 *     target.style.transform = transform;
 * });
 */
/**
 * When the rotate finishes, the rotateEnd event is called.
 * @memberof Moveable
 * @event rotateEnd
 * @param {Moveable.OnRotateEnd} - Parameters for the rotateEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { rotatable: true });
 * moveable.on("rotateEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */

/**
* When the warp starts, the warpStart event is called.
* @memberof Moveable
* @event warpStart
* @param {Moveable.OnWarpStart} - Parameters for the warpStart event
* @example
* import Moveable from "moveable";
*
* const moveable = new Moveable(document.body, { warpable: true });
* moveable.on("warpStart", ({ target }) => {
*     console.log(target);
* });
*/
/**
 * When warping, the warp event is called.
 * @memberof Moveable
 * @event warp
 * @param {Moveable.OnWarp} - Parameters for the warp event
 * @example
 * import Moveable from "moveable";
 * let matrix = [
 *  1, 0, 0, 0,
 *  0, 1, 0, 0,
 *  0, 0, 1, 0,
 *  0, 0, 0, 1,
 * ];
 * const moveable = new Moveable(document.body, { warpable: true });
 * moveable.on("warp", ({ target, transform, delta, multiply }) => {
 *    // target.style.transform = transform;
 *    matrix = multiply(matrix, delta);
 *    target.style.transform = `matrix3d(${matrix.join(",")})`;
 * });
 */
/**
 * When the warp finishes, the warpEnd event is called.
 * @memberof Moveable
 * @event warpEnd
 * @param {Moveable.OnWarpEnd} - Parameters for the warpEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { warpable: true });
 * moveable.on("warpEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */
/**
 * When the pinch starts, the pinchStart event is called with part of scaleStart, rotateStart, resizeStart
 * @memberof Moveable
 * @event pinchStart
 * @param {Moveable.OnPinchStart} - Parameters for the pinchStart event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *     rotatable: true,
 *     scalable: true,
 *     pinchable: true, // ["rotatable", "scalable"]
 * });
 * moveable.on("pinchStart", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("rotateStart", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("scaleStart", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When pinching, the pinch event is called with part of scale, rotate, resize
 * @memberof Moveable
 * @event pinch
 * @param {Moveable.OnPinch} - Parameters for the pinch event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *     rotatable: true,
 *     scalable: true,
 *     pinchable: true, // ["rotatable", "scalable"]
 * });
 * moveable.on("pinch", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("rotate", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("scale", ({ target }) => {
 *     console.log(target);
 * });
 */
/**
 * When the pinch finishes, the pinchEnd event is called.
 * @memberof Moveable
 * @event pinchEnd
 * @param {Moveable.OnPinchEnd} - Parameters for the pinchEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *     rotatable: true,
 *     scalable: true,
 *     pinchable: true, // ["rotatable", "scalable"]
 * });
 * moveable.on("pinchEnd", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("rotateEnd", ({ target }) => {
 *     console.log(target);
 * });
 * moveable.on("scaleEnd", ({ target }) => {
 *     console.log(target);
 * });
 */

interface Moveable extends MoveableGetterSetter {
    on(eventName: "drag", handlerToAttach: (event: OnDrag) => any): this;
    on(eventName: "dragStart", handlerToAttach: (event: OnDragStart) => any): this;
    on(eventName: "dragEnd", handlerToAttach: (event: OnDragEnd) => any): this;
    on(eventName: "resize", handlerToAttach: (event: OnResize) => any): this;
    on(eventName: "resizeStart", handlerToAttach: (event: OnResizeStart) => any): this;
    on(eventName: "resizeEnd", handlerToAttach: (event: OnResizeEnd) => any): this;
    on(eventName: "scale", handlerToAttach: (event: OnScale) => any): this;
    on(eventName: "scaleStart", handlerToAttach: (event: OnScaleStart) => any): this;
    on(eventName: "scaleEnd", handlerToAttach: (event: OnScaleEnd) => any): this;
    on(eventName: "rotate", handlerToAttach: (event: OnRotate) => any): this;
    on(eventName: "rotateStart", handlerToAttach: (event: OnRotateStart) => any): this;
    on(eventName: "rotateEnd", handlerToAttach: (event: OnRotateEnd) => any): this;
    on(eventName: "warp", handlerToAttach: (event: OnWarp) => any): this;
    on(eventName: "warpStart", handlerToAttach: (event: OnWarpStart) => any): this;
    on(eventName: "warpEnd", handlerToAttach: (event: OnWarpEnd) => any): this;
    on(eventName: "pinch", handlerToAttach: (event: OnPinch) => any): this;
    on(eventName: "pinchStart", handlerToAttach: (event: OnPinchStart) => any): this;
    on(eventName: "pinchEnd", handlerToAttach: (event: OnPinchEnd) => any): this;
    on(eventName: string, handlerToAttach: (event: { [key: string]: any }) => any): this;
    on(events: { [key: string]: (event: { [key: string]: any }) => any }): this;
}

export default Moveable;
