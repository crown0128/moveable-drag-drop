import {
    throttle, prefix, triggerEvent, fillParams,
    getRotationRad, getClientRect, caculatePosition, fillEndParams
} from "../utils";
import { IObject, hasClass } from "@daybrush/utils";
import {
    RotatableProps, OnRotateGroup, OnRotateGroupEnd,
    Renderer, OnRotateGroupStart, OnRotateStart, OnRotate,
    OnRotateEnd, MoveableClientRect, SnappableProps,
    SnappableState, MoveableManagerInterface, MoveableGroupInterface, DraggableProps,
    OnDragStart,
} from "../types";
import { triggerChildAble } from "../groupUtils";
import Draggable from "./Draggable";
import { minus, plus, getRad, rotate as rotateMatrix } from "../matrix";
import CustomDragger, { setCustomDrag } from "../CustomDragger";
import { checkSnapRotate } from "./Snappable";
import {
    fillTransformStartEvent,
    convertTransformFormat, getRotateDist,
    getOriginDirection,
    getDirectionOffset,
    fillTransformEvent,
    setDefaultTransformIndex,
    resolveTransformEvent,
} from "../DraggerUtils";

/**
 * @namespace Rotatable
 * @memberof Moveable
 * @description Rotatable indicates whether the target can be rotated.
 */

function setRotateStartInfo(
    moveable: MoveableManagerInterface<any, any>,
    datas: IObject<any>, clientX: number, clientY: number, origin: number[], rect: MoveableClientRect) {

    const n = moveable.state.is3d ? 4 : 3;
    const nextOrigin = caculatePosition(moveable.state.rootMatrix, origin, n);
    const startAbsoluteOrigin = plus([rect.left, rect.top], nextOrigin);

    datas.startAbsoluteOrigin = startAbsoluteOrigin;
    datas.prevDeg = getRad(startAbsoluteOrigin, [clientX, clientY]) / Math.PI * 180;
    datas.prevSnapDeg = datas.prevDeg;
    datas.startDeg = datas.prevDeg;
    datas.loop = 0;
}
function getParentDeg(
    moveable: MoveableManagerInterface<any, any>,
    moveableRect: any,
    datas: IObject<any>,
    parentDist: number,
    direction: number,
    startValue: number,
) {
    const {
        prevDeg,
    } = datas;

    // const absoluteDeg = startValue + parentDist;
    const dist = checkSnapRotate(
        moveable,
        moveableRect,
        datas.origin,
        parentDist,
    );
    datas.prevDeg = dist;

    const delta = dist - prevDeg;

    return [delta, dist, startValue + dist];
}
function getDeg(
    moveable: MoveableManagerInterface<any, any>,
    moveableRect: any,
    datas: IObject<any>,
    deg: number,
    direction: number,
    startValue: number,
    throttleRotate: number,
    isSnap?: boolean,
) {
    const {
        prevDeg,
        prevSnapDeg,
        startDeg,
        loop: prevLoop,
    } = datas;

    if (prevDeg > deg && prevDeg > 270 && deg < 90) {
        // 360 => 0
        ++datas.loop;
    } else if (prevDeg < deg && prevDeg < 90 && deg > 270) {
        // 0 => 360
        --datas.loop;
    }
    const loop = datas.loop;
    const absolutePrevSnapDeg = prevLoop * 360 + prevSnapDeg - startDeg + startValue;
    let absoluteDeg = loop * 360 + deg - startDeg + startValue;

    datas.prevDeg = absoluteDeg - loop * 360 + startDeg - startValue;

    absoluteDeg = throttle(absoluteDeg, throttleRotate);
    let dist = direction * (absoluteDeg - startValue);
    if (isSnap) {
        dist = checkSnapRotate(moveable, moveableRect, datas.origin, dist);
        absoluteDeg = dist / direction + startValue;
    }
    datas.prevSnapDeg = absoluteDeg - loop * 360 + startDeg - startValue;

    const delta = direction * (absoluteDeg - absolutePrevSnapDeg);

    return [delta, dist, startValue + dist];
}
function getRotateInfo(
    moveable: MoveableManagerInterface<any, any>,
    moveableRect: any,
    datas: IObject<any>,
    direction: number,
    clientX: number, clientY: number,
    startValue: number,
    throttleRotate: number,
) {
    return getDeg(
        moveable,
        moveableRect,
        datas,
        getRad(datas.startAbsoluteOrigin, [clientX, clientY]) / Math.PI * 180,
        direction,
        startValue,
        throttleRotate,
        true,
    );
}

