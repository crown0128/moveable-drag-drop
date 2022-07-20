import { PREFIX, IS_WEBKIT605, TINY_NUM, IS_WEBKIT, IS_SAFARI_ABOVE15 } from "./consts";
import { prefixNames, InvertObject } from "framework-utils";
import {
    isUndefined, isObject, splitUnit,
    IObject, hasClass, isArray, isString, getRad,
    getShapeDirection, isFunction, convertUnitSize, between,
} from "@daybrush/utils";
import {
    multiply, invert,
    convertDimension, createIdentityMatrix,
    createOriginMatrix, convertPositionMatrix, calculate,
    multiplies,
    minus,
    getOrigin,
    createScaleMatrix,
    plus,
    ignoreDimension,
    convertCSStoMatrix,
    convertMatrixtoCSS,
} from "@scena/matrix";
import {
    MoveableManagerState, Able, MoveableClientRect,
    MoveableProps, ArrayFormat, MoveableRefType,
    MatrixInfo, ExcludeEndParams, ExcludeParams, ElementSizes,
} from "./types";
import { parse, toMat, calculateMatrixDist, parseMat } from "css-to-mat";
import { getDragDist } from "./gesto/GestoUtils";

export function round(num: number) {
    return Math.round(num);
}
export function multiply2(pos1: number[], pos2: number[]) {
    return [
        pos1[0] * pos2[0],
        pos1[1] * pos2[1],
    ];
}
export function prefix(...classNames: string[]) {
    return prefixNames(PREFIX, ...classNames);
}

export function defaultSync(fn: () => void) {
    fn();
}

export function createIdentityMatrix3() {
    return createIdentityMatrix(3);
}

export function getTransformMatrix(transform: string | number[]) {
    if (!transform || transform === "none") {
        return [1, 0, 0, 1, 0, 0];

    }
    if (isObject(transform)) {
        return transform;
    }
    return parseMat(transform);
}
export function getAbsoluteMatrix(matrix: number[], n: number, origin: number[]) {
    return multiplies(
        n,
        createOriginMatrix(origin, n),
        matrix,
        createOriginMatrix(origin.map(a => -a), n),
    );
}
export function measureSVGSize(el: SVGElement, unit: string, isHorizontal: boolean) {
    if (unit === "%") {
        const viewBox = getSVGViewBox(el.ownerSVGElement!);

        return viewBox[isHorizontal ? "width" : "height"] / 100;
    }
    return 1;
}
export function getBeforeTransformOrigin(el: SVGElement) {
    const relativeOrigin = getTransformOrigin(getComputedStyle(el, ":before"));

    return relativeOrigin.map((o, i) => {
        const { value, unit } = splitUnit(o);

        return value * measureSVGSize(el, unit, i === 0);
    });
}
export function getTransformOrigin(style: CSSStyleDeclaration) {
    const transformOrigin = style.transformOrigin;

    return transformOrigin ? transformOrigin.split(" ") : ["0", "0"];
}
export function getElementTransform(
    target: HTMLElement | SVGElement,
    computedStyle = getComputedStyle(target),
) {
    const computedTransform = computedStyle.transform;

    if (computedTransform && computedTransform !== "none") {
        return computedStyle.transform;
    }
    if ("transform" in target) {
        const list = (target as any).transform as SVGAnimatedTransformList;
        const baseVal = list.baseVal;

        if (!baseVal) {
            return "";
        }
        const length = baseVal.length;

        if (!length) {
            return "";
        }

        const matrixes: string[] = [];

        for (let i = 0; i < length; ++i) {
            const matrix = baseVal[i].matrix;

            matrixes.push(`matrix(${(["a", "b", "c", "d", "e", "f"] as const).map(chr => matrix[chr]).join(", ")})`);
        }
        return matrixes.join(" ");

    }
    return "";
}
export function getOffsetInfo(
    el: SVGElement | HTMLElement | null | undefined,
    lastParent: SVGElement | HTMLElement | null | undefined,
    isParent?: boolean,
) {
    const body = document.body;
    let target = !el || isParent
        ? el
        : el?.assignedSlot?.parentElement || el.parentElement;

    let isCustomElement = false;
    let isEnd = el === lastParent || target === lastParent;
    let position = "relative";



    while (target && target !== body) {
        if (lastParent === target) {
            isEnd = true;
        }
        const style = getComputedStyle(target);
        const tagName = target.tagName.toLowerCase();
        const transform = getElementTransform(target as SVGElement, style);
        position = style.position!;

        if (tagName === "svg" || position !== "static" || (transform && transform !== "none")) {
            break;
        }
        const parentNode = target.parentNode;

        if (parentNode && parentNode.nodeType === 11) {
            // Shadow Root
            target = (parentNode as ShadowRoot).host as HTMLElement;
            isCustomElement = true;
            break;
        }

        target = parentNode as HTMLElement | SVGElement;
        position = "relative";
    }
    return {
        isCustomElement,
        isStatic: position === "static",
        isEnd: isEnd || !target || target === body,
        offsetParent: target as HTMLElement || body,
    };

}
export function getOffsetPosInfo(
    el: HTMLElement | SVGElement,
    style: CSSStyleDeclaration,
) {
    const tagName = el.tagName.toLowerCase();
    let offsetLeft = (el as HTMLElement).offsetLeft;
    let offsetTop = (el as HTMLElement).offsetTop;

    // svg
    const isSVG = isUndefined(offsetLeft);
    let hasOffset = !isSVG;
    let origin: number[];
    let targetOrigin: number[];
    // inner svg element
    if (!hasOffset && tagName !== "svg") {
        origin = IS_WEBKIT605
            ? getBeforeTransformOrigin(el as SVGElement)
            : getTransformOrigin(style).map(pos => parseFloat(pos));

        targetOrigin = origin.slice();
        hasOffset = true;

        [
            offsetLeft, offsetTop, origin[0], origin[1],
        ] = getSVGGraphicsOffset(el as SVGGraphicsElement, origin);
    } else {
        origin = getTransformOrigin(style).map(pos => parseFloat(pos));
        targetOrigin = origin.slice();
    }
    return {
        tagName,
        isSVG,
        hasOffset,
        offset: [offsetLeft || 0, offsetTop || 0],
        origin,
        targetOrigin,
    };
}
export function getBodyOffset(
    el: HTMLElement | SVGElement,
    isSVG: boolean,
    style: CSSStyleDeclaration = getComputedStyle(el),
) {
    const bodyStyle = getComputedStyle(document.body);
    const bodyPosition = bodyStyle.position;
    if (!isSVG && (!bodyPosition || bodyPosition === "static")) {
        return [0, 0];
    }

    let marginLeft = parseInt(bodyStyle.marginLeft, 10);
    let marginTop = parseInt(bodyStyle.marginTop, 10);

    if (style.position === "absolute") {
        if (style.top !== "auto" || style.bottom !== "auto") {
            marginTop = 0;
        }
        if (style.left !== "auto" || style.right !== "auto") {
            marginLeft = 0;
        }
    }

    return [marginLeft, marginTop];
}
export function convert3DMatrixes(matrixes: MatrixInfo[]) {
    matrixes.forEach(info => {
        const matrix = info.matrix;

        if (matrix) {
            info.matrix = convertDimension(matrix, 3, 4);
        }
    });
}

