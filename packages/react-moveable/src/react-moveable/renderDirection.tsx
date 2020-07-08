import { prefix, getControlTransform, throttle } from "./utils";
import { ResizableProps, ScalableProps, WarpableProps, Renderer, MoveableManagerInterface } from "./types";
import { DIRECTION_INDEXES, DIRECTION_ROTATIONS, DIRECTIONS } from "./consts";
import { IObject } from "@daybrush/utils";

export function renderControls(
    moveable: MoveableManagerInterface<Partial<ResizableProps & ScalableProps & WarpableProps>>,
    defaultDirections: string[],
    React: Renderer,
): any[] {
    const {
        renderPoses,
        rotation,
    } = moveable.state;
    const {
        renderDirections: directions = defaultDirections,
    } = moveable.props;
    const {
        direction,
    } = moveable.state;

    const directionMap: IObject<boolean> = {};
    directions.forEach(dir => {
        directionMap[dir] = true;
    });
    return directions.map(dir => {
        const indexes = DIRECTION_INDEXES[dir];

        if (!indexes || !directionMap[dir]) {
            return null;
        }
        let directionRotation = throttle(rotation / Math.PI * 180, 15) + DIRECTION_ROTATIONS[dir];

        if (direction < 1) {
            directionRotation = 360 - directionRotation;
        }
        directionRotation %= 180;

        return (
            <div className={prefix("control", "direction", dir)}
                data-rotation={directionRotation} data-direction={dir} key={`direction-${dir}`}
                style={getControlTransform(rotation, ...indexes.map(index => renderPoses[index]))}></div>
        );
    });
}
export function renderAllDirections(
    moveable: MoveableManagerInterface<Partial<ResizableProps & ScalableProps & WarpableProps>>,
    React: Renderer,
) {
    return renderControls(moveable, DIRECTIONS, React);
}
export function renderDiagonalDirections(
    moveable: MoveableManagerInterface<Partial<ResizableProps & ScalableProps & WarpableProps>>,
    React: Renderer,
): any[] {
    return renderControls(moveable, ["nw", "ne", "sw", "se"], React);
}
