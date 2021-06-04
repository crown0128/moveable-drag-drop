import { prefix, getControlTransform } from "../utils";
import { Renderer, OriginOptions, MoveableManagerInterface } from "../types";
import { makeAble } from "./AbleManager";

export default makeAble("origin", {
    render(moveable: MoveableManagerInterface<OriginOptions>, React: Renderer): any[] {
        const { zoom } = moveable.props;
        const { beforeOrigin, rotation } = moveable.state;

        return [
            <div className={prefix("control", "origin")}
                style={getControlTransform(rotation, zoom!, beforeOrigin)} key="beforeOrigin"></div>,
        ];
    },
});

/**
 * Whether or not the origin controlbox will be visible or not (default: true)
 * @name Moveable#origin
 * @example
 * import Moveable from "moveable";
 *
 * const moveable = new Moveable(document.body);
 *
 * moveable.origin = true;
 */