export function getBodyScrollPos() {
    return [
        document.documentElement.scrollLeft || document.body.scrollLeft,
        document.documentElement.scrollTop || document.body.scrollTop,
    ];
}

export function getPositionFixedInfo(el: HTMLElement | SVGElement) {
    let fixedContainer = el.parentElement;
    let hasTransform = false;

    while (fixedContainer) {
        const transform = getComputedStyle(fixedContainer).transform;


        if (transform && transform !== "none") {
            hasTransform = true;
            break;
        }
        if (fixedContainer === document.body) {
            break;
        }
        fixedContainer = fixedContainer.parentElement;
    }

    return {
        fixedContainer: fixedContainer || document.body,
        hasTransform,
    };
}

export function getMatrixStackInfo(
    target: SVGElement | HTMLElement,
    container?: SVGElement | HTMLElement | null,
    checkContainer?: boolean,
) {
    let el: SVGElement | HTMLElement | null = target;
    const matrixes: MatrixInfo[] = [];
    let requestEnd = !checkContainer && target === container || target === document.body;
    let isEnd = requestEnd;
    let is3d = false;
    let n = 3;
    let transformOrigin!: number[];
    let targetTransformOrigin!: number[];
    let targetMatrix!: number[];

    let hasFixed = false;
    let offsetContainer = getOffsetInfo(container, container, true).offsetParent;

    while (el && !isEnd) {
        isEnd = requestEnd;
        const style: CSSStyleDeclaration = getComputedStyle(el);
        const position = style.position;
        const transform = getElementTransform(el, style);
        let matrix: number[] = convertCSStoMatrix(getTransformMatrix(transform));
        const isFixed = position === "fixed";
        let fixedInfo: {
            hasTransform: boolean;
            fixedContainer: HTMLElement | null;
        } = {
            hasTransform: false,
            fixedContainer: null,
        };
        if (isFixed) {
            hasFixed = true;
            fixedInfo = getPositionFixedInfo(el);

            offsetContainer = fixedInfo.fixedContainer!;
        }

        // convert 3 to 4
        const length = matrix.length;
        if (!is3d && length === 16) {
            is3d = true;
            n = 4;

            convert3DMatrixes(matrixes);
            if (targetMatrix) {
                targetMatrix = convertDimension(targetMatrix, 3, 4);
            }
        }
        if (is3d && length === 9) {
            matrix = convertDimension(matrix, 3, 4);
        }
        const {
            tagName,
            hasOffset,
            isSVG,
            origin,
            targetOrigin,
            offset: offsetPos,
        } = getOffsetPosInfo(el, style);
        let [
            offsetLeft,
            offsetTop,
        ] = offsetPos;
        if (tagName === "svg" && targetMatrix) {
            // scale matrix for svg's SVGElements.
            matrixes.push({
                type: "target",
                target: el,
                matrix: getSVGMatrix(el as SVGSVGElement, n),
            });
            matrixes.push({
                type: "offset",
                target: el,
                matrix: createIdentityMatrix(n),
            });
        } else if (tagName === "g" && target !== el) {
            offsetLeft = 0;
            offsetTop = 0;
        }

        let offsetParent: HTMLElement;
        let isOffsetEnd = false;
        let isStatic = false;

        if (isFixed) {
            offsetParent = fixedInfo.fixedContainer!;
            isOffsetEnd = true;
        } else {
            const offsetInfo = getOffsetInfo(el, container);

            offsetParent = offsetInfo.offsetParent;
            isOffsetEnd = offsetInfo.isEnd;
            isStatic = offsetInfo.isStatic;
        }

        if (
            IS_WEBKIT && !IS_SAFARI_ABOVE15
            && hasOffset && !isSVG && isStatic
            && (position === "relative" || position === "static")
        ) {
            offsetLeft -= offsetParent.offsetLeft;
            offsetTop -= offsetParent.offsetTop;
            requestEnd = requestEnd || isOffsetEnd;
        }
        let parentClientLeft = 0;
        let parentClientTop = 0;
        let fixedClientLeft = 0;
        let fixedClientTop = 0;

        if (isFixed) {
            if (hasOffset && fixedInfo.hasTransform) {
                // border
                fixedClientLeft = offsetParent.clientLeft;
                fixedClientTop = offsetParent.clientTop;
            }
        } else {
            if (hasOffset && offsetContainer !== offsetParent) {
                // border
                parentClientLeft = offsetParent.clientLeft;
                parentClientTop = offsetParent.clientTop;
            }
            if (hasOffset && offsetParent === document.body) {
                const margin = getBodyOffset(el, false, style);

                offsetLeft += margin[0];
                offsetTop += margin[1];
            }
        }

        matrixes.push({
            type: "target",
            target: el,
            matrix: getAbsoluteMatrix(matrix, n, origin),
        });
        if (hasOffset) {
            matrixes.push({
                type: "offset",
                target: el,
                matrix: createOriginMatrix([
                    offsetLeft - el.scrollLeft + parentClientLeft - fixedClientLeft,
                    offsetTop - el.scrollTop + parentClientTop - fixedClientTop,
                ], n),
            });
        } else {
            // svg
            matrixes.push({
                type: "offset",
                target: el,
                origin,
            });
        }
        if (!targetMatrix) {
            targetMatrix = matrix;
        }
        if (!transformOrigin) {
            transformOrigin = origin;
        }
        if (!targetTransformOrigin) {
            targetTransformOrigin = targetOrigin;
        }

        if (isEnd || isFixed) {
            break;
        } else {
            el = offsetParent;
            requestEnd = isOffsetEnd;
        }
        if (!checkContainer || el === document.body) {
            isEnd = requestEnd;
        }
    }
    if (!targetMatrix) {
        targetMatrix = createIdentityMatrix(n);
    }
    if (!transformOrigin) {
        transformOrigin = [0, 0];
    }
    if (!targetTransformOrigin) {
        targetTransformOrigin = [0, 0];
    }

    return {
        offsetContainer,
        matrixes,
        targetMatrix,
        transformOrigin,
        targetOrigin: targetTransformOrigin,
        is3d,
        hasFixed,
    };
}
export function calculateElementInfo(
    target?: SVGElement | HTMLElement | null,
    container?: SVGElement | HTMLElement | null,
    rootContainer: HTMLElement | SVGElement | null | undefined = container,
    isAbsolute3d?: boolean,
) {
    let width = 0;
    let height = 0;
    let rotation = 0;
    let allResult: {} = {};

    const sizes = getSize(target);

    if (target) {
        width = sizes.offsetWidth;
        height = sizes.offsetHeight;
    }

    if (target) {
        const result = calculateMatrixStack(
            target,
            container,
            rootContainer,
            isAbsolute3d,
            // prevMatrix, prevRootMatrix, prevN,
        );
        const position = calculateMoveablePosition(
            result.allMatrix,
            result.transformOrigin,
            width, height,
        );
        allResult = {
            ...result,
            ...position,
        };
        const rotationPosition = calculateMoveablePosition(
            result.allMatrix, [50, 50], 100, 100,
        );
        rotation = getRotationRad([rotationPosition.pos1, rotationPosition.pos2], rotationPosition.direction);
    }
    const n = isAbsolute3d ? 4 : 3;

    return {
        width,
        height,
        rotation,
        ...sizes,
        rootMatrix: createIdentityMatrix(n),
        beforeMatrix: createIdentityMatrix(n),
        offsetMatrix: createIdentityMatrix(n),
        allMatrix: createIdentityMatrix(n),
        targetMatrix: createIdentityMatrix(n),
        targetTransform: "",
        transformOrigin: [0, 0],
        targetOrigin: [0, 0],
        is3d: !!isAbsolute3d,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        origin: [0, 0],
        pos1: [0, 0],
        pos2: [0, 0],
        pos3: [0, 0],
        pos4: [0, 0],
        direction: 1,
        hasFixed: false,
        ...allResult,
    };
}
export function getElementInfo(
    target: SVGElement | HTMLElement,
    container?: SVGElement | HTMLElement | null,
    rootContainer: SVGElement | HTMLElement | null | undefined = container,
) {
    return calculateElementInfo(target, container, rootContainer, true);
}
export function calculateMatrixStack(
    target: SVGElement | HTMLElement,
    container?: SVGElement | HTMLElement | null,
    rootContainer: SVGElement | HTMLElement | null | undefined = container,
    isAbsolute3d?: boolean,
    // prevMatrix?: number[],
    // prevRootMatrix?: number[],
    // prevN?: number,
) {
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
    };
}
export function makeMatrixCSS(matrix: number[], is3d: boolean = matrix.length > 9) {
    return `${is3d ? "matrix3d" : "matrix"}(${convertMatrixtoCSS(matrix, !is3d).join(",")})`;
}
export function getSVGViewBox(el: SVGSVGElement) {
    const clientWidth = el.clientWidth;
    const clientHeight = el.clientHeight;

    if (!el) {
        return { x: 0, y: 0, width: 0, height: 0, clientWidth, clientHeight };
    }
    const viewBox = el.viewBox;
    const baseVal = (viewBox && viewBox.baseVal) || { x: 0, y: 0, width: 0, height: 0 };

    return {
        x: baseVal.x,
        y: baseVal.y,
        width: baseVal.width || clientWidth,
        height: baseVal.height || clientHeight,
        clientWidth,
        clientHeight,
    };
}
export function getSVGMatrix(
    el: SVGSVGElement,
    n: number,
) {
    const {
        width: viewBoxWidth,
        height: viewBoxHeight,
        clientWidth,
        clientHeight,
    } = getSVGViewBox(el);
    const scaleX = clientWidth / viewBoxWidth;
    const scaleY = clientHeight / viewBoxHeight;

    const preserveAspectRatio = el.preserveAspectRatio.baseVal;
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
    const align = preserveAspectRatio.align;
    // 1 : meet 2: slice
    const meetOrSlice = preserveAspectRatio.meetOrSlice;
    const svgOrigin = [0, 0];
    const scale = [scaleX, scaleY];
    const translate = [0, 0];

    if (align !== 1) {
        const xAlign = (align - 2) % 3;
        const yAlign = Math.floor((align - 2) / 3);

        svgOrigin[0] = viewBoxWidth * xAlign / 2;
        svgOrigin[1] = viewBoxHeight * yAlign / 2;

        const scaleDimension = meetOrSlice === 2 ? Math.max(scaleY, scaleX) : Math.min(scaleX, scaleY);

        scale[0] = scaleDimension;
        scale[1] = scaleDimension;

        translate[0] = (clientWidth - viewBoxWidth) / 2 * xAlign;
        translate[1] = (clientHeight - viewBoxHeight) / 2 * yAlign;
    }
    const scaleMatrix = createScaleMatrix(scale, n);
    [
        scaleMatrix[n * (n - 1)],
        scaleMatrix[n * (n - 1) + 1],
    ] = translate;

    return getAbsoluteMatrix(
        scaleMatrix,
        n,
        svgOrigin,
    );
}
export function getSVGGraphicsOffset(
    el: SVGGraphicsElement,
    origin: number[],
) {
    if (!el.getBBox || el.tagName.toLowerCase() === "g") {
        return [0, 0, 0, 0];
    }
    const bbox = el.getBBox();
    const viewBox = getSVGViewBox(el.ownerSVGElement!);
    const left = bbox.x - viewBox.x;
    const top = bbox.y - viewBox.y;

    return [
        left,
        top,
        origin[0] - left,
        origin[1] - top,
    ];
}
export function calculatePosition(matrix: number[], pos: number[], n: number) {
    return calculate(matrix, convertPositionMatrix(pos, n), n);
}
export function calculatePoses(matrix: number[], width: number, height: number, n: number) {
    return [[0, 0], [width, 0], [0, height], [width, height]].map(pos => calculatePosition(matrix, pos, n));
}
export function getRect(poses: number[][]) {
    const posesX = poses.map(pos => pos[0]);
    const posesY = poses.map(pos => pos[1]);
    const left = Math.min(...posesX);
    const top = Math.min(...posesY);
    const right = Math.max(...posesX);
    const bottom = Math.max(...posesY);
    const rectWidth = right - left;
    const rectHeight = bottom - top;

    return {
        left, top,
        right, bottom,
        width: rectWidth,
        height: rectHeight,
    };
}
export function calculateRect(matrix: number[], width: number, height: number, n: number) {
    const poses = calculatePoses(matrix, width, height, n);

    return getRect(poses);
}
export function getSVGOffset(
    offsetInfo: MatrixInfo,
    targetInfo: MatrixInfo,
    container: HTMLElement | SVGElement,
    n: number,
    beforeMatrix: number[],
) {
    const target = offsetInfo.target;
    const origin = offsetInfo.origin!;
    const targetMatrix = targetInfo.matrix!;
    const {
        offsetWidth: width,
        offsetHeight: height,
    } = getSize(target);
    const containerClientRect = container.getBoundingClientRect();
    let margin = [0, 0];

    if (container === document.body) {
        margin = getBodyOffset(target, true);
    }

    const rect = target.getBoundingClientRect();
    const rectLeft
        = rect.left - containerClientRect.left + container.scrollLeft
        - (container.clientLeft || 0) + margin[0];
    const rectTop
        = rect.top - containerClientRect.top + container.scrollTop
        - (container.clientTop || 0) + margin[1];
    const rectWidth = rect.width;
    const rectHeight = rect.height;

    const mat = multiplies(
        n,
        beforeMatrix,
        targetMatrix,
    );
    const {
        left: prevLeft,
        top: prevTop,
        width: prevWidth,
        height: prevHeight,
    } = calculateRect(mat, width, height, n);
    const posOrigin = calculatePosition(mat, origin, n);
    const prevOrigin = minus(posOrigin, [prevLeft, prevTop]);
    const rectOrigin = [
        rectLeft + prevOrigin[0] * rectWidth / prevWidth,
        rectTop + prevOrigin[1] * rectHeight / prevHeight,
    ];
    const offset = [0, 0];
    let count = 0;

    while (++count < 10) {
        const inverseBeforeMatrix = invert(beforeMatrix, n);
        [offset[0], offset[1]] = minus(
            calculatePosition(inverseBeforeMatrix, rectOrigin, n),
            calculatePosition(inverseBeforeMatrix, posOrigin, n),
        );
        const mat2 = multiplies(
            n,
            beforeMatrix,
            createOriginMatrix(offset, n),
            targetMatrix,
        );
        const {
            left: nextLeft,
            top: nextTop,
        } = calculateRect(mat2, width, height, n);
        const distLeft = nextLeft - rectLeft;
        const distTop = nextTop - rectTop;

        if (Math.abs(distLeft) < 2 && Math.abs(distTop) < 2) {
            break;
        }
        rectOrigin[0] -= distLeft;
        rectOrigin[1] -= distTop;
    }
    return offset.map(p => Math.round(p));
}
export function calculateMoveablePosition(matrix: number[], origin: number[], width: number, height: number) {
    const is3d = matrix.length === 16;
    const n = is3d ? 4 : 3;
    const poses = calculatePoses(matrix, width, height, n);
    let [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4],
    ] = poses;
    let [originX, originY] = calculatePosition(matrix, origin, n);

    const left = Math.min(x1, x2, x3, x4);
    const top = Math.min(y1, y2, y3, y4);
    const right = Math.max(x1, x2, x3, x4);
    const bottom = Math.max(y1, y2, y3, y4);

    x1 = (x1 - left) || 0;
    x2 = (x2 - left) || 0;
    x3 = (x3 - left) || 0;
    x4 = (x4 - left) || 0;

    y1 = (y1 - top) || 0;
    y2 = (y2 - top) || 0;
    y3 = (y3 - top) || 0;
    y4 = (y4 - top) || 0;

    originX = (originX - left) || 0;
    originY = (originY - top) || 0;

    const direction = getShapeDirection(poses);

    return {
        left,
        top,
        right,
        bottom,
        origin: [originX, originY],
        pos1: [x1, y1],
        pos2: [x2, y2],
        pos3: [x3, y3],
        pos4: [x4, y4],
        direction,
    };
}
export function getDistSize(vec: number[]) {
    return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
}
export function getDiagonalSize(pos1: number[], pos2: number[]) {
    return getDistSize([
        pos2[0] - pos1[0],
        pos2[1] - pos1[1],
    ]);
}
export function getLineStyle(pos1: number[], pos2: number[], zoom = 1, rad: number = getRad(pos1, pos2)) {
    const width = getDiagonalSize(pos1, pos2);

    return {
        transform: `translateY(-50%) translate(${pos1[0]}px, ${pos1[1]}px) rotate(${rad}rad) scaleY(${zoom})`,
        width: `${width}px`,
    };
}
export function getControlTransform(rotation: number, zoom: number, ...poses: number[][]) {
    const length = poses.length;

    const x = poses.reduce((prev, pos) => prev + pos[0], 0) / length;
    const y = poses.reduce((prev, pos) => prev + pos[1], 0) / length;
    return {
        transform: `translateZ(0px) translate(${x}px, ${y}px) rotate(${rotation}rad) scale(${zoom})`,
    };
}
export function getCSSSize(target: SVGElement | HTMLElement) {
    const style = getComputedStyle(target);

    return [
        parseFloat(style.width!),
        parseFloat(style.height!),
    ];
}

