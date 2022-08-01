import { isObject, throttle } from "@daybrush/utils";
import { diff } from "@egjs/children-differ";
import { minus } from "@scena/matrix";
import { getMinMaxs } from "overlap-area";
import {
    MoveableManagerInterface, SnappableProps,
    SnappableState, SnapGuideline, SnapDirectionPoses, PosGuideline, ElementGuidelineValue, SnapElementRect,
} from "../../types";
import { getRect, getAbsolutePosesByState, getRefTarget, calculateInversePosition, roundSign } from "../../utils";
import {
    splitSnapDirectionPoses, getSnapDirections,
    HORIZONTAL_NAMES_MAP, VERTICAL_NAMES_MAP, calculateContainerPos,
} from "./utils";

export function getTotalGuidelines(
    moveable: MoveableManagerInterface<SnappableProps, SnappableState>,
) {
    const {
        snapOffset,
        containerClientRect: {
            overflow,
            scrollHeight: containerHeight,
            scrollWidth: containerWidth,
            clientHeight: containerClientHeight,
            clientWidth: containerClientWidth,
            clientLeft,
            clientTop,
        },
    } = moveable.state;
    const {
        snapGap = true,
        verticalGuidelines,
        horizontalGuidelines,
        snapThreshold = 5,
        snapGridWidth = 0,
        snapGridHeight = 0,
        maxSnapElementGuidelineDistance = Infinity,
    } = moveable.props;
    const { top, left, bottom, right } = getRect(getAbsolutePosesByState(moveable.state));
    const targetRect = { top, left, bottom, right, center: (left + right) / 2, middle: (top + bottom) / 2 };
    const elementGuidelines = getElementGuidelines(moveable);
    let totalGuidelines: SnapGuideline[] = [...elementGuidelines];

    if (snapGap) {
        totalGuidelines.push(...getGapGuidelines(
            moveable, targetRect, snapThreshold,
        ));
    }
    totalGuidelines.push(...getGridGuidelines(
        snapGridWidth,
        snapGridHeight,
        overflow ? containerWidth! : containerClientWidth!,
        overflow ? containerHeight! : containerClientHeight!,
        clientLeft,
        clientTop,
    ));

    totalGuidelines.push(...getDefaultGuidelines(
        horizontalGuidelines || false,
        verticalGuidelines || false,
        overflow ? containerWidth! : containerClientWidth!,
        overflow ? containerHeight! : containerClientHeight!,
        clientLeft,
        clientTop,
        snapOffset,
    ));

    totalGuidelines = totalGuidelines.filter(({ element, elementRect, type }) => {
        if (!element || !elementRect) {
            return true;
        }
        const rect = elementRect.rect;

        return checkBetweenRects(targetRect, rect, type, maxSnapElementGuidelineDistance);
    });

    return totalGuidelines;
}

