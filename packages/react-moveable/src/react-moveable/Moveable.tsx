import * as React from "react";
import { MOVEABLE_CSS, PREFIX } from "./consts";
import {
    prefix, getLineStyle,
    getTargetInfo,
    getControlTransform,
    caculateMoveablePosition,
    getRotationInfo,
    caculateMatrixStack,
    getMiddleLinePos,
    unset,
    createIdentityMatrix3,
    caculatePosition,
    getOrientationDirection,
    isInside,
} from "./utils";
import styler from "react-css-styler";
import Dragger from "@daybrush/drag";
import { ref } from "framework-utils";
import { MoveableState, MoveableProps } from "./types";
import { getDraggableDragger } from "./DraggableDragger";
import { getMoveableDragger } from "./MoveableDragger";
import { minus, sum, getOrigin } from "./matrix";

const ControlBoxElement = styler("div", MOVEABLE_CSS);

export default class Moveable extends React.PureComponent<MoveableProps, MoveableState> {
    public static defaultProps: Required<MoveableProps> = {
        target: null,
        container: null,
        rotatable: false,
        draggable: false,
        scalable: false,
        resizable: false,
        warpable: false,
        pinchable: false,
        keepRatio: true,
        origin: true,
        throttleDrag: 0,
        throttleResize: 0,
        throttleScale: 0,
        throttleRotate: 0,
        onRotateStart: () => { },
        onRotate: () => { },
        onRotateEnd: () => { },
        onDragStart: () => { },
        onDrag: () => { },
        onDragEnd: () => { },
        onScaleStart: () => { },
        onScale: () => { },
        onScaleEnd: () => { },
        onResizeStart: () => { },
        onResize: () => { },
        onResizeEnd: () => { },
        onWarpStart: () => { },
        onWarp: () => { },
        onWarpEnd: () => { },
        onPinchStart: () => { },
        onPinch: () => { },
        onPinchEnd: () => { },
    };
    public state: MoveableState = {
        target: null,
        beforeMatrix: createIdentityMatrix3(),
        matrix: createIdentityMatrix3(),
        targetMatrix: createIdentityMatrix3(),
        targetTransform: "",
        is3d: false,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transformOrigin: [0, 0],
        direction: 1,
        beforeDirection: 1,
        rotationRad: 0,
        rotationPos: [0, 0],
        beforeOrigin: [0, 0],
        origin: [0, 0],
        pos1: [0, 0],
        pos2: [0, 0],
        pos3: [0, 0],
        pos4: [0, 0],
        isDrag: false,
        isRotate: false,
        isScale: false,
        isResize: false,
        isPinch: false,
        isWarp: false,
    };
    private moveableDragger!: Dragger;
    private draggableDragger!: Dragger;
    private pinchableDragger!: Dragger;
    private controlBox!: typeof ControlBoxElement extends new (...args: any[]) => infer U ? U : never;

