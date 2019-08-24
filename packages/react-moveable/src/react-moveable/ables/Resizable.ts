import { getRad, throttle, getDirection, triggerEvent } from "../utils";
import { setDragStart, getDragDist } from "../DraggerUtils";
import { ResizableProps, OnResizeGroup, OnResizeGroupEnd } from "../types";
import MoveableManager from "../MoveableManager";
import { renderAllDirection, renderDiagonalDirection } from "../renderDirection";
import MoveableGroup from "../MoveableGroup";
import { triggerChildAble, setCustomEvent, getCustomEvent, directionCondition } from "../groupUtils";
import Draggable from "./Draggable";

export default {
    name: "resizable",
    dragControlOnly: true,
    updateRect: true,
    canPinch: true,

    render(moveable: MoveableManager<Partial<ResizableProps>>): any[] | undefined {
        const { resizable, edge } = moveable.props;
        if (resizable) {
            if (edge) {
                return renderDiagonalDirection(moveable);
            }
            return renderAllDirection(moveable);
        }
    },
    dragControlCondition: directionCondition,
    dragControlStart(
        moveable: MoveableManager<ResizableProps>,
        e: any,
    ) {
        const {
            inputEvent: {
                target: inputTarget,
            },
            pinchFlag,
        } = e;

        const direction = pinchFlag ? [1, 1] : getDirection(inputTarget);
        const { target, width, height } = moveable.state;
        const { clientX, clientY, datas } = e;

        if (!direction || !target) {
            return false;
        }
        !pinchFlag && setDragStart(moveable, { datas });

        datas.datas = {};
        datas.direction = direction;
        datas.width = width;
        datas.height = height;
        datas.prevWidth = 0;
        datas.prevHeight = 0;

        const result = triggerEvent(moveable, "onResizeStart", {
            datas: datas.datas,
            target,
            clientX,
            clientY,
        });
        if (result !== false) {
            datas.isResize = true;
        }
        return datas.isResize;
    },
    dragControl(
        moveable: MoveableManager<ResizableProps>,
        { datas, clientX, clientY, distX, distY, pinchFlag, parentDistance, parentScale }: any,
    ) {
        const {
            direction,
            width,
            height,
            prevWidth,
            prevHeight,
            isResize,
        } = datas;

        if (!isResize) {
            return;
        }
        const {
            keepRatio,
            throttleResize = 0,
            parentMoveable,
        } = moveable.props;
        const {
            target,
        } = moveable.state;

        let distWidth: number = 0;
        let distHeight: number = 0;

        // diagonal
        if (parentScale) {
            distWidth = (parentScale - 1) * width;
            distHeight = (parentScale - 1) * height;
        } else if (pinchFlag) {
            if (parentDistance) {
                distWidth = parentDistance;
                distHeight = parentDistance * height / width;
            }
        } else {
            const dist = getDragDist({ datas, distX, distY });

            distWidth = direction[0] * dist[0];
            distHeight = direction[1] * dist[1];
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
        }
        distWidth = throttle(distWidth, throttleResize!);
        distHeight = throttle(distHeight, throttleResize!);

        const nextWidth = width + distWidth;
        const nextHeight = height + distHeight;
        const delta = [distWidth - prevWidth, distHeight - prevHeight];

        datas.prevWidth = distWidth;
        datas.prevHeight = distHeight;

        if (!parentMoveable && delta.every(num => !num)) {
            return;
        }
        const params = {
            target: target!,
            width: nextWidth,
            height: nextHeight,
            direction,
            dist: [distWidth, distHeight],
            datas: datas.datas,
            delta,
            clientX,
            clientY,
            isPinch: !!pinchFlag,
        };
        triggerEvent(moveable, "onResize", params);
        return params;
    },
    dragControlEnd(moveable: MoveableManager<ResizableProps>, { datas, isDrag, clientX, clientY }: any) {
        if (!datas.isResize) {
            return false;
        }
        datas.isResize = false;

        triggerEvent(moveable, "onResizeEnd", {
            target: moveable.state.target!,
            datas: datas.datas,
            clientX,
            clientY,
            isDrag,
        });
        return isDrag;
    },
    dragGroupControlCondition: directionCondition,
    dragGroupControlStart(moveable: MoveableGroup, e: any) {
        const { clientX, clientY, datas, inputEvent } = e;
        const {
            left: parentLeft,
            top: parentTop,
        } = moveable.state;

        const enabledEvents = triggerChildAble(
            moveable,
            this,
            "dragControlStart",
            { ...e, parentRotate: 0 },
            (child, childDatas) => {
                const { left, top } = child.state;
                const dragDatas = childDatas.drag || (childDatas.drag = {});

                Draggable.dragStart(
                    child,
                    setCustomEvent(left - parentLeft, top - parentTop, dragDatas, inputEvent),
                );
            },
        );

        if (enabledEvents.every(ev => !ev)) {
            return false;
        }
        this.dragControlStart(moveable, e);

        const result = triggerEvent(moveable, "onResizeGroupStart", {
            targets: moveable.props.targets!,
            clientX,
            clientY,
            datas: datas.datas,
        });

        datas.isResize = result !== false;
        return datas.isResize;
    },
    dragGroupControl(moveable: MoveableGroup, e: any) {
        const { inputEvent, datas } = e;
        if (!datas.isResize) {
            return;
        }
        const params = this.dragControl(moveable, e);

        if (!params) {
            return;
        }
        const { width, height, dist } = params;
        const parentScale = [
            width / (width - dist[0]),
            height / (height - dist[1]),
        ];

        const events = triggerChildAble(
            moveable,
            this,
            "dragControl",
            { ...e, parentScale },
            (child, childDatas, result) => {
                const dragDatas = childDatas.drag || (childDatas.drag = {});
                const { startX, startY } = getCustomEvent(dragDatas);
                const clientX = parentScale[0] * startX;
                const clientY = parentScale[1] * startY;

                const dragResult = Draggable.drag(
                    child,
                    setCustomEvent(clientX, clientY, dragDatas, inputEvent),
                );

                result.drag = dragResult;
            },
        );
        const nextParams: OnResizeGroup = {
            targets: moveable.props.targets!,
            events,
            ...params,
        };

        triggerEvent(moveable, "onResizeGroup", nextParams);
        return nextParams;
    },
    dragGroupControlEnd(moveable: MoveableGroup, e: any) {
        const { clientX, clientY, isDrag, datas } = e;

        if (!datas.isResize) {
            return;
        }

        this.dragControlEnd(moveable, e);
        triggerChildAble(moveable, this, "dragControlEnd", e);

        const nextParams: OnResizeGroupEnd = {
            targets: moveable.props.targets!,
            clientX,
            clientY,
            isDrag,
            datas: datas.datas,
        };

        triggerEvent(moveable, "onResizeGroupEnd", nextParams);
        return isDrag;
    },
};