export function getGapGuidelines(
    moveable: MoveableManagerInterface<SnappableProps, SnappableState>,
    targetRect: SnapDirectionPoses,
    snapThreshold: number,
) {
    const {
        maxSnapElementGuidelineDistance = Infinity,
    } = moveable.props;
    const elementRects = moveable.state.elementRects;
    const gapGuidelines: SnapGuideline[] = [];
    [
        ["vertical", VERTICAL_NAMES_MAP, HORIZONTAL_NAMES_MAP] as const,
        ["horizontal", HORIZONTAL_NAMES_MAP, VERTICAL_NAMES_MAP] as const,
    ].forEach(([type, mainNames, sideNames]) => {
        const targetStart = targetRect[mainNames.start]!;
        const targetEnd = targetRect[mainNames.end]!;
        const targetCenter = targetRect[mainNames.center]!;
        const targetStart2 = targetRect[sideNames.start]!;
        const targetEnd2 = targetRect[sideNames.end]!;

        // element : moveable
        function getDist(elementRect: SnapElementRect) {
            const rect = elementRect.rect;

            if (rect[mainNames.end]! < targetStart + snapThreshold) {
                return targetStart - rect[mainNames.end]!;
            } else if (targetEnd - snapThreshold < rect[mainNames.start]!) {
                return rect[mainNames.start]! - targetEnd;
            } else {
                return -1;
            }
        }
        const nextElementRects = elementRects.filter(elementRect => {
            const rect = elementRect.rect;

            if (rect[sideNames.start]! > targetEnd2 || rect[sideNames.end]! < targetStart2) {
                return false;
            }

            return getDist(elementRect) > 0;
        }).sort((a, b) => {
            return getDist(a) - getDist(b);
        });

        const groups: SnapElementRect[][] = [];

        nextElementRects.forEach(snapRect1 => {
            nextElementRects.forEach(snapRect2 => {
                if (snapRect1 === snapRect2) {
                    return;
                }
                const { rect: rect1 } = snapRect1;
                const { rect: rect2 } = snapRect2;

                const rect1Start = rect1[sideNames.start]!;
                const rect1End = rect1[sideNames.end]!;
                const rect2Start = rect2[sideNames.start]!;
                const rect2End = rect2[sideNames.end]!;

                if (rect1Start > rect2End || rect2Start > rect1End) {
                    return;
                }

                groups.push([snapRect1, snapRect2]);
            });
        });

        groups.forEach(([snapRect1, snapRect2]) => {
            const { rect: rect1 } = snapRect1;
            const { rect: rect2 } = snapRect2;

            const rect1Start = rect1[mainNames.start]!;
            const rect1End = rect1[mainNames.end]!;
            const rect2Start = rect2[mainNames.start]!;
            const rect2End = rect2[mainNames.end]!;
            let gap = 0;
            let pos = 0;
            let isStart = false;
            let isCenter = false;
            let isEnd = false;

            if (rect1End <= targetStart && targetEnd <= rect2Start) {
                // (l)element1(r) : (l)target(r) : (l)element2(r)
                isCenter = true;
                gap = ((rect2Start - rect1End) - (targetEnd - targetStart)) / 2;
                pos = rect1End + gap + (targetEnd - targetStart) / 2;

                if (Math.abs(pos - targetCenter) > snapThreshold) {
                    return;
                }
            } else if (rect1End < rect2Start && rect2End < targetStart + snapThreshold) {
                // (l)element1(r) : (l)element2(r) : (l)target
                isStart = true;

                gap = rect2Start - rect1End;
                pos = rect2End + gap;

                if (Math.abs(pos - targetStart) > snapThreshold) {
                    return;
                }
            } else if (rect1End < rect2Start && targetEnd - snapThreshold < rect1Start) {
                // target(r) : (l)element1(r) : (l)element2(r)

                isEnd = true;
                gap = rect2Start - rect1End;
                pos = rect1Start - gap;

                if (Math.abs(pos - targetEnd) > snapThreshold) {
                    return;
                }
            } else {
                return;
            }
            if (!gap) {
                return;
            }
            if (!checkBetweenRects(targetRect, rect2, type, maxSnapElementGuidelineDistance)) {
                return;
            }
            gapGuidelines.push({
                type,
                pos: type === "vertical" ? [pos, 0] : [0, pos],
                element: snapRect2.element,
                size: 0,
                className: snapRect2.className,
                isStart,
                isCenter,
                isEnd,
                gap,
                hide: true,
                gapRects: [snapRect1, snapRect2],
            });
        });
    });
    return gapGuidelines;
}
export function getGridGuidelines(
    snapGridWidth: number,
    snapGridHeight: number,
    containerWidth: number,
    containerHeight: number,
    clientLeft = 0,
    clientTop = 0,
): SnapGuideline[] {
    const guidelines: SnapGuideline[] = [];

    if (snapGridHeight) {
        for (let pos = 0; pos <= containerHeight; pos += snapGridHeight) {
            guidelines.push({
                type: "horizontal",
                pos: [0, throttle(pos - clientTop, 0.1)],
                size: containerWidth!,
                hide: true,
            });
        }
    }
    if (snapGridWidth) {
        for (let pos = 0; pos <= containerWidth; pos += snapGridWidth) {
            guidelines.push({
                type: "vertical",
                pos: [throttle(pos - clientLeft, 0.1), 0],
                size: containerHeight!,
                hide: true,
            });
        }
    }
    return guidelines;
}

export function checkBetweenRects(
    rect1: SnapDirectionPoses,
    rect2: SnapDirectionPoses,
    type: "horizontal" | "vertical",
    distance: number,
) {
    if (type === "horizontal") {
        return Math.abs(rect1.right! - rect2.left!) <= distance
            || Math.abs(rect1.left! - rect2.right!) <= distance
            || rect1.left! <= rect2.right! && rect2.left! <= rect1.right!;
    } else if (type === "vertical") {
        return Math.abs(rect1.bottom! - rect2.top!) <= distance
            || Math.abs(rect1.top! - rect2.bottom!) <= distance
            || rect1.top! <= rect2.bottom! && rect2.top! <= rect1.bottom!;
    }
    return true;
}


