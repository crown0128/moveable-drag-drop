import Moveable from ".";
import { getDragDist, setDragStart } from "./Dragger";
import { throttleArray } from "./utils";
import { minus } from "./matrix";

export function dragStart(moveable: Moveable, { datas, clientX, clientY }: any) {
    const target = moveable.props.target!;
    const style = window.getComputedStyle(target);
    const {
        targetTransform,
    } = moveable.state;

    datas.datas = {};
    datas.left = parseFloat(style.left || "") || 0;
    datas.top = parseFloat(style.top || "") || 0;
    datas.bottom = parseFloat(style.bottom || "") || 0;
    datas.right = parseFloat(style.right || "") || 0;
    datas.transform = targetTransform;

    setDragStart(moveable, { datas });

    datas.prevDist = [0, 0];
    datas.prevBeforeDist = [0, 0];
    return moveable.props.onDragStart!({
        datas: datas.datas,
        target,
        clientX,
        clientY,
    });
}
export function drag(moveable: Moveable, { datas, distX, distY, clientX, clientY, inputEvent }: any) {
    inputEvent.preventDefault();
    inputEvent.stopPropagation();

    const target = moveable.props.target!;
    const throttleDrag = moveable.props.throttleDrag!;
    const { prevDist, prevBeforeDist, transform } = datas;

    const beforeDist = getDragDist({ datas, distX, distY }, true);
    const dist = getDragDist({ datas, distX, distY }, false);

    throttleArray(dist, throttleDrag);
    throttleArray(beforeDist, throttleDrag);

    const delta = minus(dist, prevDist);
    const beforeDelta = minus(beforeDist, prevBeforeDist);

    datas.prevDist = dist;
    datas.prevBeforeDist = beforeDist;

    const left = datas.left + beforeDist[0];
    const top = datas.top + beforeDist[1];
    const right = datas.right - beforeDist[0];
    const bottom = datas.bottom - beforeDist[1];
    const nextTransform = `${transform} translate(${dist[0]}px, ${dist[1]}px)`;

    if (delta.every(num => !num) && beforeDelta.some(num => !num)) {
        return;
    }
    moveable.props.onDrag!({
        datas: datas.datas,
        target,
        transform: nextTransform,
        dist,
        delta,
        beforeDist,
        beforeDelta,
        left,
        top,
        right,
        bottom,
        clientX,
        clientY,
    });
    moveable.updateTarget();
}

export function dragEnd(moveable: Moveable, { datas, isDrag, clientX, clientY }: any) {
    const { target, onDragEnd } = moveable.props;
    onDragEnd!({
        target: target!,
        isDrag,
        clientX,
        clientY,
        datas: datas.datas,
    });
    if (isDrag) {
        moveable.updateRect();
    }
}