export function getReversePositionX(dir: string) {
    if (dir === "left") {
        return "right";
    } else if (dir === "right") {
        return "left";
    }
    return dir;
}
export function getReversePositionY(dir: string) {
    if (dir === "top") {
        return "bottom";
    } else if (dir === "bottom") {
        return "top";
    }
    return dir;
}
export function getPositions(
    rotationPosition: RotatableProps["rotationPosition"],
    [pos1, pos2, pos3, pos4]: number[][],
    direction: number,
) {
    const [dir1, dir2] = (rotationPosition || "top").split("-");
    let radPoses = [pos1, pos2];

    // if (scale[0] < 0) {
    //     dir1 = getReversePositionX(dir1);
    //     dir2 = getReversePositionX(dir2);
    // }
    // if (scale[1] < 0) {
    //     dir1 = getReversePositionY(dir1);
    //     dir2 = getReversePositionY(dir2);
    // }
    if (dir1 === "left") {
        radPoses = [pos3, pos1];
    } else if (dir1 === "right") {
        radPoses = [pos2, pos4];
    } else if (dir1 === "bottom") {
        radPoses = [pos4, pos3];
    }
    let pos = [
        (radPoses[0][0] + radPoses[1][0]) / 2,
        (radPoses[0][1] + radPoses[1][1]) / 2,
    ];
    const rad = getRotationRad(radPoses, direction);

    if (dir2) {
        const isStart = dir2 === "top" || dir2 === "left";
        const isReverse = dir1 === "bottom" || dir1 === "left";

        pos = radPoses[(isStart && !isReverse) || (!isStart && isReverse) ? 0 : 1];
    }
    return [pos, rad] as const;
}

export function dragControlCondition(e: any) {
    if (e.isRequest) {
        return e.requestAble === "rotatable";
    }
    return hasClass(e.inputEvent.target, prefix("rotation"));
}