export function getElementGuidelines(
    moveable: MoveableManagerInterface<SnappableProps, SnappableState>,
) {
    const state = moveable.state;

    const {
        elementGuidelines = [],
    } = moveable.props;

    if (!elementGuidelines.length) {
        state.elementRects = [];
        return [];
    }

    const prevValues = (state.elementRects || []).filter(snapRect => !snapRect.refresh);
    const nextElementGuidelines = elementGuidelines.map(el => {
        if (isObject(el) && "element" in el) {
            return {
                ...el,
                element: getRefTarget(el.element, true)!,
            };
        }
        return {
            element: getRefTarget(el, true)!,
        };
    }).filter(value => {
        return value.element;
    }) as ElementGuidelineValue[];

    const {
        maintained,
        added,
    } = diff(prevValues.map(v => v.element), nextElementGuidelines.map(v => v.element));


    const nextValues: SnapElementRect[] = [];
    maintained.forEach(([prevIndex, nextIndex]) => {
        nextValues[nextIndex] = prevValues[prevIndex];
    });

    getSnapElementRects(moveable, added.map(index => nextElementGuidelines[index])).map((rect, i) => {
        nextValues[added[i]] = rect;
    });


    state.elementRects = nextValues;
    const elementSnapDirections = getSnapDirections(moveable.props.elementSnapDirections);
    const nextGuidelines: SnapGuideline[] = [];

    nextValues.forEach(snapRect => {
        const {
            element,
            top: topValue = elementSnapDirections.top,
            left: leftValue = elementSnapDirections.left,
            right: rightValue = elementSnapDirections.right,
            bottom: bottomValue = elementSnapDirections.bottom,
            center: centerValue = elementSnapDirections.center,
            middle: middleValue = elementSnapDirections.middle,
            className,
            rect,
        } = snapRect;
        const {
            horizontal,
            vertical,
        } = splitSnapDirectionPoses({
            top: topValue,
            right: rightValue,
            left: leftValue,
            bottom: bottomValue,
            center: centerValue,
            middle: middleValue,
        }, rect);
        const rectTop = rect.top!;
        const rectLeft = rect.left!;
        const width = rect.right! - rectLeft;
        const height = rect.bottom! - rectTop;
        const sizes = [width, height];

        vertical.forEach(pos => {
            nextGuidelines.push({
                type: "vertical", element, pos: [
                    throttle(pos, 0.1),
                    rectTop,
                ], size: height,
                sizes,
                className,
                elementRect: snapRect,
            });
        });
        horizontal.forEach(pos => {
            nextGuidelines.push({
                type: "horizontal", element, pos: [
                    rectLeft,
                    throttle(pos, 0.1),
                ], size: width,
                sizes,
                className,
                elementRect: snapRect,
            });
        });
    });

    return nextGuidelines;
}


export function getDefaultGuidelines(
    horizontalGuidelines: Array<PosGuideline | number> | false,
    verticalGuidelines: Array<PosGuideline | number> | false,
    width: number,
    height: number,
    clientLeft = 0,
    clientTop = 0,
    snapOffset = { left: 0, top: 0, right: 0, bottom: 0 },
): SnapGuideline[] {
    const guidelines: SnapGuideline[] = [];
    const {
        left: snapOffsetLeft,
        top: snapOffsetTop,
        bottom: snapOffsetBottom,
        right: snapOffsetRight,
    } = snapOffset;
    const snapWidth = width! + snapOffsetRight - snapOffsetLeft;
    const snapHeight = height! + snapOffsetBottom - snapOffsetTop;

    horizontalGuidelines && horizontalGuidelines!.forEach(posInfo => {
        const nextPosInfo = isObject(posInfo) ? posInfo : { pos: posInfo };

        guidelines.push({
            type: "horizontal", pos: [
                snapOffsetLeft,
                throttle(nextPosInfo.pos - clientTop + snapOffsetTop, 0.1),
            ], size: snapWidth,
            className: nextPosInfo.className,
        });
    });
    verticalGuidelines && verticalGuidelines!.forEach(posInfo => {
        const nextPosInfo = isObject(posInfo) ? posInfo : { pos: posInfo };

        guidelines.push({
            type: "vertical", pos: [
                throttle(nextPosInfo.pos - clientLeft + snapOffsetLeft, 0.1),
                snapOffsetTop,
            ], size: snapHeight,
            className: nextPosInfo.className,
        });
    });
    return guidelines;
}



export function getSnapElementRects(
    moveable: MoveableManagerInterface<SnappableProps, SnappableState>,
    values: ElementGuidelineValue[],
): SnapElementRect[] {
    if (!values.length) {
        return [];
    }
    const state = moveable.state;
    const {
        containerClientRect,
        targetClientRect: {
            top: clientTop,
            left: clientLeft,
        },
        rootMatrix,
        is3d,
    } = state;
    const n = is3d ? 4 : 3;
    const [containerLeft, containerTop] = calculateContainerPos(rootMatrix, containerClientRect, n);
    const poses = getAbsolutePosesByState(state);
    const {
        minX: targetLeft,
        minY: targetTop,
    } = getMinMaxs(poses);
    const [distLeft, distTop] = minus([targetLeft, targetTop], calculateInversePosition(rootMatrix, [
        clientLeft - containerLeft,
        clientTop - containerTop,
    ], n)).map(pos => roundSign(pos));

    return values.map(value => {
        const rect = value.element.getBoundingClientRect();
        const left = rect.left - containerLeft;
        const top = rect.top - containerTop;
        const bottom = top + rect.height;
        const right = left + rect.width;
        const [elementLeft, elementTop] = calculateInversePosition(rootMatrix, [left, top], n);
        const [elementRight, elementBottom] = calculateInversePosition(rootMatrix, [right, bottom], n);

        return {
            ...value,
            rect: {
                left: elementLeft + distLeft,
                right: elementRight + distLeft,
                top: elementTop + distTop,
                bottom: elementBottom + distTop,
                center: (elementLeft + elementRight) / 2 + distLeft,
                middle: (elementTop + elementBottom) / 2 + distTop,
            },
        };
    });
}

