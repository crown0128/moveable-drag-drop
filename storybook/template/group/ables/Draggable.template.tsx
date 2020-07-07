import * as React from "react";
import Moveable from "react-moveable";
import { DRAG_GROUP_START_TEMPLATE, DRAG_GROUP_TEMPLATE } from "../events.template";
import { DRAGGABLE_TEMPLATE_OPTIONS } from "../../basic/ables/Draggable.template";

export default function DraggableApp(props: any) {
    const [target, setTarget] = React.useState<HTMLElement>();
    const [frames] = React.useState([
        { translate: [0, 0] },
        { translate: [0, 0] },
        { translate: [0, 0] },
    ]);
    React.useEffect(() => {
        setTarget([].slice.call(document.querySelectorAll<HTMLElement>(".target")!));
    }, []);

    const {
        rootChildren = d => d,
        children = [
            <div className="target target1">Target1</div>,
            <div className="target target2">Target2</div>,
            <div className="target target3">Target3</div>,
        ],
        ...moveableProps
    } = props;
    return rootChildren(<div className="container">
        {children}
        <Moveable
            target={target}
            draggable={true}
            {...moveableProps}
            onDragGroupStart={e => {
                e.events.forEach((ev, i) => {
                    ev.set(frames[i].translate);
                });
            }}
            onDragGroup={e => {
                e.events.forEach((ev, i) => {
                    frames[i].translate = ev.beforeTranslate;
                    ev.target.style.transform
                        = `translate(${ev.beforeTranslate[0]}px, ${ev.beforeTranslate[1]}px)`;
                });
            }}
        />
    </div>);
}

export const GROUP_DRAGGABLE_TEMPLATE_OPTIONS = {
    ...DRAGGABLE_TEMPLATE_OPTIONS,
    events: {
        dragGroupStart: DRAG_GROUP_START_TEMPLATE,
        dragGroup: DRAG_GROUP_TEMPLATE,
    },
};