export default {
    name: "rotatable",
    canPinch: true,
    props: {
        rotatable: Boolean,
        rotationPosition: String,
        throttleRotate: Number,
    } as const,
    events: {
        onRotateStart: "rotateStart",
        onRotate: "rotate",
        onRotateEnd: "rotateEnd",
        onRotateGroupStart: "rotateGroupStart",
        onRotateGroup: "rotateGroup",
        onRotateGroupEnd: "rotateGroupEnd",
    } as const,
    render(moveable: MoveableManagerInterface<RotatableProps>, React: Renderer): any {
        const {
            rotatable,
            rotationPosition,
        } = moveable.props;
        if (!rotatable) {
            return null;
        }
        const { renderPoses, direction } = moveable.state;
        const [pos, rotationRad] = getPositions(rotationPosition!, renderPoses, direction);

        return (
            <div key="rotation" className={prefix("line rotation-line")} style={{
                // tslint:disable-next-line: max-line-length
                transform: `translate(-50%) translate(${pos[0]}px, ${pos[1]}px) rotate(${rotationRad}rad)`,
            }}>
                <div className={prefix("control", "rotation")}></div>
            </div>
        );
    },
    dragControlCondition,
    dragControlStart(
        moveable: MoveableManagerInterface<RotatableProps & SnappableProps & DraggableProps, SnappableState>,
        e: any) {
        const {
            datas,
            clientX, clientY,
            parentRotate, parentFlag, isPinch,
            isRequest,
        } = e;
        const {
            target, left, top, origin, beforeOrigin,
            direction, beforeDirection, targetTransform,
        } = moveable.state;

        if (!isRequest && !target) {
            return false;
        }

        const rect = moveable.getRect();
        datas.rect = rect;
        datas.transform = targetTransform;
        datas.left = left;
        datas.top = top;
        datas.fixedPosition = getDirectionOffset(moveable, getOriginDirection(moveable));

        if (isRequest || isPinch || parentFlag) {
            const externalRotate = parentRotate || 0;

            datas.beforeInfo = {
                origin: rect.beforeOrigin,
                prevDeg: externalRotate,
                startDeg: externalRotate,
                prevSnapDeg: externalRotate, loop: 0,
            };
            datas.afterInfo = {
                origin: rect.origin,
                prevDeg: externalRotate, startDeg: externalRotate,
                prevSnapDeg: externalRotate, loop: 0,
            };
        } else {
            datas.beforeInfo = { origin: rect.beforeOrigin };
            datas.afterInfo = { origin: rect.origin };

            const controlRect = getClientRect(moveable.controlBox.getElement());

            setRotateStartInfo(moveable, datas.beforeInfo, clientX, clientY, beforeOrigin, controlRect);
            setRotateStartInfo(moveable, datas.afterInfo, clientX, clientY, origin, controlRect);
        }

        datas.direction = direction;
        datas.beforeDirection = beforeDirection;
        datas.startValue = 0;
        datas.datas = {};

        setDefaultTransformIndex(e);

        const params = fillParams<OnRotateStart>(moveable, e, {
            set: (rotatation: number) => {
                datas.startValue = rotatation * Math.PI / 180;
            },
            ...fillTransformStartEvent(e),
            dragStart: Draggable.dragStart(
                moveable,
                new CustomDragger().dragStart([0, 0], e),
            ) as OnDragStart | false,
        });
        const result = triggerEvent(moveable, "onRotateStart", params);
        datas.isRotate = result !== false;
        moveable.state.snapRenderInfo = {
            request: e.isRequest,
        };

        return datas.isRotate ? params : false;
    },
    dragControl(
        moveable: MoveableManagerInterface<RotatableProps & DraggableProps>,
        e: any,
    ) {
        const { datas, clientX, clientY, parentRotate, parentFlag, isPinch } = e;
        const {
            direction,
            beforeDirection,
            beforeInfo,
            afterInfo,
            isRotate,
            startValue,
            rect,
        } = datas;

        resolveTransformEvent(e, "rotate");
        if (!isRotate) {
            return;
        }
        const {
            throttleRotate = 0,
            parentMoveable,
        } = moveable.props;

        let delta: number;
        let dist: number;
        let rotate: number;
        let beforeDelta: number;
        let beforeDist: number;
        let beforeRotate: number;

        const startDeg = 180 / Math.PI * startValue;

        if (!parentFlag && "parentDist" in e) {
            const parentDist = e.parentDist;

            [delta, dist, rotate]
                = getParentDeg(moveable, rect, afterInfo, parentDist, direction, startDeg);
            [beforeDelta, beforeDist, beforeRotate]
                = getParentDeg(moveable, rect, beforeInfo, parentDist, direction, startDeg);

        } else if (isPinch || parentFlag) {
            [delta, dist, rotate]
                = getDeg(moveable, rect, afterInfo, parentRotate, direction, startDeg, throttleRotate);
            [beforeDelta, beforeDist, beforeRotate]
                = getDeg(moveable, rect, beforeInfo, parentRotate, direction, startDeg, throttleRotate);
        } else {
            [delta, dist, rotate]
                = getRotateInfo(moveable, rect, afterInfo, direction, clientX, clientY, startDeg, throttleRotate);
            [beforeDelta, beforeDist, beforeRotate] = getRotateInfo(
                moveable, rect, beforeInfo, beforeDirection, clientX, clientY, startDeg, throttleRotate,
            );
        }

        if (!delta && !beforeDelta && !parentMoveable) {
            return;
        }

        const nextTransform = convertTransformFormat(
            datas, `rotate(${rotate}deg)`, `rotate(${dist}deg)`);
        const inverseDist = getRotateDist(moveable, dist, datas.fixedPosition, datas);
        const inverseDelta = minus(inverseDist, datas.prevInverseDist || [0, 0]);

        datas.prevInverseDist = inverseDist;

        const params = fillParams<OnRotate>(moveable, e, {
            delta,
            dist,
            rotate,
            beforeDist,
            beforeDelta,
            beforeRotate,
            isPinch: !!isPinch,
            ...fillTransformEvent(
                moveable,
                nextTransform,
                inverseDelta,
                isPinch,
                e,
            ),
        });
        triggerEvent(moveable, "onRotate", params);

        return params;
    },
    dragControlEnd(moveable: MoveableManagerInterface<RotatableProps>, e: any) {
        const { datas, isDrag } = e;

        if (!datas.isRotate) {
            return false;
        }
        datas.isRotate = false;

        triggerEvent(moveable, "onRotateEnd", fillEndParams<OnRotateEnd>(moveable, e, {}));
        return isDrag;
    },
    dragGroupControlCondition: dragControlCondition,
    dragGroupControlStart(moveable: MoveableGroupInterface<any, any>, e: any) {
        const { datas } = e;
        const {
            left: parentLeft,
            top: parentTop,
            beforeOrigin: parentBeforeOrigin,
        } = moveable.state;

        const params = this.dragControlStart(moveable, e);

        if (!params) {
            return false;
        }

        params.set(datas.beforeDirection * moveable.rotation);

        const events = triggerChildAble(
            moveable,
            this,
            "dragControlStart",
            e,
            (_, ev) => ({ ...ev, parentRotate: 0 }),
            (child, ev) => {
                const { left, top, beforeOrigin } = child.state;
                const childClient = plus(
                    minus([left, top], [parentLeft, parentTop]),
                    minus(beforeOrigin, parentBeforeOrigin),
                );

                ev.datas.prevClient = childClient;
            },
        );

        const nextParams: OnRotateGroupStart = {
            ...params,
            targets: moveable.props.targets!,
            events,
        };
        const result = triggerEvent(moveable, "onRotateGroupStart", nextParams);

        datas.isRotate = result !== false;

        return datas.isRotate ? params : false;
    },
    dragGroupControl(moveable: MoveableGroupInterface<any, any>, e: any) {
        const { datas } = e;

        if (!datas.isRotate) {
            return;
        }
        const params = this.dragControl(moveable, e);

        if (!params) {
            return;
        }
        const direction = datas.beforeDirection;
        const parentRotate = params.beforeDist;
        const deg = params.beforeDelta;
        const rad = deg / 180 * Math.PI;

        const events = triggerChildAble(
            moveable,
            this,
            "dragControl",
            e,
            (_, ev) => ({ ...ev, parentRotate }),
            (child, ev, result) => {
                const [prevX, prevY] = ev.datas.prevClient;
                const [clientX, clientY] = rotateMatrix([prevX, prevY], rad * direction);
                const delta = [clientX - prevX, clientY - prevY];

                ev.datas.prevClient = [clientX, clientY];

                const dragResult = Draggable.drag(
                    child,
                    setCustomDrag(e, child.state, delta, !!e.isPinch, false),
                );
                result.drag = dragResult;
            },
        );
        moveable.rotation = direction * params.beforeRotate;

        const nextParams: OnRotateGroup = {
            targets: moveable.props.targets!,
            events,
            set: (rotation: number) => {
                moveable.rotation = rotation;
            },
            ...params,
        };

        triggerEvent(moveable, "onRotateGroup", nextParams);
        return nextParams;
    },
    dragGroupControlEnd(moveable: MoveableGroupInterface<any, any>, e: any) {
        const { isDrag, datas } = e;

        if (!datas.isRotate) {
            return;
        }

        this.dragControlEnd(moveable, e);
        triggerChildAble(moveable, this, "dragControlEnd", e);

        const nextParams = fillEndParams<OnRotateGroupEnd>(moveable, e, {
            targets: moveable.props.targets!,
        });

        triggerEvent(moveable, "onRotateGroupEnd", nextParams);
        return isDrag;
    },
    /**
     * @method Moveable.Rotatable#request
     * @param {object} [e] - the Resizable's request parameter
     * @param {number} [e.deltaRotate=0] -  delta number of rotation
     * @param {number} [e.rotate=0] - absolute number of moveable's rotation
     * @return {Moveable.Requester} Moveable Requester
     * @example

     * // Instantly Request (requestStart - request - requestEnd)
     * moveable.request("rotatable", { deltaRotate: 10 }, true);
     *
     * * moveable.request("rotatable", { rotate: 10 }, true);
     *
     * // requestStart
     * const requester = moveable.request("rotatable");
     *
     * // request
     * requester.request({ deltaRotate: 10 });
     * requester.request({ deltaRotate: 10 });
     * requester.request({ deltaRotate: 10 });
     *
     * requester.request({ rotate: 10 });
     * requester.request({ rotate: 20 });
     * requester.request({ rotate: 30 });
     *
     * // requestEnd
     * requester.requestEnd();
     */
    request(moveable: MoveableManagerInterface<RotatableProps>) {
        const datas = {};
        let distRotate = 0;

        const startRotation = moveable.getRotation();
        return {
            isControl: true,
            requestStart(e: IObject<any>) {
                return { datas };
            },
            request(e: IObject<any>) {
                if ("deltaRotate" in e) {
                    distRotate += e.deltaRotate;
                } else if ("rotate" in e) {
                    distRotate = e.rotate - startRotation;
                }

                return { datas, parentDist: distRotate };
            },
            requestEnd() {
                return { datas, isDrag: true };
            },
        };
    },
};
/**
 * Whether or not target can be rotated. (default: false)
 * @name Moveable.Rotatable#rotatable
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.rotatable = true;
 */