export function getSize(
    target?: SVGElement | HTMLElement | null,
    style: CSSStyleDeclaration | null = target ? getComputedStyle(target) : null,
): ElementSizes {
    const hasOffset = target && !isUndefined((target as any).offsetWidth);

    let offsetWidth = 0;
    let offsetHeight = 0;
    let clientWidth = 0;
    let clientHeight = 0;
    let cssWidth = 0;
    let cssHeight = 0;
    let contentWidth = 0;
    let contentHeight = 0;

    let minWidth = 0;
    let minHeight = 0;
    let minOffsetWidth = 0;
    let minOffsetHeight = 0;

    let maxWidth = Infinity;
    let maxHeight = Infinity;
    let maxOffsetWidth = Infinity;
    let maxOffsetHeight = Infinity;
    let svg = false;

    if (target) {
        if (!hasOffset && target!.tagName.toLowerCase() !== "svg") {
            const bbox = (target as SVGGraphicsElement).getBBox();

            svg = true;
            offsetWidth = bbox.width;
            offsetHeight = bbox.height;
            cssWidth = offsetWidth;
            cssHeight = offsetHeight;
            contentWidth = offsetWidth;
            contentHeight = offsetHeight;
            clientWidth = offsetWidth;
            clientHeight = offsetHeight;

        } else {
            const targetStyle = target.style;
            const boxSizing = style!.boxSizing === "border-box";
            const borderLeft = parseFloat(style!.borderLeftWidth!) || 0;
            const borderRight = parseFloat(style!.borderRightWidth!) || 0;
            const borderTop = parseFloat(style!.borderTopWidth!) || 0;
            const borderBottom = parseFloat(style!.borderBottomWidth!) || 0;
            const paddingLeft = parseFloat(style!.paddingLeft!) || 0;
            const paddingRight = parseFloat(style!.paddingRight!) || 0;
            const paddingTop = parseFloat(style!.paddingTop!) || 0;
            const paddingBottom = parseFloat(style!.paddingBottom!) || 0;

            const horizontalPadding = paddingLeft + paddingRight;
            const verticalPadding = paddingTop + paddingBottom;
            const horizontalBorder = borderLeft + borderRight;
            const verticalBorder = borderTop + borderBottom;
            const horizontalOffset = horizontalPadding + horizontalBorder;
            const verticalOffset = verticalPadding + verticalBorder;

            minWidth = Math.max(horizontalPadding, convertUnitSize(style!.minWidth, 0));
            minHeight = Math.max(verticalPadding, convertUnitSize(style!.minHeight, 0));
            maxWidth = convertUnitSize(style!.maxWidth, 0);
            maxHeight = convertUnitSize(style!.maxHeight, 0);

            if (isNaN(maxWidth)) {
                maxWidth = Infinity;
                maxHeight = Infinity;
            }
            const inlineWidth = convertUnitSize(targetStyle.width, 0);
            const inlineHeight = convertUnitSize(targetStyle.height, 0);

            cssWidth = parseFloat(style!.width);
            cssHeight = parseFloat(style!.height);

            contentWidth = between(minWidth, inlineWidth || parseFloat(style!.width), maxWidth);
            contentHeight = between(minHeight, inlineHeight || parseFloat(style!.height), maxHeight);
            offsetWidth = contentWidth;
            offsetHeight = contentHeight;
            clientWidth = contentWidth;
            clientHeight = contentHeight;

            if (boxSizing) {
                maxOffsetWidth = maxWidth;
                maxOffsetHeight = maxHeight;
                minOffsetWidth = minWidth;
                minOffsetHeight = minHeight;
                contentWidth = offsetWidth - horizontalOffset;
                contentHeight = offsetHeight - verticalOffset;
            } else {
                maxOffsetWidth = maxWidth + horizontalOffset;
                maxOffsetHeight = maxHeight + verticalOffset;
                minOffsetWidth = minWidth + horizontalOffset;
                minOffsetHeight = minHeight + verticalOffset;
                offsetWidth = contentWidth + horizontalOffset;
                offsetHeight = contentHeight + verticalOffset;
            }
            clientWidth = contentWidth + horizontalPadding;
            clientHeight = contentHeight + verticalPadding;
        }
    }

    return {
        svg,
        offsetWidth,
        offsetHeight,
        clientWidth,
        clientHeight,
        contentWidth,
        contentHeight,
        cssWidth,
        cssHeight,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        minOffsetWidth,
        minOffsetHeight,
        maxOffsetWidth,
        maxOffsetHeight,
    };
}
export function getRotationRad(
    poses: number[][],
    direction: number,
) {
    return getRad(direction > 0 ? poses[0] : poses[1], direction > 0 ? poses[1] : poses[0]);
}