    public isInside(clientX: number, clientY: number) {
        const target = this.props.target;
        if (!target) {
            return false;
        }
        const { pos1, pos2, pos3, pos4 } = this.state;
        const { left, top } = target.getBoundingClientRect();
        const pos = [clientX - left, clientY - top];

        return isInside(pos, pos1, pos2, pos3, pos4);
    }
    public isMoveableElement(target: HTMLElement) {
        return target && ((target.getAttribute("class") || "").indexOf(PREFIX) > -1);
    }
    public render() {
        if (this.state.target !== this.props.target) {
            this.updateRect(true);
        }
        const { left, top, pos1, pos2, pos3, pos4, target, direction } = this.state;

        return (
            <ControlBoxElement
                ref={ref(this, "controlBox")}
                className={prefix("control-box", direction === -1 ? "reverse" : "")} style={{
                    position: this.props.container ? "absolute" : "fixed",
                    display: target ? "block" : "none",
                    transform: `translate(${left}px, ${top}px) translateZ(50px)`,
                }}>
                <div className={prefix("line")} style={getLineStyle(pos1, pos2)}></div>
                <div className={prefix("line")} style={getLineStyle(pos2, pos4)}></div>
                <div className={prefix("line")} style={getLineStyle(pos1, pos3)}></div>
                <div className={prefix("line")} style={getLineStyle(pos3, pos4)}></div>
                {this.renderRotation()}
                {this.renderPosition()}
                {this.renderMiddleLine()}
                {this.renderDiagonalPosition()}
                {this.renderOrigin()}
            </ControlBoxElement>
        );
    }
    public componentDidMount() {
        /* rotatable */
        /* resizable */
        /* scalable */
        /* warpable */
        this.moveableDragger = getMoveableDragger(this, this.controlBox.getElement());
    }
    public componentWillUnmount() {
        unset(this, "draggableDragger");
        unset(this, "moveableDragger");
    }
    public renderRotation() {
        if (!this.props.rotatable) {
            return null;
        }

        const { pos1, pos2, rotationRad } = this.state;

        return (
            <div className={prefix("line rotation")} style={{
                // tslint:disable-next-line: max-line-length
                transform: `translate(${(pos1[0] + pos2[0]) / 2}px, ${(pos1[1] + pos2[1]) / 2}px) translateY(-40px) rotate(${rotationRad}rad)`,
            }}>
                <div className={prefix("control", "rotation")} ref={ref(this, "rotationElement")}></div>
            </div>
        );
    }
    public renderOrigin() {
        if (!this.props.origin) {
            return null;
        }
        const { beforeOrigin } = this.state;

        return [
            // <div className={prefix("control", "origin")} style={getControlTransform(origin)} key="origin"></div>,
            <div className={prefix("control", "origin")}
                style={getControlTransform(beforeOrigin)} key="beforeOrigin"></div>,
        ];
    }
    public renderDiagonalPosition() {
        const { resizable, scalable, warpable } = this.props;
        if (!resizable && !scalable && !warpable) {
            return null;
        }
        const { pos1, pos2, pos3, pos4 } = this.state;
        return [
            <div className={prefix("control", "nw")} data-position="nw" key="nw"
                style={getControlTransform(pos1)}></div>,
            <div className={prefix("control", "ne")} data-position="ne" key="ne"
                style={getControlTransform(pos2)}></div>,
            <div className={prefix("control", "sw")} data-position="sw" key="sw"
                style={getControlTransform(pos3)}></div>,
            <div className={prefix("control", "se")} data-position="se" key="se"
                style={getControlTransform(pos4)}></div>,
        ];
    }
    public renderMiddleLine() {
        const { resizable, scalable, warpable } = this.props;
        if (resizable || scalable || !warpable) {
            return;
        }
        const { pos1, pos2, pos3, pos4 } = this.state;

        const linePosFrom1 = getMiddleLinePos(pos1, pos2);
        const linePosFrom2 = getMiddleLinePos(pos2, pos1);
        const linePosFrom3 = getMiddleLinePos(pos1, pos3);
        const linePosFrom4 = getMiddleLinePos(pos3, pos1);
        const linePosTo1 = getMiddleLinePos(pos3, pos4);
        const linePosTo2 = getMiddleLinePos(pos4, pos3);
        const linePosTo3 = getMiddleLinePos(pos2, pos4);
        const linePosTo4 = getMiddleLinePos(pos4, pos2);

        return [
            <div className={prefix("line")} key="middeLine1" style={getLineStyle(linePosFrom1, linePosTo1)}></div>,
            <div className={prefix("line")} key="middeLine2" style={getLineStyle(linePosFrom2, linePosTo2)}></div>,
            <div className={prefix("line")} style={getLineStyle(linePosFrom3, linePosTo3)}></div>,
            <div className={prefix("line")} style={getLineStyle(linePosFrom4, linePosTo4)}></div>,
        ];
    }
    public renderPosition() {
        if (!this.props.resizable && !this.props.scalable) {
            return null;
        }
        const { pos1, pos2, pos3, pos4 } = this.state;
        return [
            <div className={prefix("control", "n")} data-position="n" key="n"
                style={getControlTransform(pos1, pos2)}></div>,
            <div className={prefix("control", "w")} data-position="w" key="w"
                style={getControlTransform(pos1, pos3)}></div>,
            <div className={prefix("control", "e")} data-position="e" key="e"
                style={getControlTransform(pos2, pos4)}></div>,
            <div className={prefix("control", "s")} data-position="s" key="s"
                style={getControlTransform(pos3, pos4)}></div>,
        ];

    }
    public dragstart(e: any) {
        if (this.draggableDragger) {
            this.draggableDragger.onDragStart(e);
        }
    }
    public updateRect(isNotSetState?: boolean) {
        const { target, container, draggable, pinchable } = this.props;
        const state = this.state;

        if (state.target !== target) {
            unset(this, "draggableDragger");
            this.updateState({
                isDrag: false,
                isRotate: false,
                isScale: false,
                isResize: false,
                isWarp: false,
                isPinch: false,
            }, true);
            if (target && (draggable || pinchable)) {
                this.draggableDragger = getDraggableDragger(this, target, draggable, pinchable);
            }
        }
        this.updateState(getTargetInfo(target, container), isNotSetState);
    }
    public updateTarget() {
        const {
            width,
            height,
            beforeMatrix,
            is3d,
        } = this.state;
        const {
            target, container,
        } = this.props;
        let n = is3d ? 4 : 3;
        const [, offsetMatrix, matrix, targetMatrix, targetTransform, transformOrigin] = caculateMatrixStack(
            target!,
            container!,
            true,
            beforeMatrix,
            n,
        );
        const [
            [left, top],
            nextOrigin,
            pos1,
            pos2,
            pos3,
            pos4,
            direction,
        ] = caculateMoveablePosition(
            matrix,
            transformOrigin, width, height,
        );
        n = offsetMatrix.length === 16 ? 4 : 3;
        const beforeOrigin = minus(
            caculatePosition(offsetMatrix, sum(transformOrigin, getOrigin(targetMatrix, n)), n),
            [left, top],
        );
        const [rotationRad, rotationPos] = getRotationInfo(pos1, pos2, direction);

        this.setState({
            direction,
            beforeOrigin,
            rotationRad,
            rotationPos,
            pos1, pos2, pos3, pos4,
            origin: nextOrigin,
            beforeMatrix,
            targetMatrix,
            matrix,
            transformOrigin,
            targetTransform,
            left,
            top,
        });
    }
    private updateState(nextState: any, isNotSetState?: boolean) {
        const state = this.state as any;

        if (isNotSetState) {
            for (const name in nextState) {
                state[name] = nextState[name];
            }
        } else {
            this.setState(nextState);
        }
    }
}