/**
 * You can specify the position of the rotation. (default: "top")
 * @name Moveable.Rotatable#rotationPosition
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *   rotationPosition: "top",
 * });
 *
 * moveable.rotationPosition = "bottom"
 */

/**
 * throttle of angle(degree) when rotate.
 * @name Moveable.Rotatable#throttleRotate
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.throttleRotate = 1;
 */

/**
 * When the rotate starts, the rotateStart event is called.
 * @memberof Moveable.Rotatable
 * @event rotateStart
 * @param {Moveable.Rotatable.OnRotateStart} - Parameters for the rotateStart event
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
* @memberof Moveable.Rotatable
* @event rotate
* @param {Moveable.Rotatable.OnRotate} - Parameters for the rotate event
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
 * @memberof Moveable.Rotatable
 * @event rotateEnd
 * @param {Moveable.Rotatable.OnRotateEnd} - Parameters for the rotateEnd event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, { rotatable: true });
 * moveable.on("rotateEnd", ({ target, isDrag }) => {
 *     console.log(target, isDrag);
 * });
 */

/**
 * When the group rotate starts, the `rotateGroupStart` event is called.
 * @memberof Moveable.Rotatable
 * @event rotateGroupStart
 * @param {Moveable.Rotatable.OnRotateGroupStart} - Parameters for the `rotateGroupStart` event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *     target: [].slice.call(document.querySelectorAll(".target")),
 *     rotatable: true
 * });
 * moveable.on("rotateGroupStart", ({ targets }) => {
 *     console.log("onRotateGroupStart", targets);
 * });
 */