export function getTargetInfo(
    moveableElement?: HTMLElement | null,
    target?: HTMLElement | SVGElement | null,
    container?: HTMLElement | SVGElement | null,
    parentContainer?: HTMLElement | SVGElement | null,
    rootContainer?: HTMLElement | SVGElement | null,
    // state?: Partial<MoveableManagerState> | false | undefined,
) {
    let beforeDirection: 1 | -1 = 1;
    let beforeOrigin = [0, 0];
    let targetClientRect = resetClientRect();
    let containerClientRect = resetClientRect();
    let moveableClientRect = resetClientRect();

    const result = calculateElementInfo(
        target, container!, rootContainer!, false,
        // state,
    );
    if (target) {
        const n = result.is3d ? 4 : 3;
        const beforePosition = calculateMoveablePosition(
            result.offsetMatrix,
            plus(result.transformOrigin, getOrigin(result.targetMatrix, n)),
            result.width, result.height,
        );
        beforeDirection = beforePosition.direction;
        beforeOrigin = plus(
            beforePosition.origin,
            [beforePosition.left - result.left, beforePosition.top - result.top],
        );

        targetClientRect = getClientRect(target);
        containerClientRect = getClientRect(
            getOffsetInfo(parentContainer, parentContainer, true).offsetParent || document.body,
            true,
        );
        if (moveableElement) {
            moveableClientRect = getClientRect(moveableElement);
        }
    }

    return {
        targetClientRect,
        containerClientRect,
        moveableClientRect,
        beforeDirection,
        beforeOrigin,
        originalBeforeOrigin: beforeOrigin,
        target,
        ...result,
    };
}
export function resetClientRect(): MoveableClientRect {
    return {
        left: 0, right: 0,
        top: 0, bottom: 0,
        width: 0, height: 0,
        clientLeft: 0, clientTop: 0,
        clientWidth: 0, clientHeight: 0,
        scrollWidth: 0, scrollHeight: 0,
    };
}
export function getClientRect(el: HTMLElement | SVGElement, isExtends?: boolean) {
    let left = 0;
    let top = 0;
    let width = 0;
    let height = 0;

    if (el === document.body || el === document.documentElement) {
        width = window.innerWidth;
        height = window.innerHeight;
        const scrollPos = getBodyScrollPos();

        [left, top] = [-scrollPos[0], -scrollPos[1]];
    } else {
        const clientRect = el.getBoundingClientRect();

        left = clientRect.left;
        top = clientRect.top;
        width = clientRect.width;
        height = clientRect.height;
    }

    const rect: MoveableClientRect = {
        left,
        right: left + width,
        top,
        bottom: top + height,
        width,
        height,
    };

    if (isExtends) {
        rect.clientLeft = el.clientLeft;
        rect.clientTop = el.clientTop;
        rect.clientWidth = el.clientWidth;
        rect.clientHeight = el.clientHeight;
        rect.scrollWidth = el.scrollWidth;
        rect.scrollHeight = el.scrollHeight;
        rect.overflow = getComputedStyle(el).overflow !== "visible";
    }
    return rect;
}
export function getDirection(target: SVGElement | HTMLElement) {
    if (!target) {
        return;
    }
    const direciton = target.getAttribute("data-direction")!;

    if (!direciton) {
        return;
    }
    const dir = [0, 0];

    (direciton.indexOf("w") > -1) && (dir[0] = -1);
    (direciton.indexOf("e") > -1) && (dir[0] = 1);
    (direciton.indexOf("n") > -1) && (dir[1] = -1);
    (direciton.indexOf("s") > -1) && (dir[1] = 1);

    return dir;
}
export function getAbsolutePoses(poses: number[][], dist: number[]) {
    return [
        plus(dist, poses[0]),
        plus(dist, poses[1]),
        plus(dist, poses[2]),
        plus(dist, poses[3]),
    ];
}
export function getAbsolutePosesByState({
    left,
    top,
    pos1,
    pos2,
    pos3,
    pos4,
}: {
    left: number,
    top: number,
    pos1: number[],
    pos2: number[],
    pos3: number[],
    pos4: number[],
}) {
    return getAbsolutePoses([pos1, pos2, pos3, pos4], [left, top]);
}
export function roundSign(num: number) {
    return Math.round(num % 1 === -0.5 ? num - 1 : num);
}
export function unset(self: any, name: string) {
    self[name]?.unset();
    self[name] = null;
}


