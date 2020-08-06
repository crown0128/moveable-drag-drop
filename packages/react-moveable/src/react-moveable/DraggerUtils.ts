import {
    invert, caculate, minus, plus,
    convertPositionMatrix, average,
    createScaleMatrix, multiply, fromTranslation, convertDimension, convertMatrixtoCSS,
} from "./matrix";
import { caculatePoses, getAbsoluteMatrix, getAbsolutePosesByState, caculatePosition } from "./utils";
import { splitUnit, isArray, splitSpace, isUndefined, findIndex } from "@daybrush/utils";
import {
    MoveableManagerState, ResizableProps, MoveableManagerInterface,
    OnTransformEvent, OnTransformStartEvent, DraggableProps, OnDrag
} from "./types";
import { getTransform, stringToMatrixInfo, valueToMatrix } from "./ables/utils";
import Draggable from "./ables/Draggable";
import { setCustomDrag } from "./CustomDragger";

export function setDragStart(moveable: MoveableManagerInterface<any>, { datas }: any) {
    const {
        matrix,
        beforeMatrix,
        is3d,
        left,
        top,
        origin,
        offsetMatrix,
        targetMatrix,
        transformOrigin,
    } = moveable.state;
    const n = is3d ? 4 : 3;

    datas.is3d = is3d;
    datas.matrix = matrix;
    datas.targetMatrix = targetMatrix;
    datas.beforeMatrix = beforeMatrix;
    datas.offsetMatrix = offsetMatrix;
    datas.transformOrigin = transformOrigin;
    datas.inverseMatrix = invert(matrix, n);
    datas.inverseBeforeMatrix = invert(beforeMatrix, n);
    datas.absoluteOrigin = convertPositionMatrix(plus([left, top], origin), n);
    datas.startDragBeforeDist = caculate(datas.inverseBeforeMatrix, datas.absoluteOrigin, n);
    datas.startDragDist = caculate(datas.inverseMatrix, datas.absoluteOrigin, n);
}
export function resolveTransformEvent(event: any, functionName: string) {
    const {
        resolveNextTransform,
        resolveTransformIndexes,
        datas,
    } = event;
    if (resolveNextTransform) {
        const index = datas.transformAppendIndex;
        const nextIndex = index + resolveTransformIndexes.filter((i: number) => i < index).length;

        setTransformStart(datas, resolveNextTransform, functionName, nextIndex);

        if (datas.isAppendTransform) {
            datas.transformAppendedIndexes = [...resolveTransformIndexes, nextIndex];
        }
    }
}

export function setDefaultTransformStart(
    moveable: MoveableManagerInterface, datas: any, functionName: string, index: number = -1) {
    const {
        is3d,
        targetMatrix,
    } = moveable.state;
    const cssMatrix = is3d
        ? `matrix3d(${targetMatrix.join(",")})`
        : `matrix(${convertMatrixtoCSS(targetMatrix, true)})`;
    return setTransformStart(datas, cssMatrix, functionName, index);
}