/**
* When the group rotate, the `rotateGroup` event is called.
* @memberof Moveable.Rotatable
* @event rotateGroup
* @param {Moveable.Rotatable.OnRotateGroup} - Parameters for the `rotateGroup` event
* @example
* import Moveable from "moveable";
*
* const moveable = new Moveable(document.body, {
*     target: [].slice.call(document.querySelectorAll(".target")),
*     rotatable: true
* });
* moveable.on("rotateGroup", ({ targets, events }) => {
*     console.log("onRotateGroup", targets);
*     events.forEach(ev => {
*         const target = ev.target;
*         // ev.drag is a drag event that occurs when the group rotate.
*         const left = ev.drag.beforeDist[0];
*         const top = ev.drag.beforeDist[1];
*         const deg = ev.beforeDist;
*     });
* });
*/

/**
 * When the group rotate finishes, the `rotateGroupEnd` event is called.
 * @memberof Moveable.Rotatable
 * @event rotateGroupEnd
 * @param {Moveable.Rotatable.OnRotateGroupEnd} - Parameters for the `rotateGroupEnd` event
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body, {
 *     target: [].slice.call(document.querySelectorAll(".target")),
 *     rotatable: true
 * });
 * moveable.on("rotateGroupEnd", ({ targets, isDrag }) => {
 *     console.log("onRotateGroupEnd", targets, isDrag);
 * });
 */