export function fillParams<T extends IObject<any>>(
    moveable: any,
    e: any,
    params: ExcludeParams<T>,
    isBeforeEvent?: boolean,
): T {
    const datas = e.datas;

    if (!datas.datas) {
        datas.datas = {};
    }
    const nextParams = {
        ...params,
        target: moveable.state.target,
        clientX: e.clientX,
        clientY: e.clientY,
        inputEvent: e.inputEvent,
        currentTarget: moveable,
        moveable,
        datas: datas.datas,
    } as any;

    if (!datas.isStartEvent) {
        datas.isStartEvent = true;
    } else if (!isBeforeEvent) {
        datas.lastEvent = nextParams;
    }
    return nextParams;
}
export function fillEndParams<T extends IObject<any>>(
    moveable: any,
    e: any,
    params: ExcludeEndParams<T> & { isDrag?: boolean },
): T {
    const datas = e.datas;
    const isDrag = "isDrag" in params ? params.isDrag : e.isDrag;

    if (!datas.datas) {
        datas.datas = {};
    }

    return {
        isDrag,
        ...params,
        moveable,
        target: moveable.state.target,
        clientX: e.clientX,
        clientY: e.clientY,
        inputEvent: e.inputEvent,
        currentTarget: moveable,
        lastEvent: datas.lastEvent,
        isDouble: e.isDouble,
        datas: datas.datas,
    } as any;
}
export function catchEvent<EventName extends keyof Props, Props extends IObject<any> = MoveableProps>(
    moveable: any,
    name: EventName,
    callback: (e: Props[EventName] extends ((e: infer P) => any) | undefined ? P : IObject<any>) => void,
): any {
    moveable._emitter.on(name, callback);
}

