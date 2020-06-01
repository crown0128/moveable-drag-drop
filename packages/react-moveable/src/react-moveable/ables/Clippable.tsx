import MoveableManager from "../MoveableManager";
import { Renderer, ClippableProps, OnClip } from "../types";
import { splitBracket, splitComma, splitUnit } from "@daybrush/utils";
import {
    prefix, caculatePosition, getDiagonalSize,
    fillParams, triggerEvent, getRect, caculateInversePosition
} from "../utils";
import { getRad, plus, minus } from "@moveable/matrix";
import { setDragStart, getDragDist } from "../DraggerUtils";

function getClipPath(target: HTMLElement | SVGElement, width: number, height: number) {
    const clipPath = getComputedStyle(target!).clipPath!;

    if (!clipPath || clipPath === "none") {
        return;
    }
    const { prefix: clipPrefix, value } = splitBracket(clipPath);
    if (clipPrefix === "polygon") {
        const poses = splitComma(value!).map((pos, i) => {
            const [xPos, yPos] = pos.split(" ");
            const { value: xValue, unit: xUnit } = splitUnit(xPos);
            const { value: yValue, unit: yUnit } = splitUnit(yPos);

            const x = xUnit === "%" ? xValue * width / 100 : xValue;
            const y = yUnit === "%" ? yValue * height / 100 : yValue;

            return [x, y];
        });

        return {
            type: "polygon",
            poses,
        } as const;
    }
    return;
}
function addClipPath(moveable: MoveableManager<ClippableProps>, e: any) {
    const { clientX, clientY, datas } = e;
    const {
        moveableClientRect,
        rootMatrix,
        is3d,
        pos1, pos2, pos3, pos4,
    } = moveable.state;
    const { left, top } = moveableClientRect;
    const {
        left: relativeLeft,
        top: relativeTop,
    } = getRect([pos1, pos2, pos3, pos4]);
    const n = is3d ? 4 : 3;
    const [posX, posY] = minus(caculateInversePosition(rootMatrix, [clientX - left, clientY - top], n), pos1);
    const [distX, distY] = getDragDist({ datas, distX: posX, distY: posY });
    const { clipPath, index } = e.datas;
    if (clipPath.type === "polygon") {
        const poses: number[][] = clipPath.poses.slice();

        poses.splice(index, 0, [distX, distY]);
        triggerEvent(moveable, "onClip", fillParams<OnClip>(moveable, e, {
            clipType: "polygon",
            poses,
            clipPath: `polygon(${poses.map(pos => `${pos[0]}px ${pos[1]}px`).join(", ")})`,
            changedIndex: -1,
            addedIndex: index,
            removedIndex: -1,
            distX: 0,
            distY: 0,
        }));
    }
}
function removeClipPath(moveable: MoveableManager<ClippableProps>, e: any) {
    const { clipPath, index } = e.datas;
    if (clipPath.type === "polygon") {
        const poses: number[][] = clipPath.poses.slice();

        poses.splice(index, 1);
        triggerEvent(moveable, "onClip", fillParams<OnClip>(moveable, e, {
            clipType: "polygon",
            poses,
            clipPath: `polygon(${poses.map(pos => `${pos[0]}px ${pos[1]}px`).join(", ")})`,
            changedIndex: -1,
            addedIndex: -1,
            removedIndex: index,
            distX: 0,
            distY: 0,
        }));
    }
}
export default {
    name: "clippable",
    render(moveable: MoveableManager<ClippableProps>, React: Renderer) {
        const { target, width, height, matrix, is3d, left, top } = moveable.state;

        if (!target) {
            return [];
        }

        const clipPath = getClipPath(target, width, height);

        if (!clipPath) {
            return [];
        }
        const n = is3d ? 4 : 3;

        if (clipPath.type === "polygon") {
            const poses = clipPath.poses.map(pos => {
                // return [x, y];
                const caculatedPos = caculatePosition(matrix, pos, n);

                return [
                    caculatedPos[0] - left,
                    caculatedPos[1] - top,
                ];
            });
            return [
                ...poses.map(([x, y], i) => {
                    return <div key={`clipControl${i}`}
                        className={prefix("control", "clip-control")}
                        data-clip-index={i}
                        style={{
                            left: `${x}px`,
                            top: `${y}px`,
                        }}></div>;
                }),
                ...poses.map((to, i) => {
                    const from = i === 0 ? poses[poses.length - 1] : poses[i - 1];

                    const rad = getRad(from, to);
                    const dist = getDiagonalSize(from, to);
                    return <div key={`clipLine${i}`} className={prefix("line", "clip-line")}
                        data-clip-index={i}
                        style={{
                            width: `${dist}px`,
                            left: `${from[0]}px`,
                            top: `${from[1]}px`,
                            transform: `rotate(${rad}rad)`,
                        }}></div>;
                }),
            ];
        }

        return [];
    },
    dragControlCondition(e: any) {
        return (e.inputEvent.target.className || "").indexOf("clip") > -1;
    },
    dragControlStart(moveable: MoveableManager<ClippableProps>, e: any) {
        const { target, width, height } = moveable.state;
        const inputTarget = e.inputEvent.target;
        const className = inputTarget.className;
        const datas = e.datas;

        datas.isControl = className.indexOf("clip-control") > -1;
        datas.isLine = className.indexOf("clip-line") > -1;
        datas.index = inputTarget.getAttribute("data-clip-index");
        datas.clipPath = getClipPath(target!, width, height);

        setDragStart(moveable, e);

        datas.isClipStart = true;
        return true;
    },
    dragControl(moveable: MoveableManager<ClippableProps>, e: any) {
        const datas = e.datas;

        if (!datas.isClipStart) {
            return false;
        }
        const { isControl, isLine, index, clipPath } = datas;
        const [distX, distY] = getDragDist(e);

        if (isControl) {
            if (clipPath.type === "polygon") {
                const poses: number[][] = clipPath.poses.slice();

                poses[index] = plus(poses[index], [distX, distY]);

                triggerEvent(moveable, "onClip", fillParams<OnClip>(moveable, e, {
                    clipType: "polygon",
                    poses,
                    clipPath: `polygon(${poses.map(pos => `${pos[0]}px ${pos[1]}px`).join(", ")})`,
                    changedIndex: index,
                    addedIndex: -1,
                    removedIndex: -1,
                    distX,
                    distY,
                }));
            }
        }
    },
    dragControlEnd(moveable: MoveableManager<ClippableProps>, e: any) {
        const target = e.inputEvent.target;
        const className = target.className;

        if (!e.datas.isClipStart) {
            return false;
        }

        if (e.isDouble) {
            if (className.indexOf("clip-control") > -1) {
                removeClipPath(moveable, e);
            } else if (className.indexOf("clip-line") > -1) {
                // add
                addClipPath(moveable, e);
            }
        }
    },
};
