import MoveableManager from "../MoveableManager";
import { Renderer, ClippableProps, OnClip, ClippableState } from "../types";
import { splitBracket, splitComma, splitUnit, splitSpace } from "@daybrush/utils";
import {
    prefix, caculatePosition, getDiagonalSize,
    fillParams, triggerEvent, caculateInversePosition, makeMatrixCSS, getRect
} from "../utils";
import { getRad, plus, minus, average } from "../matrix";
import { setDragStart, getDragDist } from "../DraggerUtils";
import { CLIP_DIRECTIONS, DIRECTIONS, DIRECTION_INDEXES } from "../consts";

function getSize(pos: string, size: number) {
    const { value, unit } = splitUnit(pos);

    return unit === "%" ? value * size / 100 : value;
}

function getClipPath(
    target: HTMLElement | SVGElement,
    width: number,
    height: number,
    customClip?: string,
) {
    let clipText: string | undefined = customClip;

    if (!clipText) {
        const style = getComputedStyle(target!);
        const clipPath = style.clipPath!;

        clipText = clipPath !== "none" ? clipPath : style.clip!;
    }
    if (!clipText || clipText === "none" || clipText === "auto") {
        return;
    }
    const { prefix: clipPrefix, value } = splitBracket(clipText);

    if (clipPrefix === "polygon") {
        const poses = splitComma(value!).map((pos, i) => {
            const [xPos, yPos] = pos.split(" ");

            return [
                getSize(xPos, width),
                getSize(yPos, height),
            ];
        });

        return {
            type: clipPrefix,
            clipText,
            poses,
        } as const;
    } else if (clipPrefix === "circle" || clipPrefix === "ellipse") {
        let xPos: string = "";
        let yPos: string = "";
        let radiusX = 0;
        let radiusY = 0;

        if (clipPrefix === "circle") {
            let radius = "";
            [radius, , xPos, yPos] = splitSpace(value!);

            radiusX = getSize(radius, Math.sqrt((width * width + height * height) / 2));
            radiusY = radiusX;
        } else {
            let xRadius = "";
            let yRadius = "";
            [xRadius, yRadius, , xPos, yPos] = splitSpace(value!);

            radiusX = getSize(xRadius, width);
            radiusY = getSize(yRadius, height);
        }
        const centerPos = [
            getSize(xPos, width),
            getSize(yPos, height),
        ];
        const poses = [
            centerPos,
            ...CLIP_DIRECTIONS.map(dir => [
                centerPos[0] + dir[0] * radiusX,
                centerPos[1] + dir[1] * radiusY,
            ]),
        ];
        return {
            type: clipPrefix,
            clipText,
            radiusX,
            radiusY,
            left: centerPos[0] - radiusX,
            top: centerPos[1] - radiusY,
            poses,
        } as const;
    } else if (clipPrefix === "rect") {
        // top right bottom left
        const [top, right, bottom, left] = splitComma(value!).map((pos, i) => {
            const { value: posValue } = splitUnit(pos);

            return posValue;
        });
        const poses = [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom],
        ];
        return {
            type: "rect",
            clipText,
            poses,
            top,
            right,
            bottom,
            left,
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
        pos1,
    } = moveable.state;
    const { left, top } = moveableClientRect;
    const n = is3d ? 4 : 3;
    const [posX, posY] = minus(caculateInversePosition(rootMatrix, [clientX - left, clientY - top], n), pos1);
    const [distX, distY] = getDragDist({ datas, distX: posX, distY: posY });
    const { clipPath, index } = e.datas;
    if (clipPath.type === "polygon") {
        const poses: number[][] = clipPath.poses.slice();

        poses.splice(index, 0, [distX, distY]);

        const clipStyles = poses.map(pos => `${pos[0]}px ${pos[1]}px`);
        triggerEvent<OnClip>(moveable, "onClip", fillParams<OnClip>(moveable, e, {
            clipType: "polygon",
            poses,
            clipStyles,
            clipStyle: `polygon(${clipStyles.join(", ")})`,
            changedIndexes: [],
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

        const clipStyles = poses.map(pos => `${pos[0]}px ${pos[1]}px`);
        triggerEvent<OnClip>(moveable, "onClip", fillParams<OnClip>(moveable, e, {
            clipType: "polygon",
            poses,
            clipStyles,
            clipStyle: `polygon(${clipStyles.join(", ")})`,
            changedIndexes: [],
            addedIndex: -1,
            removedIndex: index,
            distX: 0,
            distY: 0,
        }));
    }
}
export default {
    name: "clippable",
    props: {
        clipType: String,
        customClipArea: Object,
        clipRelative: Boolean,
        clippable: Boolean,
        clipArea: Boolean,
        dragWithClip: Boolean,
    },
    render(moveable: MoveableManager<ClippableProps, ClippableState>, React: Renderer) {
        const { defaultClipPath, clipArea, zoom } = moveable.props;
        const {
            target, width, height, matrix, is3d, left, top,
            pos1, pos2, pos3, pos4,
            clipPathState,
        } = moveable.state;

        if (!target) {
            return [];
        }

        const clipPath = getClipPath(target, width, height, clipPathState || defaultClipPath);

        if (!clipPath) {
            return [];
        }
        const n = is3d ? 4 : 3;
        const type = clipPath.type;
        const clipPoses = clipPath.poses.slice();
        const poses = clipPoses.map(pos => {
            // return [x, y];
            const caculatedPos = caculatePosition(matrix, pos, n);

            return [
                caculatedPos[0] - left,
                caculatedPos[1] - top,
            ];
        });

        let controls: any[] = [];
        let lines: any[] = [];
        let controlPoses: number[][] = [];

        if (type === "rect" || type === "polygon") {
            lines = poses.map((to, i) => {
                const from = i === 0 ? poses[poses.length - 1] : poses[i - 1];

                const rad = getRad(from, to);
                const dist = getDiagonalSize(from, to);
                return <div key={`clipLine${i}`} className={prefix("line", "clip-line")}
                    data-clip-index={i}
                    style={{
                        width: `${dist}px`,
                        transform: `translate(${from[0]}px, ${from[1]}px) rotate(${rad}rad)`,
                    }}></div>;
            });
        }
        if (type === "rect") {
            controlPoses = DIRECTIONS.map((direction, i) => {
                const indexes = DIRECTION_INDEXES[direction];
                const directionPoses = indexes.map(index => poses[index >= 2 ? 5 - index : index]);
                const pos = [0, 1].map(posIndex => average(...directionPoses.map(dPos => dPos[posIndex])));

                return pos;
            });
        } else if (type === "polygon" || type === "circle" || type === "ellipse") {
            controlPoses = poses;
        }

        controls = controlPoses.map((pos, i) => {
            return <div key={`clipControl${i}`}
                className={prefix("control", "clip-control")}
                data-clip-index={i}
                style={{
                    transform: `translate(${pos[0]}px, ${pos[1]}px)`,
                }}></div>;
        });
        if (type === "circle" || type === "ellipse") {
            const {
                left: clipLeft,
                top: clipTop,
                radiusX,
                radiusY,
            } = clipPath;

            const [distLeft, distTop] = minus(
                caculatePosition(matrix, [clipLeft!, clipTop!], n),
                caculatePosition(matrix, [0, 0], n),
            );
            let ellipseClipPath = "none";

            if (clipArea) {
                const piece = Math.max(10, radiusX! / 5, radiusY! / 5);
                const areaPoses: number[][] = [];

                for (let i = 0; i <= piece; ++i) {
                    const rad = Math.PI * 2 / piece * i;
                    areaPoses.push([
                        radiusX! + (radiusX! - zoom!) * Math.cos(rad),
                        radiusY! + (radiusY! - zoom!) * Math.sin(rad),
                    ]);
                }
                areaPoses.push([radiusX!, -2]);
                areaPoses.push([-2, -2]);
                areaPoses.push([-2, radiusY! * 2 + 2]);
                areaPoses.push([radiusX! * 2 + 2, radiusY! * 2 + 2]);
                areaPoses.push([radiusX! * 2 + 2, -2]);
                areaPoses.push([radiusX!, -2]);

                ellipseClipPath = `polygon(${areaPoses.map(pos => `${pos[0]}px ${pos[1]}px`).join(", ")})`;
            }
            controls.push(<div key="clipellipse" className={prefix("clip-ellipse")} style={{
                width: `${radiusX! * 2}px`,
                height: `${radiusY! * 2}px`,
                clipPath: ellipseClipPath,
                transform: `translate(${-left + distLeft}px, ${-top + distTop}px) ${makeMatrixCSS(matrix)}`,
            }}></div>);
        }
        if (clipArea) {
            const {
                width: allWidth,
                height: allHeight,
                left: allLeft,
                top: allTop,
            } = getRect([pos1, pos2, pos3, pos4, ...poses]);
            if (type === "polygon" || type === "rect") {
                controls.push(<div key="clipArea" className={prefix("clip-area")} style={{
                    width: `${allWidth}px`,
                    height: `${allHeight}px`,
                    transform: `translate(${allLeft}px, ${allTop}px)`,
                    clipPath: `polygon(${poses.map(pos => `${pos[0] - allLeft}px ${pos[1] - allTop}px`).join(", ")})`,
                }}></div>);
            }
        }
        return [
            ...controls,
            ...lines,
        ];
    },
    dragControlCondition(e: any) {
        return (e.inputEvent.target.className || "").indexOf("clip") > -1;
    },
    dragStart(moveable: MoveableManager<ClippableProps>, e: any) {
        const props = moveable.props;
        const {
            dragWithClip = true,
        } = props;

        if (dragWithClip == null) {
            return false;
        }

        return this.dragControlStart(moveable, e);
    },
    drag(moveable: MoveableManager<ClippableProps>, e: any) {
        return this.dragControl(moveable, e);
    },
    dragEnd(moveable: MoveableManager<ClippableProps>, e: any) {
        return this.dragControlEnd(moveable, e);
    },
    dragControlStart(moveable: MoveableManager<ClippableProps, ClippableState>, e: any) {
        const state = moveable.state;
        const { defaultClipPath } = moveable.props;
        const { target, width, height } = state;
        const inputTarget = e.inputEvent ? e.inputEvent.target : null;
        const className = inputTarget ? inputTarget.className : "";
        const datas = e.datas;
        const clipPath = getClipPath(target!, width, height, defaultClipPath);

        if (!clipPath) {
            return false;
        }
        datas.isControl = className.indexOf("clip-control") > -1;
        datas.isLine = className.indexOf("clip-line") > -1;
        datas.isArea = className.indexOf("clip-area") > -1 || className.indexOf("clip-ellipse") > -1;
        datas.index = parseInt(inputTarget ? inputTarget.getAttribute("data-clip-index") : "-1", 10);
        datas.clipPath = clipPath;

        setDragStart(moveable, e);

        state.clipPathState = clipPath.clipText;
        datas.isClipStart = true;
        return true;
    },
    dragControl(moveable: MoveableManager<ClippableProps, ClippableState>, e: any) {
        const { datas, originalDatas } = e;

        if (!datas.isClipStart) {
            return false;
        }

        const draggableData = (originalDatas && originalDatas.draggable) || {};
        const { isControl, isLine, isArea, index, clipPath } = datas as {
            clipPath: ReturnType<typeof getClipPath>,
            [key: string]: any,
        };
        if (!clipPath) {
            return false;
        }
        let [distX, distY] = draggableData.isDrag ? draggableData.prevDist : getDragDist(e);

        const isDragWithTarget = !isArea && !isControl && !isLine;
        const clipType = clipPath.type;
        const poses: number[][] = clipPath.poses.slice();
        let nextPoses: number[][] = poses.slice();
        let clipStyles: string[] = [];
        let splitter: string = ",";

        if (isDragWithTarget) {
            distX = -distX;
            distY = -distY;
        }
        const isCircle = clipType === "circle";
        const isEllipse = clipType === "ellipse";

        if (clipType === "polygon") {
            if (isControl) {
                nextPoses[index] = plus(poses[index], [distX, distY]);
            } else {
                poses.forEach((pos, i) => {
                    nextPoses[i] = plus(pos, [distX, distY]);
                });
            }
            clipStyles = poses.map(pos => `${pos[0]}px ${pos[1]}px`);
        } else if (clipType === "rect") {
            let { top, right, bottom, left } = clipPath as any;
            const direction = isControl ? DIRECTIONS[index] : "nwse";

            (direction.indexOf("n") > -1) && (top += distY);
            (direction.indexOf("s") > -1) && (bottom += distY);
            (direction.indexOf("e") > -1) && (right += distX);
            (direction.indexOf("w") > -1) && (left += distX);

            nextPoses = [
                [left, top],
                [right, top],
                [right, bottom],
                [left, bottom],
            ];

            clipStyles = [top, right, bottom, left].map(pos => `${pos}px`);
        } else if (isCircle || isEllipse) {
            let radiusX = clipPath.radiusX!;
            let radiusY = clipPath.radiusY!;

            if (index === 0 || isArea || isDragWithTarget) {
                poses.forEach((_, i) => {
                    nextPoses[i] = plus(poses[i], [distX, distY]);
                });
            } else {
                nextPoses[index] = plus(poses[index], [distX, distY]);
                const radius = getDiagonalSize(nextPoses[0], nextPoses[index]);

                if (isCircle) {
                    radiusX = radius;
                    radiusY = radius;
                } else {
                    if (index === 1 || index === 3) {
                        radiusY = radius;
                    } else {
                        radiusX = radius;
                    }
                }
                const centerPos = poses[0];
                nextPoses = [
                    centerPos,
                    ...CLIP_DIRECTIONS.map(dir => [
                        centerPos[0] + dir[0] * radiusX,
                        centerPos[1] + dir[1] * radiusY,
                    ]),
                ];
            }
            if (isCircle) {
                clipStyles = [`${radiusX}px`, "at", `${nextPoses[0][0]}px`, `${nextPoses[0][1]}px`];
            } else {
                clipStyles = [`${radiusX}px`, `${radiusY}px`, "at", `${nextPoses[0][0]}px`, `${nextPoses[0][1]}px`];
            }
            splitter = " ";
        } else {
            return false;
        }
        const indexes: number[] = [];
        const clipStyle = `${clipType}(${clipStyles.join(splitter)})`;

        nextPoses.forEach((pos, i) => {
            if (poses[i][0] !== pos[0] || poses[i][1] !== pos[1]) {
                indexes.push(i);
            }
        });

        moveable.state.clipPathState = clipStyle;
        triggerEvent<OnClip>(moveable, "onClip", fillParams<OnClip>(moveable, e, {
            clipType,
            poses: nextPoses,
            clipStyle,
            clipStyles,
            changedIndexes: indexes,
            addedIndex: -1,
            removedIndex: -1,
            distX,
            distY,
        }));
    },
    dragControlEnd(moveable: MoveableManager<ClippableProps, ClippableState>, e: any) {
        moveable.state.clipPathState = "";
        const { isLine, isControl } = e.datas;

        if (!e.datas.isClipStart) {
            return false;
        }

        if (e.isDouble) {
            if (isControl) {
                removeClipPath(moveable, e);
            } else if (isLine) {
                // add
                addClipPath(moveable, e);
            }
        }
    },
    unset(moveable: MoveableManager<ClippableProps, ClippableState>) {
        moveable.state.clipPathState = "";
    },
};