export function triggerEvent<EventName extends keyof Props, Props extends IObject<any> = MoveableProps>(
    moveable: any,
    name: EventName,
    params: Props[EventName] extends ((e: infer P) => any) | undefined ? P : IObject<any>,
    isManager?: boolean,
): any {
    return moveable.triggerEvent(name, params, isManager);
}

export function getComputedStyle(el: Element, pseudoElt?: string | null) {
    return window.getComputedStyle(el, pseudoElt);
}

export function filterAbles(
    ables: Able[], methods: Array<keyof Able>,
    triggerAblesSimultaneously?: boolean,
) {
    const enabledAbles: IObject<boolean> = {};
    const ableGroups: IObject<boolean> = {};

    return ables.filter(able => {
        const name = able.name;

        if (enabledAbles[name] || !methods.some(method => able[method])) {
            return false;
        }
        if (!triggerAblesSimultaneously && able.ableGroup) {
            if (ableGroups[able.ableGroup]) {
                return false;
            }
            ableGroups[able.ableGroup] = true;
        }
        enabledAbles[name] = true;
        return true;
    });
}

export function equals(a1: any, a2: any) {
    return a1 === a2 || (a1 == null && a2 == null);
}

export function selectValue<T = any>(...values: any[]): T {
    const length = values.length - 1;
    for (let i = 0; i < length; ++i) {
        const value = values[i];

        if (!isUndefined(value)) {
            return value;
        }
    }

    return values[length];
}

