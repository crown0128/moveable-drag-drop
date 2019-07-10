import Moveable from "./Moveable";
import { caculatePosition, invert3x2, caculate3x2, multiple3x2, getRad, getSize } from "./utils";

export function resizeStart(moveable: Moveable, position: number[] | undefined, { datas }: any) {
    if (!position) {
        return false;
    }
    const target = moveable.props.target;
    const {
        beforeMatrix,
    } = moveable.state;

    const [width, height] = getSize(target!);

    datas.matrix = invert3x2(beforeMatrix.slice());
    datas.position = position;
    datas.width = width;
    datas.height = height;
    datas.prevWidth = 0;
    datas.prevHeight = 0;
}
export function resize(moveable: Moveable, { datas, distX, distY }: any) {
    const {
        matrix,
        position,
        width,
        height,
        prevWidth,
        prevHeight,
    } = datas;
    const dist = caculate3x2(matrix, [distX, distY, 1]);
    let distWidth = position[0] * dist[0];
    let distHeight = position[1] * dist[1];

    // diagonal
    if (position[0] && position[1]) {
        const size = Math.sqrt(distWidth * distWidth + distHeight * distHeight);
        const rad = getRad([0, 0], dist);
        const standardRad = getRad([0, 0], position);
        const distDiagonal = Math.cos(rad - standardRad) * size;

        distWidth = distDiagonal;
        distHeight = distDiagonal * height / width;
    }

    const nextWidth = width + distWidth;
    const nextHeight = height + distHeight;

    datas.prevWidth = distWidth;
    datas.prevHeight = distHeight;


    console.log(nextWidth, nextHeight);
    moveable.props.onResize!({
        width: nextWidth,
        height: nextHeight,
        dist: [distWidth, distHeight],
        delta: [distWidth - prevWidth, distHeight - prevHeight],
    });

    moveable.updateRect();
}
export function resizeEnd(moveable: Moveable, { isDrag }: any) {
    moveable.props.onScaleEnd!({ isDrag });
    if (isDrag) {
        moveable.updateRect();
    }
}