export function setTransformStart(datas: any, transform: string | string[], functionName: string, index?: number) {
    const transforms = (isArray(transform) ? transform : splitSpace(transform));

    if (isUndefined(index)) {
        index = findIndex(transforms, v => v.indexOf(functionName) === 0);
    }
    const result = getTransform(transform, index);

    datas.transformFormat = (value: any) => {
        return `${datas.beforeFunctionTexts.join(" ")} ${value} ${datas.afterFunctionTexts.join(" ")}`;
    };

    datas.transformIndex = index;
    datas.transformAppendIndex = index < 0 ? result.transforms.length : index;
    datas.transformAppendedIndexes = [];

    datas.targetAllTransform = multiply(
        result.beforeFunctionMatrix as number[],
        result.afterFunctionMatrix as number[], 4);
    datas.beforeFunctionTexts = result.beforeFunctionTexts;
    datas.afterFunctionTexts = result.afterFunctionTexts;
    datas.beforeTransform = result.beforeFunctionMatrix;
    datas.targetTansform = result.targetFunctionMatrix;
    datas.afterTransform = result.afterFunctionMatrix;

    const targetFunction = result.targetFunction;

    const matFunctionName = functionName === "rotate" ? "rotateZ" : functionName;

    if (targetFunction.functionName === matFunctionName) {
        datas.startValue = targetFunction.functionValue;
        datas.afterFunctionTexts.splice(0, 1);
        datas.isAppendTransform = false;
    } else {
        datas.transformAppendedIndexes.push(datas.transformAppendIndex);
        datas.isAppendTransform = true;
    }

    return result;
}
export function convertTransformFormat(datas: any, value: any, dist: any) {
    return datas.transformFormat(datas.isAppendTransform ? dist : value);
}
export function getTransformDist({ datas, distX, distY }: any) {
    const [bx, by] = getBeforeDragDist({ datas, distX, distY });
    const n = datas.is3d ? 4 : 3;
    // B * [tx, ty] * A = [bx, by] * targetMatrix;
    // [tx, ty] = B-1 * [bx, by] * targetMatrix * A-1 * [0, 0];

    const res = getTransfromMatrix(datas, fromTranslation([bx, by], n));

    return caculate(res, convertPositionMatrix([0, 0, 0], n), n);
}
export function getTransfromMatrix(datas: any, beforeTargetMatrix: number[]) {
    const {
        is3d,
        beforeTransform,
        afterTransform,
        targetAllTransform,
    } = datas;

    // B * afterTargetMatrix * A = beforeTargetMatrix * targetAllMatrix
    // afterTargetMatrix = B-1 * beforeTargetMatrix * targetAllMatrix * A-1

    const n = is3d ? 4 : 3;
    // res1 = B-1 * beforeTargetMatrix
    const res1 = multiply(invert(convertDimension(beforeTransform, 4, n), n), beforeTargetMatrix, n);
    // res2 = res1 * targetMatrix
    const res2 = multiply(res1, convertDimension(targetAllTransform, 4, n), n);

    // res3 = res2 * A-1
    const afterTargetMatrix = multiply(res2, invert(convertDimension(afterTransform, 4, n), n), n);
    return afterTargetMatrix;
}
export function getBeforeDragDist({ datas, distX, distY }: any) {
    // TT = BT
    const {
        inverseBeforeMatrix,
        is3d,
        startDragBeforeDist,
        absoluteOrigin,
    } = datas;
    const n = is3d ? 4 : 3;

    // ABS_ORIGIN * [distX, distY] = BM * (ORIGIN + [tx, ty])
    // BM -1 * ABS_ORIGIN * [distX, distY] - ORIGIN = [tx, ty]
    return minus(
        caculate(
            inverseBeforeMatrix,
            plus(absoluteOrigin, [distX, distY]),
            n,
        ),
        startDragBeforeDist,
    );
}
export function getDragDist({ datas, distX, distY }: any, isBefore?: boolean) {
    const {
        inverseBeforeMatrix,
        inverseMatrix,
        is3d,
        startDragBeforeDist,
        startDragDist,
        absoluteOrigin,
    } = datas;
    const n = is3d ? 4 : 3;

    return minus(
        caculate(
            isBefore ? inverseBeforeMatrix : inverseMatrix,
            plus(absoluteOrigin, [distX, distY]),
            n,
        ),
        isBefore ? startDragBeforeDist : startDragDist,
    );
}
export function getInverseDragDist({ datas, distX, distY }: any, isBefore?: boolean) {
    const {
        beforeMatrix,
        matrix,
        is3d,
        startDragBeforeDist,
        startDragDist,
        absoluteOrigin,
    } = datas;
    const n = is3d ? 4 : 3;

    return minus(
        caculate(
            isBefore ? beforeMatrix : matrix,
            plus(isBefore ? startDragBeforeDist : startDragDist, [distX, distY]),
            n,
        ),
        absoluteOrigin,
    );
}

