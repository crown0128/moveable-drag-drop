import { getRad, throttle, getDirection, triggerEvent } from "../utils";
import { MIN_SCALE } from "../consts";
import { setDragStart, getDragDist } from "../DraggerUtils";
import MoveableManager from "../MoveableManager";
import { renderAllDirection, renderDiagonalDirection } from "../renderDirection";
import { ScalableProps, ResizableProps, OnScaleGroup, OnScaleGroupEnd } from "../types";
import { directionCondition, triggerChildAble, setCustomEvent, getCustomEvent } from "../groupUtils";
import MoveableGroup from "../MoveableGroup";
import Draggable from "./Draggable";
import { rotate } from "../matrix";

export default {
    name: "scalable",
    dragControlOnly: true,
    canPinch: true,

    render(moveable: MoveableManager<Partial<ResizableProps & ScalableProps>>): any[] | undefined {
        const { resizable, scalable, edge } = moveable.props;
        if (!resizable && scalable) {
            if (edge) {
                return renderDiagonalDirection(moveable);
            }
            return renderAllDirection(moveable);
        }
    },
    dragControlCondition: directionCondition,
    dragControlStart(
        moveable: MoveableManager<ScalableProps>,
        { datas, clientX, clientY, pinchFlag, inputEvent: { target: inputTarget } }: any) {

        const direction = pinchFlag ? [1, 1] : getDirection(inputTarget);
        const {
            width,
            height,
            targetTransform,
            target,
        } = moveable.state;

        if (!direction || !target) {
            return false;
        }
        if (!pinchFlag) {
            setDragStart(moveable, { datas });
        }

        datas.datas = {};
        datas.transform = targetTransform;
        datas.prevDist = [1, 1];
        datas.direction = direction;
        datas.width = width;
        datas.height = height;

        const result = triggerEvent(moveable, "onScaleStart", {
            target,
            clientX,
            clientY,
            datas: datas.datas,
        });
        if (result !== false) {
            datas.isScale = true;
        }
        return datas.isScale;
    },
    dragControl(
        moveable: MoveableManager<ScalableProps>,
        { datas, clientX, clientY, distX, distY, parentScale, parentDistance, pinchFlag }: any) {
        const {
            prevDist,
            direction,
            width,
            height,
            transform,
            isScale,
        } = datas;

        if (!isScale) {
            return false;
        }
        const { keepRatio, throttleScale, parentMoveable } = moveable.props;
        const target = moveable.state.target;

        let scaleX: number = 1;
        let scaleY: number = 1;
        if (parentScale) {
            scaleX = parentScale[0];
            scaleY = parentScale[1];
        } else if (pinchFlag) {
            if (parentDistance) {
                scaleX = (width + parentDistance) / width;
                scaleY = (height + parentDistance * height / width) / height;
            }
        } else {
            const dist = getDragDist({ datas, distX, distY });
            let distWidth = direction[0] * dist[0];
            let distHeight = direction[1] * dist[1];

            // diagonal
            if (
                keepRatio
                && direction[0] && direction[1]
                && width && height
            ) {
                const size = Math.sqrt(distWidth * distWidth + distHeight * distHeight);
                const rad = getRad([0, 0], dist);
                const standardRad = getRad([0, 0], direction);
                const distDiagonal = Math.cos(rad - standardRad) * size;

                distWidth = distDiagonal;
                distHeight = distDiagonal * height / width;
            }
            const nextWidth = width + distWidth;
            const nextHeight = height + distHeight;
            scaleX = nextWidth / width;
            scaleY = nextHeight / height;
        }
        scaleX = throttle(scaleX, throttleScale!);
        scaleY = throttle(scaleY, throttleScale!);

        if (scaleX === 0) {
            scaleX = (prevDist[0] > 0 ? 1 : -1) * MIN_SCALE;
        }
        if (scaleY === 0) {
            scaleY = (prevDist[1] > 0 ? 1 : -1) * MIN_SCALE;
        }
        const nowScale = [scaleX, scaleY];
        datas.prevDist = nowScale;

        if (scaleX === prevDist[0] && scaleY === prevDist[1] && !parentMoveable) {
            return false;
        }

        const params = {
            target: target!,
            scale: nowScale,
            direction,
            dist: [scaleX - 1, scaleY - 1],
            delta: [scaleX / prevDist[0], scaleY / prevDist[1]],
            transform: `${transform} scale(${scaleX}, ${scaleY})`,
            clientX,
            clientY,
            datas: datas.datas,
            isPinch: !!pinchFlag,
        };
        triggerEvent(moveable, "onScale", params);

        return params;
    },
    dragControlEnd(
        moveable: MoveableManager<ScalableProps>,
        { datas, isDrag, clientX, clientY, pinchFlag }: any) {
        if (!datas.isScale) {
            return false;
        }

        datas.isScale = false;

        triggerEvent(moveable, "onScaleEnd", {
            target: moveable.state.target!,
            isDrag,
            clientX,
            clientY,
            datas: datas.datas,
        });
        return isDrag;
    },
    dragGroupControlCondition: directionCondition,
    dragGroupControlStart(moveable: MoveableGroup, e: any) {
        const { clientX, clientY, datas, inputEvent } = e;
        const {
            left: parentLeft,
            top: parentTop,
            origin: parentOrigin,
        } = moveable.state;

        const parentAbsoluteOrigin = [
            parentLeft + parentOrigin[0],
            parentTop + parentOrigin[1],
        ];

        datas.rotation = moveable.rotation;
        const enabledEvents = triggerChildAble(
            moveable,
            this,
            "dragControlStart",
            e,
            (child, childDatas) => {
                const { left, top, origin } = child.state;
                const dragDatas = childDatas.drag || (childDatas.drag = {});

                Draggable.dragStart(
                    child,
                    setCustomEvent(
                        left + origin[0] - parentAbsoluteOrigin[0],
                        top + origin[1] - parentAbsoluteOrigin[1],
                        dragDatas,
                        inputEvent,
                    ),
                );
            },
        );

        if (enabledEvents.every(ev => !ev)) {
            return false;
        }

        this.dragControlStart(moveable, e);

        const result = triggerEvent(moveable, "onScaleGroupStart", {
            targets: moveable.props.targets!,
            clientX,
            clientY,
            datas: datas.datas,
        });

        datas.isScale = result !== false;
        return datas.isScale;
    },
    dragGroupControl(moveable: MoveableGroup, e: any) {
        const { inputEvent, datas } = e;
        if (!datas.isScale) {
            return;
        }
        const params = this.dragControl(moveable, e);
        if (!params) {
            return;
        }
        const { scale} = params;

        const events = triggerChildAble(
            moveable,
            this,
            "dragControl",
            { ...e, parentScale: scale },
            (child, childDatas, result) => {
                const dragDatas = childDatas.drag || (childDatas.drag = {});
                const { startX, startY } = getCustomEvent(dragDatas);
                const startPos = rotate([
                    startX,
                    startY,
                ], -datas.rotation);
                const [clientX, clientY] = rotate([
                    startPos[0] * scale[0],
                    startPos[1] * scale[1],
                ], moveable.rotation);

                const dragResult = Draggable.drag(
                    child,
                    setCustomEvent(clientX, clientY, dragDatas, inputEvent),
                );

                result.drag = dragResult;
            },
        );
        const nextParams: OnScaleGroup = {
            targets: moveable.props.targets!,
            events,
            ...params,
        };

        triggerEvent(moveable, "onScaleGroup", nextParams);
        return nextParams;
    },
    dragGroupControlEnd(moveable: MoveableGroup, e: any) {
        const { clientX, clientY, isDrag, datas } = e;

        if (!datas.isScale) {
            return;
        }
        this.dragControlEnd(moveable, e);
        triggerChildAble(moveable, this, "dragControlEnd", e);

        const nextParams: OnScaleGroupEnd = {
            targets: moveable.props.targets!,
            clientX,
            clientY,
            isDrag,
            datas: datas.datas,
        };

        triggerEvent(moveable, "onScaleGroupEnd", nextParams);
        return isDrag;
    },
};
