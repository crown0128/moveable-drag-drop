import { Able, MoveableManagerInterface, MoveableGroupInterface } from "./types";
import { IObject } from "@daybrush/utils";
import { convertDragDist } from "./utils";
import Dragger from "@daybrush/drag";
import BeforeRenderable from "./ables/BeforeRenderable";
import Renderable from "./ables/Renderable";

export function triggerAble<T extends IObject<any>>(
    moveable: MoveableManagerInterface<any, any>,
    ableType: string,
    eventOperation: string,
    eventAffix: string,
    eventType: any,
    e: any,
    requestInstant?: boolean,
) {
    const isStart = eventType === "Start";
    const target = moveable.state.target;
    const isRequest = e.isRequest;

    if (
        !target
        || (isStart && eventAffix.indexOf("Control") > -1
            && !isRequest && moveable.areaElement === e.inputEvent.target)
    ) {
        return false;
    }
    const eventName = `${eventOperation}${eventAffix}${eventType}`;
    const conditionName = `${eventOperation}${eventAffix}Condition`;
    const isEnd = eventType === "End";
    const isAfter = eventType.indexOf("After") > -1;
    const isFirstStart = isStart && (
        !moveable.targetDragger || !moveable.controlDragger
        || (!moveable.targetDragger.isFlag() || !moveable.controlDragger.isFlag())
    );

    if (isFirstStart) {
        moveable.updateRect(eventType, true, false);
    }
    if (eventType === "" && !isAfter) {
        convertDragDist(moveable.state, e);
    }
    const isGroup = eventAffix.indexOf("Group") > -1;
    const ables: Able[] = [BeforeRenderable, ...(moveable as any)[ableType].slice(), Renderable];

    if (isRequest) {
        const requestAble = e.requestAble;
        if (!ables.some(able => able.name === requestAble)) {
            ables.push(...moveable.props.ables!.filter(able => able.name === requestAble));
        }
    }

    if (!ables.length) {
        return false;
    }
    const events = ables.filter((able: any) => able[eventName]);
    const datas = e.datas;

    if (isFirstStart) {
        events.forEach(able => {
            able.unset && able.unset(moveable);
        });
    }

    const inputEvent = e.inputEvent;
    let inputTarget: Element;

    if (isEnd && inputEvent) {
        inputTarget = document.elementFromPoint(e.clientX, e.clientY) || inputEvent.target;
    }
    const results = events.filter((able: any) => {
        const hasCondition = isStart && able[conditionName];
        const ableName = able.name;
        const nextDatas = datas[ableName] || (datas[ableName] = {});

        if (!hasCondition || able[conditionName](e, moveable)) {
            return able[eventName](moveable, { ...e, datas: nextDatas, originalDatas: datas, inputTarget });
        }
        return false;
    });
    const isUpdate = results.length;
    const isForceEnd = isStart && events.length && !isUpdate;

    if (isEnd || isForceEnd) {
        moveable.state.dragger = null;

        if ((moveable as MoveableGroupInterface).moveables) {
            (moveable as MoveableGroupInterface).moveables.forEach(childMoveable => {
                childMoveable.state.dragger = null;
            });
        }
    }
    if (isFirstStart && isForceEnd) {
        events.forEach(able => {
            able.unset && able.unset(moveable);
        });
    }
    if (moveable.isUnmounted || isForceEnd) {
        return false;
    }
    if ((!isStart && isUpdate && !requestInstant) || isEnd) {
        if (results.some(able => able.updateRect) && !isGroup) {
            moveable.updateRect(eventType, false, false);
        } else {
            moveable.updateRect(eventType, true, false);
        }
        moveable.forceUpdate();
    }
    if (!isStart && !isEnd && !isAfter && isUpdate) {
        triggerAble(moveable, ableType, eventOperation, eventAffix, eventType + "After", e);
    }
}

export function getTargetAbleDragger<T>(
    moveable: MoveableManagerInterface<T>,
    moveableTarget: HTMLElement | SVGElement,
    eventAffix: string,
) {
    const controlBox = moveable.controlBox.getElement();
    const targets: Array<HTMLElement | SVGElement> = [];

    targets.push(controlBox);

    if (!moveable.props.dragArea) {
        targets.push(moveableTarget);
    }

    const startFunc = (e: any) => {
        const eventTarget = e.inputEvent.target;
        const areaElement = moveable.areaElement;

        return eventTarget === areaElement
            || !moveable.isMoveableElement(eventTarget)
            || eventTarget.className.indexOf("moveable-area") > -1
            || eventTarget.className.indexOf("moveable-padding") > -1;
    };

    return getAbleDragger(moveable, targets, "targetAbles", eventAffix, {
        dragstart: startFunc,
        pinchstart: startFunc,
    });
}
export function getAbleDragger<T>(
    moveable: MoveableManagerInterface<T>,
    target: HTMLElement | SVGElement | Array<HTMLElement | SVGElement>,
    ableType: string,
    eventAffix: string,
    conditionFunctions: IObject<any> = {},
) {
    const {
        pinchOutside,
        pinchThreshold,
    } = moveable.props;
    const options: IObject<any> = {
        container: window,
        pinchThreshold,
        pinchOutside,
    };
    ["drag", "pinch"].forEach(eventOperation => {
        ["Start", "", "End"].forEach(eventType => {
            const eventName = `${eventOperation}${eventType.toLowerCase()}`;
            options[eventName]
                = (e: any) => {
                    if (conditionFunctions[eventName] && !conditionFunctions[eventName](e)) {
                        return false;
                    }
                    return triggerAble(moveable, ableType, eventOperation, eventAffix, eventType, e);
                };
        });
    });

    return new Dragger(target!, options);
}