export function caculateTransformOrigin(
    transformOrigin: string[],
    width: number,
    height: number,
    prevWidth: number = width,
    prevHeight: number = height,
    prevOrigin: number[] = [0, 0],
) {

    if (!transformOrigin) {
        return prevOrigin;
    }
    return transformOrigin.map((pos, i) => {
        const { value, unit } = splitUnit(pos);

        const prevSize = (i ? prevHeight : prevWidth);
        const size = (i ? height : width);
        if (pos === "%" || isNaN(value)) {
            // no value but %

            const measureRatio = prevSize ? prevOrigin[i] / prevSize : 0;

            return size * measureRatio;
        } else if (unit !== "%") {
            return value;
        }
        return size * value / 100;
    });
}
export function getPosIndexesByDirection(direction: number[]) {
    const indexes: number[] = [];

    if (direction[1] >= 0) {
        if (direction[0] >= 0) {
            indexes.push(3);
        }
        if (direction[0] <= 0) {
            indexes.push(2);
        }
    }
    if (direction[1] <= 0) {
        if (direction[0] >= 0) {
            indexes.push(1);
        }
        if (direction[0] <= 0) {
            indexes.push(0);
        }
    }
    return indexes;
}
export function getPosesByDirection(
    poses: number[][],
    direction: number[],
) {
    /*
    [-1, -1](pos1)       [0, -1](pos1,pos2)       [1, -1](pos2)
    [-1, 0](pos1, pos3)                           [1, 0](pos2, pos4)
    [-1, 1](pos3)        [0, 1](pos3, pos4)       [1, 1](pos4)
    */
    return getPosIndexesByDirection(direction).map(index => poses[index]);
}
export function getPosByDirection(
    poses: number[][],
    direction: number[],
) {
    /*
    [-1, -1](pos1)       [0, -1](pos1,pos2)       [1, -1](pos2)
    [-1, 0](pos1, pos3)                           [1, 0](pos2, pos4)
    [-1, 1](pos3)        [0, 1](pos3, pos4)       [1, 1](pos4)
    */
    const nextPoses = getPosesByDirection(poses, direction);

    return [
        average(...nextPoses.map(pos => pos[0])),
        average(...nextPoses.map(pos => pos[1])),
    ];
}
export function getPosByReverseDirection(
    poses: number[][],
    direction: number[],
) {
    /*
    [-1, -1](pos4)       [0, -1](pos3,pos4)       [1, -1](pos3)
    [-1, 0](pos2, pos4)                           [1, 0](pos3, pos1)
    [-1, 1](pos2)        [0, 1](pos1, pos2)       [1, 1](pos1)
    */

    return getPosByDirection(poses, direction.map(dir => -dir));
}

function getDist(
    startPos: number[],
    matrix: number[],
    width: number,
    height: number,
    n: number,
    direction: number[],
) {
    const poses = caculatePoses(matrix, width, height, n);
    const pos = getPosByReverseDirection(poses, direction);
    const distX = startPos[0] - pos[0];
    const distY = startPos[1] - pos[1];

    return [distX, distY];
}
export function getNextMatrix(
    offsetMatrix: number[],
    targetMatrix: number[],
    origin: number[],
    n: number,
) {
    return multiply(
        offsetMatrix,
        getAbsoluteMatrix(targetMatrix, n, origin),
        n,
    );
}
export function getNextTransformMatrix(
    state: MoveableManagerState<any>,
    datas: any,
    transform: string,
) {
    const {
        transformOrigin,
        offsetMatrix,
        is3d,
    } = state;
    const {
        beforeTransform,
        afterTransform,
    } = datas;
    const n = is3d ? 4 : 3;
    const targetTransform = valueToMatrix(stringToMatrixInfo([transform]));

    return getNextMatrix(
        offsetMatrix,
        convertDimension(multiply(multiply(beforeTransform, targetTransform as any, 4), afterTransform, 4), 4, n),
        transformOrigin,
        n,
    );
}
export function scaleMatrix(
    state: MoveableManagerState<any>,
    scale: number[],
) {
    const {
        transformOrigin,
        offsetMatrix,
        is3d,
        targetMatrix,
    } = state;
    const n = is3d ? 4 : 3;

    return getNextMatrix(
        offsetMatrix,
        multiply(targetMatrix, createScaleMatrix(scale, n), n),
        transformOrigin,
        n,
    );
}
export function getScaleDelta(
    moveable: MoveableManagerInterface<any>,
    scale: number[],
    direction: number[],
    fixedPosition: number[],
) {
    const state = moveable.state;
    const {
        is3d,
        left,
        top,
        width,
        height,
    } = state;

    const n = is3d ? 4 : 3;
    const groupable = moveable.props.groupable;
    const nextMatrix = scaleMatrix(moveable.state, scale);
    const groupLeft = groupable ? left : 0;
    const groupTop = groupable ? top : 0;

    const dist = getDist(fixedPosition, nextMatrix, width, height, n, direction);

    return minus(dist, [groupLeft, groupTop]);
}

