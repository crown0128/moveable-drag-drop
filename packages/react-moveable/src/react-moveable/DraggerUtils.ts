import {
    invert, caculate, minus, plus,
    convertPositionMatrix, average,
    createScaleMatrix, multiply,
} from "@moveable/matrix";
import MoveableManager from "./MoveableManager";
import { caculatePoses, getAbsoluteMatrix } from "./utils";
import { splitUnit } from "@daybrush/utils";

export function setDragStart(moveable: MoveableManager<any>, { datas }: any) {
    const {
        matrix,
        beforeMatrix,
        is3d,
        left,
        top,
        origin,
    } = moveable.state;

    const n = is3d ? 4 : 3;

    datas.is3d = is3d;
    datas.matrix = matrix;
    datas.inverseMatrix = invert(matrix, n);
    datas.beforeMatrix = beforeMatrix;
    datas.inverseBeforeMatrix = invert(beforeMatrix, n);
    datas.absoluteOrigin = convertPositionMatrix(plus([left, top], origin), n);
    datas.startDragBeforeDist = caculate(datas.inverseBeforeMatrix, datas.absoluteOrigin, n);
    datas.startDragDist = caculate(datas.inverseMatrix, datas.absoluteOrigin, n);
}
export function getDragDist({ datas, distX, distY }: any, isBefore?: boolean) {
    const {
        inverseBeforeMatrix,
        inverseMatrix, is3d,
        startDragBeforeDist,
        startDragDist, absoluteOrigin,
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

export function caculateTransformOrigin(
    transformOrigin: string,
    width: number,
    height: number,
    prevWidth: number = width,
    prevHeight: number = height,
    prevOrigin: number[] = [0, 0],
) {

    if (!transformOrigin) {
        return prevOrigin;
    }
    return transformOrigin.split(" ").map((pos, i) => {
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

export function setSizeInfo(moveable: MoveableManager<any>, { datas }: any) {
    const {
        left,
        top,
        pos1,
        pos2,
        pos3,
        pos4,
    } = moveable.state;
    const pos = [left, top];

    datas.startPos1 = plus(pos, pos1);
    datas.startPos2 = plus(pos, pos2);
    datas.startPos3 = plus(pos, pos3);
    datas.startPos4 = plus(pos, pos4);
}

function getDist(
    datas: any,
    matrix: number[],
    width: number,
    height: number,
    n: number,
    direction: number[],
    parentScale: number[] = [1, 1],
) {
    const {
        startPos1,
        startPos2,
        startPos3,
        startPos4,
    } = datas;
    const [
        pos1,
        pos2,
        pos3,
        pos4,
    ] = caculatePoses(matrix, width, height, n);

    /*
    [-1, -1](pos4)       [0, -1](pos3,pos4)       [1, -1](pos3)
    [-1, 0](pos2, pos4)                           [1, 0](pos3, pos1)
    [-1, 1](pos2)        [0, 1](pos1, pos2)       [1, 1](pos1)
    */
    const startPoses: number[][] = [];
    const poses: number[][] = [];
    const moveDirection = [parentScale[0] * direction[0], parentScale[1] * direction[1]];

    if (direction[1] >= 0) {
        if (direction[0] >= 0) {
            startPoses.push(startPos1);
        }
        if (direction[0] <= 0) {
            startPoses.push(startPos2);
        }
    }
    if (direction[1] <= 0) {
        if (direction[0] >= 0) {
            startPoses.push(startPos3);
        }
        if (direction[0] <= 0) {
            startPoses.push(startPos4);
        }
    }
    if (moveDirection[1] >= 0) {
        if (moveDirection[0] >= 0) {
            poses.push(pos1);
        }
        if (moveDirection[0] <= 0) {
            poses.push(pos2);
        }
    }
    if (moveDirection[1] <= 0) {
        if (moveDirection[0] >= 0) {
            poses.push(pos3);
        }
        if (moveDirection[0] <= 0) {
            poses.push(pos4);
        }
    }

    const distX = average(...startPoses.map(pos => pos[0])) - average(...poses.map(pos => pos[0]));
    const distY = average(...startPoses.map(pos => pos[1])) - average(...poses.map(pos => pos[1]));

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
export function getScaleDist(
    moveable: MoveableManager<any>,
    { datas }: any,
    scale: number[],
    direction: number[],
    parentScale?: number[],
) {
    const state = moveable.state;
    const {
        transformOrigin,
        offsetMatrix,
        is3d,
        width,
        height,
        left,
        top,
    } = state;

    const n = is3d ? 4 : 3;
    const groupable = moveable.props.groupable;
    const targetMatrix = state.targetMatrix;

    const nextMatrix = getNextMatrix(
        offsetMatrix,
        multiply(targetMatrix, createScaleMatrix(scale, n), n),
        transformOrigin,
        n,
    );
    const groupLeft = groupable ? left : 0;
    const groupTop = groupable ? top : 0;
    const dist = getDist(datas, nextMatrix, width, height, n, direction, parentScale);

    return minus(dist, [groupLeft, groupTop]);
}

export function getResizeDist(
    moveable: MoveableManager<any>,
    { datas }: any,
    width: number,
    height: number,
    direction: number[],
) {
    const {
        transformOrigin,
        groupable,
    } = moveable.props;
    const {
        transformOrigin: prevOrigin,
        targetMatrix,
        offsetMatrix,
        is3d,
        width: prevWidth,
        height: prevheight,
        left,
        top,
    } = moveable.state;

    const n = is3d ? 4 : 3;
    const nextOrigin = caculateTransformOrigin(
        transformOrigin!,
        width,
        height,
        prevWidth,
        prevheight,
        prevOrigin,
    );
    const groupLeft = groupable ? left : 0;
    const groupTop = groupable ? top : 0;
    const nextMatrix = getNextMatrix(offsetMatrix, targetMatrix, nextOrigin, n);
    const dist = getDist(datas, nextMatrix, width, height, n, direction);

    return minus(dist, [groupLeft, groupTop]);
}