export function groupBy<T>(arr: T[], func: (el: T, index: number, arr: T[]) => any) {
    const groups: T[][] = [];
    const groupKeys: any[] = [];

    arr.forEach((el, index) => {
        const groupKey = func(el, index, arr);
        const keyIndex = groupKeys.indexOf(groupKey);
        const group = groups[keyIndex] || [];

        if (keyIndex === -1) {
            groupKeys.push(groupKey);
            groups.push(group);
        }
        group.push(el);
    });
    return groups;
}
export function groupByMap<T>(arr: T[], func: (el: T, index: number, arr: T[]) => string | number) {
    const groups: T[][] = [];
    const groupKeys: IObject<T[]> = {};

    arr.forEach((el, index) => {
        const groupKey = func(el, index, arr);
        let group = groupKeys[groupKey];

        if (!group) {
            group = [];
            groupKeys[groupKey] = group;
            groups.push(group);
        }
        group.push(el);
    });
    return groups;
}
export function flat<T>(arr: T[][]): T[] {
    return arr.reduce((prev, cur) => {
        return prev.concat(cur);
    }, []);
}

export function equalSign(a: number, b: number) {
    return (a >= 0 && b >= 0) || (a < 0 && b < 0);
}

export function maxOffset(...args: number[]) {
    args.sort((a, b) => Math.abs(b) - Math.abs(a));

    return args[0];
}
export function minOffset(...args: number[]) {
    args.sort((a, b) => Math.abs(a) - Math.abs(b));

    return args[0];
}

export function calculateInversePosition(matrix: number[], pos: number[], n: number) {
    return calculate(
        invert(matrix, n),
        convertPositionMatrix(pos, n),
        n,
    );
}
export function convertDragDist(state: MoveableManagerState, e: any) {
    const {
        is3d,
        rootMatrix,
    } = state;
    const n = is3d ? 4 : 3;
    [
        e.distX, e.distY,
    ] = calculateInversePosition(rootMatrix, [e.distX, e.distY], n);

    return e;
}

export function calculatePadding(
    matrix: number[], pos: number[],
    transformOrigin: number[], origin: number[], n: number,
) {
    return minus(calculatePosition(matrix, plus(transformOrigin, pos), n), origin);
}

export function convertCSSSize(value: number, size: number, isRelative?: boolean) {
    return isRelative ? `${value / size * 100}%` : `${value}px`;
}

export function getTinyDist(v: number) {
    return Math.abs(v) <= TINY_NUM ? 0 : v;
}

export function directionCondition(moveable: any, e: any) {
    if (e.isRequest) {
        if (e.requestAble === "resizable" || e.requestAble === "scalable") {
            return e.parentDirection!;
        } else {
            return false;
        }
    }
    return hasClass(e.inputEvent.target, prefix("direction"));
}

export function invertObject<T extends IObject<any>>(obj: T): InvertObject<T> {
    const nextObj: IObject<any> = {};

    for (const name in obj) {
        nextObj[obj[name]] = name;
    }
    return nextObj as any;
}

export function convertTransformInfo(transforms: string[], index: number) {
    const beforeFunctionTexts = transforms.slice(0, index < 0 ? undefined : index);
    const beforeFunctionTexts2 = transforms.slice(0, index < 0 ? undefined : index + 1);
    const targetFunctionText = transforms[index] || "";
    const afterFunctionTexts = index < 0 ? [] : transforms.slice(index);
    const afterFunctionTexts2 = index < 0 ? [] : transforms.slice(index + 1);

    const beforeFunctions = parse(beforeFunctionTexts);
    const beforeFunctions2 = parse(beforeFunctionTexts2);
    const targetFunctions = parse([targetFunctionText]);
    const afterFunctions = parse(afterFunctionTexts);
    const afterFunctions2 = parse(afterFunctionTexts2);


    const beforeFunctionMatrix = toMat(beforeFunctions);
    const beforeFunctionMatrix2 = toMat(beforeFunctions2);
    const afterFunctionMatrix = toMat(afterFunctions);
    const afterFunctionMatrix2 = toMat(afterFunctions2);
    const allFunctionMatrix = multiply(
        beforeFunctionMatrix,
        afterFunctionMatrix,
        4,
    );
    return {
        transforms,
        beforeFunctionMatrix,
        beforeFunctionMatrix2,
        targetFunctionMatrix: toMat(targetFunctions),
        afterFunctionMatrix,
        afterFunctionMatrix2,
        allFunctionMatrix,
        beforeFunctions,
        beforeFunctions2,
        targetFunction: targetFunctions[0],
        afterFunctions,
        afterFunctions2,
        beforeFunctionTexts,
        beforeFunctionTexts2,
        targetFunctionText,
        afterFunctionTexts,
        afterFunctionTexts2,
    };
}

export function isArrayFormat<T = any>(arr: any): arr is ArrayFormat<T> {
    if (!arr || !isObject(arr)) {
        return false;
    }
    if (arr instanceof Element) {
        return false;
    }
    return isArray(arr) || "length" in arr;
}

export function getRefTarget<T extends Element = HTMLElement | SVGElement>(
    target: MoveableRefType<T>, isSelector: true): T | null;
export function getRefTarget<T extends Element = HTMLElement | SVGElement>(
    target: MoveableRefType<T>, isSelector?: boolean): T | string | null;