export function fillTransformStartEvent(datas: any, functionName: string): OnTransformStartEvent {
    return {
        setTransform: (transform: string | string[], index?: number) => {
            setTransformStart(datas, transform, functionName, index);
        },
        setTransformIndex: (transformIndex: number) => {
            if (transformIndex < 0) {
                return;
            }
            datas.transformIndex = transformIndex;
            datas.transformAppendIndex = transformIndex;
        },
    };
}
export function fillTransformEvent(
    moveable: MoveableManagerInterface<DraggableProps>,
    nextTransform: string,
    delta: number[],
    isPinch: boolean,
    inputEvent: any,
    datas: any,
): OnTransformEvent {
    return {
        transform: nextTransform,
        drag: Draggable.drag(
            moveable,
            {
                ...setCustomDrag(moveable.state, delta, inputEvent, isPinch, false),
                resolveNextTransform: nextTransform,
                resolveTransformIndexes: datas.transformAppendedIndexes,
            },
        ) as OnDrag,
    };
}
export function getTranslateDist(
    moveable: MoveableManagerInterface<any>,
    transform: string,
    fixedPosition: number[],
    fixedDirection: number[],
    datas: any,
) {
    const state = moveable.state;
    const {
        left,
        top,
    } = state;

    const groupable = moveable.props.groupable;
    const nextMatrix = getNextTransformMatrix(moveable.state, datas, transform);
    const groupLeft = groupable ? left : 0;
    const groupTop = groupable ? top : 0;
    // const dist = getDist(fixedPosition, nextMatrix, width, height, n, direction);
    const nextFixedPosition = getDirectionOffset(moveable, fixedDirection, nextMatrix);
    const dist = minus(fixedPosition, nextFixedPosition);
    return minus(dist, [groupLeft, groupTop]);
}
export function getScaleDist(
    moveable: MoveableManagerInterface<any>,
    scaleDist: number[],
    direction: number[],
    fixedPosition: number[],
    datas: any,
) {
    return getTranslateDist(
        moveable,
        `scale(${scaleDist.join(", ")})`,
        fixedPosition,
        direction.map(dir => -dir),
        datas,
    );
}
export function getOriginDirection(moveable: MoveableManagerInterface<any>) {
    const {
        width,
        height,
        transformOrigin,
    } = moveable.state;
    return [
        -1 + transformOrigin[0] / (width / 2),
        -1 + transformOrigin[1] / (height / 2),
    ];
}
export function getDirectionOffset(
    moveable: MoveableManagerInterface, direction: number[],
    nextMatrix: number[] = moveable.state.matrix,
) {
    const {
        width,
        height,
        is3d,
    } = moveable.state;
    const n = is3d ? 4 : 3;
    const nextFixedOffset = [
        width / 2 * (1 + direction[0]),
        height / 2 * (1 + direction[1]),
    ];
    return caculatePosition(nextMatrix, nextFixedOffset, n);
}
export function getRotateDist(
    moveable: MoveableManagerInterface<any>,
    rotateDist: number,
    fixedPosition: number[],
    datas: any,
) {
    const fixedDirection = getOriginDirection(moveable);
    return getTranslateDist(
        moveable,
        `rotate(${rotateDist}deg)`,
        fixedPosition,
        fixedDirection,
        datas,
    );
}
export function getResizeDist(
    moveable: MoveableManagerInterface<any>,
    width: number,
    height: number,
    direction: number[],
    fixedPosition: number[],
    transformOrigin: string[],
) {
    const {
        groupable,
    } = moveable.props;
    const {
        transformOrigin: prevOrigin,
        targetMatrix,
        offsetMatrix,
        is3d,
        width: prevWidth,
        height: prevHeight,
        left,
        top,
    } = moveable.state;

    const n = is3d ? 4 : 3;
    const nextOrigin = caculateTransformOrigin(
        transformOrigin!,
        width,
        height,
        prevWidth,
        prevHeight,
        prevOrigin,
    );
    const groupLeft = groupable ? left : 0;
    const groupTop = groupable ? top : 0;
    const nextMatrix = getNextMatrix(offsetMatrix, targetMatrix, nextOrigin, n);
    const dist = getDist(fixedPosition, nextMatrix, width, height, n, direction);

    return minus(dist, [groupLeft, groupTop]);
}
export function getStartDirection(
    moveable: MoveableManagerInterface<ResizableProps>,
    direction: number[],
) {
    if (!direction[0] && !direction[1]) {
        return [0, 0];
    }
    const baseDirection = [-1, -1];
    return [
        direction[0] ? direction[0] : baseDirection[0] * -1,
        direction[1] ? direction[1] : baseDirection[1] * -1,
    ];
}
export function getAbsoluteFixedPosition(
    moveable: MoveableManagerInterface<ResizableProps>,
    direction: number[],
) {
    return getPosByReverseDirection(getAbsolutePosesByState(moveable.state), direction);
}
