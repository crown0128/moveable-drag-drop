import { createIdentityMatrix, convertDimension, multiply, createOriginMatrix, ignoreDimension } from "@scena/matrix";
import { getMatrixStackInfo, convert3DMatrixes, getOffsetInfo, getSVGOffset, makeMatrixCSS } from "../utils";

export interface MoveableElementMatrixInfo {
    hasFixed: boolean;
    rootMatrix: number[];
    beforeMatrix: number[];
    offsetMatrix: number[];
    allMatrix: number[];
    targetMatrix: number[];
    transformOrigin: number[];
    targetOrigin: number[];
    is3d: boolean;
    targetTransform: string;
    offsetContainer: HTMLElement | null,
    offsetRootContainer: HTMLElement | null,
}

export function calculateMatrixStack(
    target: SVGElement | HTMLElement,
    container?: SVGElement | HTMLElement | null,
    rootContainer: SVGElement | HTMLElement | null | undefined = container,
    isAbsolute3d?: boolean,
    // prevMatrix?: number[],
    // prevRootMatrix?: number[],
    // prevN?: number,
): MoveableElementMatrixInfo {
    const {
        matrixes,
        is3d,
        targetMatrix: prevTargetMatrix,
        transformOrigin,
        targetOrigin,
        offsetContainer,
        hasFixed,
    } = getMatrixStackInfo(target, container); // prevMatrix
    const {
        matrixes: rootMatrixes,
        is3d: isRoot3d,
        offsetContainer: offsetRootContainer,
    } = getMatrixStackInfo(offsetContainer, rootContainer, true); // prevRootMatrix

    // if (rootContainer === document.body) {
    //     console.log(offsetContainer, rootContainer, rootMatrixes);
    // }
    const isNext3d = isAbsolute3d || isRoot3d || is3d;
    const n = isNext3d ? 4 : 3;
    const isSVGGraphicElement = target.tagName.toLowerCase() !== "svg" && "ownerSVGElement" in target;
    let targetMatrix = prevTargetMatrix;
    // let allMatrix = prevMatrix ? convertDimension(prevMatrix, prevN!, n) : createIdentityMatrix(n);
    // let rootMatrix = prevRootMatrix ? convertDimension(prevRootMatrix, prevN!, n) : createIdentityMatrix(n);
    // let beforeMatrix = prevMatrix ? convertDimension(prevMatrix, prevN!, n) : createIdentityMatrix(n);
    let allMatrix = createIdentityMatrix(n);
    let rootMatrix = createIdentityMatrix(n);
    let beforeMatrix = createIdentityMatrix(n);
    let offsetMatrix = createIdentityMatrix(n);
    const length = matrixes.length;

    rootMatrixes.reverse();
    matrixes.reverse();

    if (!is3d && isNext3d) {
        targetMatrix = convertDimension(targetMatrix, 3, 4);

        convert3DMatrixes(matrixes);
    }
    if (!isRoot3d && isNext3d) {
        convert3DMatrixes(rootMatrixes);
    }

    // rootMatrix = (...) -> container -> offset -> absolute -> offset -> absolute(targetMatrix)
    // rootMatrixBeforeOffset = lastOffsetMatrix -> (...) -> container
    // beforeMatrix = (... -> container -> offset -> absolute) -> offset -> absolute(targetMatrix)
    // offsetMatrix = (... -> container -> offset -> absolute -> offset) -> absolute(targetMatrix)

    rootMatrixes.forEach(info => {
        rootMatrix = multiply(rootMatrix, info.matrix!, n);
    });
    const originalRootContainer = rootContainer || document.body;
    const endContainer = rootMatrixes[0]?.target
        || getOffsetInfo(originalRootContainer, originalRootContainer, true).offsetParent;
    const rootMatrixBeforeOffset = rootMatrixes.slice(1).reduce((matrix, info) => {
        return multiply(matrix, info.matrix!, n);
    }, createIdentityMatrix(n));
    matrixes.forEach((info, i) => {
        if (length - 2 === i) {
            // length - 3
            beforeMatrix = allMatrix.slice();
        }
        if (length - 1 === i) {
            // length - 2
            offsetMatrix = allMatrix.slice();
        }

        // calculate for SVGElement
        if (!info.matrix) {
            const nextInfo = matrixes[i + 1];
            const offset = getSVGOffset(
                info,
                nextInfo,
                endContainer,
                n,
                multiply(rootMatrixBeforeOffset, allMatrix, n),
            );
            info.matrix = createOriginMatrix(offset, n);
        }
        allMatrix = multiply(allMatrix, info.matrix!, n);
    });
    const isMatrix3d = !isSVGGraphicElement && is3d;

    if (!targetMatrix) {
        targetMatrix = createIdentityMatrix(isMatrix3d ? 4 : 3);
    }
    const targetTransform = makeMatrixCSS(
        isSVGGraphicElement && targetMatrix.length === 16
            ? convertDimension(targetMatrix, 4, 3) : targetMatrix,
        isMatrix3d,
    );

    rootMatrix = ignoreDimension(rootMatrix, n, n);

    return {
        hasFixed,
        rootMatrix,
        beforeMatrix,
        offsetMatrix,
        allMatrix,
        targetMatrix,
        targetTransform,
        transformOrigin,
        targetOrigin,
        is3d: isNext3d,
        offsetContainer,
        offsetRootContainer,
    };
}