export function getRefTarget<T extends Element = HTMLElement | SVGElement>(
    target: MoveableRefType<T>,
    isSelector?: boolean,
): any {
    if (!target) {
        return null;
    }
    if (isString(target)) {
        if (isSelector) {
            return document.querySelector(target);
        }
        return target;
    }
    if (isFunction(target)) {
        return target();
    }
    if ("current" in target) {
        return target.current;
    }
    return target;
}

export function getRefTargets(
    targets: MoveableRefType | ArrayFormat<MoveableRefType>,
    isSelector: true): Array<HTMLElement | SVGElement | null>;
export function getRefTargets(
    targets: MoveableRefType | ArrayFormat<MoveableRefType>,
    isSelector?: boolean): Array<HTMLElement | SVGElement | string | null>;
export function getRefTargets(targets: MoveableRefType | ArrayFormat<MoveableRefType>, isSelector?: boolean) {
    if (!targets) {
        return [];
    }
    const userTargets = isArrayFormat(targets) ? [].slice.call(targets) : [targets];

    return userTargets.reduce((prev, target) => {
        if (isString(target) && isSelector) {
            return [...prev, ...[].slice.call(document.querySelectorAll<HTMLElement>(target))];
        }
        prev.push(getRefTarget(target, isSelector));
        return prev;
    }, [] as Array<SVGElement | HTMLElement | string | null | undefined>);
}

export function getElementTargets(
    targets: Array<SVGElement | HTMLElement | string | null | undefined>,
    selectorMap: IObject<Array<HTMLElement | SVGElement>>,
) {
    const elementTargets: Array<SVGElement | HTMLElement> = [];
    targets.forEach(target => {
        if (!target) {
            return;
        }
        if (isString(target)) {
            if (selectorMap[target]) {
                elementTargets.push(...selectorMap[target]);
            }
            return;
        }
        elementTargets.push(target);
    });

    return elementTargets;
}

export function minmax(...values: number[]) {
    return [Math.min(...values), Math.max(...values)];
}


export function getAbsoluteRotation(pos1: number[], pos2: number[], direction: number) {
    let deg = getRad(pos1, pos2) / Math.PI * 180;

    deg = direction >= 0 ? deg : 180 - deg;
    deg = deg >= 0 ? deg : 360 + deg;

    return deg;
}


export function getDragDistByState(state: MoveableManagerState, dist: number[]) {
    const {
        rootMatrix,
        is3d,
    } = state;
    const n = is3d ? 4 : 3;

    let inverseMatrix = invert(rootMatrix, n);

    if (!is3d) {
        inverseMatrix = convertDimension(inverseMatrix, 3, 4);
    }
    inverseMatrix[12] = 0;
    inverseMatrix[13] = 0;
    inverseMatrix[14] = 0;

    return calculateMatrixDist(inverseMatrix, dist);
}

export function getSizeDistByDist(
    startSize: number[],
    dist: number[],
    ratio: number,
    direction: number[],
    keepRatio?: boolean,
) {
    const [startOffsetWidth, startOffsetHeight] = startSize;
    let distWidth = 0;
    let distHeight = 0;

    if (keepRatio && startOffsetWidth && startOffsetHeight) {
        const rad = getRad([0, 0], dist);
        const standardRad = getRad([0, 0], direction);
        const size = getDistSize(dist);
        const signSize = Math.cos(rad - standardRad) * size;

        if (!direction[0]) {
            // top, bottom
            distHeight = signSize;
            distWidth = distHeight * ratio;
        } else if (!direction[1]) {
            // left, right
            distWidth = signSize;
            distHeight = distWidth / ratio;
        } else {
            // two-way
            const startWidthSize = direction[0] * 2 * startOffsetWidth;
            const startHeightSize = direction[1] * 2 * startOffsetHeight;
            const distSize = getDistSize([startWidthSize + dist[0], startHeightSize + dist[1]])
                - getDistSize([startWidthSize, startHeightSize]);
            const ratioRad = getRad([0, 0], [ratio, 1]);

            distWidth = Math.cos(ratioRad) * distSize;
            distHeight = Math.sin(ratioRad) * distSize;
        }
    } else {
        distWidth = direction[0] * dist[0];
        distHeight = direction[1] * dist[1];
    }

    return [distWidth, distHeight];
}
export function getOffsetSizeDist(
    sizeDirection: number[],
    keepRatio: boolean,
    datas: any,
    e: any,
) {
    const {
        ratio,
        startOffsetWidth,
        startOffsetHeight,
    } = datas;
    let distWidth = 0;
    let distHeight = 0;
    const {
        distX,
        distY,
        parentDistance,
        parentDist,
        parentScale,
        isPinch,
    } = e;
    const startFixedDirection = datas.fixedDirection;

    if (parentDist) {
        distWidth = parentDist[0];
        distHeight = parentDist[1];

        if (keepRatio) {
            if (!distWidth) {
                distWidth = distHeight * ratio;
            } else if (!distHeight) {
                distHeight = distWidth / ratio;
            }
        }
    } else if (parentScale) {
        distWidth = (parentScale[0] - 1) * startOffsetWidth;
        distHeight = (parentScale[1] - 1) * startOffsetHeight;
    } else if (isPinch) {
        if (parentDistance) {
            distWidth = parentDistance;
            distHeight = parentDistance * startOffsetHeight / startOffsetWidth;
        }
    } else {
        let dist = getDragDist({ datas, distX, distY });

        dist = [0, 1].map(index => {
            let directionRatio = Math.abs(sizeDirection[index] - startFixedDirection[index]);

            if (directionRatio !== 0) {
                directionRatio = 2 / directionRatio;
            }
            return dist[index] * directionRatio;
        });
        [distWidth, distHeight] = getSizeDistByDist(
            [startOffsetWidth, startOffsetHeight],
            dist,
            ratio,
            sizeDirection,
            keepRatio,
        );
    }
    return {
        // direction,
        // sizeDirection,
        distWidth,
        distHeight,
    };
}
