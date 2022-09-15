import { deepFlat } from "@daybrush/utils";
import * as React from "react";
import { useKeycon } from "react-keycon";
import Selecto from "react-selecto";
import Moveable, { MoveableTargetGroupsType } from "@/react-moveable";
import "./cube.css";
import { GroupManager } from "@moveable/helper";

export default function App() {
    const { isKeydown: isCommand } = useKeycon({ keys: "meta" });
    const { isKeydown: isShift } = useKeycon({ keys: "shift" });
    const groupManagerRef = React.useRef<GroupManager>() ;
    const [targets, setTargets] = React.useState<MoveableTargetGroupsType>([]);
    const moveableRef = React.useRef<Moveable>(null);
    const selectoRef = React.useRef<Selecto>(null);
    const cubes = [];

    for (let i = 0; i < 30; ++i) {
        cubes.push(i);
    }
    const setSelectedTargets = React.useCallback((nextTargetes: MoveableTargetGroupsType) => {
        selectoRef.current!.setSelectedTargets(deepFlat(nextTargetes));
        setTargets(nextTargetes);
    }, []);
    React.useEffect(() => {
        // [[0, 1], 2], 3, 4, [5, 6], 7, 8, 9
        const elements = selectoRef.current!.getSelectableElements();

        groupManagerRef.current = new GroupManager([
            [[elements[0], elements[1]], elements[2]],
            [elements[5], elements[6], elements[7]],
        ], elements);
    }, []);

    return <div className="root">
        <div className="container">
            <Moveable
                ref={moveableRef}
                draggable={true}
                rotatable={true}
                scalable={true}
                target={targets}
                onClickGroup={e => {
                    if (!e.moveableTarget) {
                        setSelectedTargets([]);
                        return;
                    }
                    if (e.isDouble) {
                        const nextTargets = groupManagerRef!.current!.selectNextChild(targets, e.moveableTarget);
                        setSelectedTargets(nextTargets);
                        return;
                    }
                    selectoRef.current!.clickTarget(e.inputEvent, e.moveableTarget);
                }}
                onDrag={e => {
                    e.target.style.transform = e.transform;
                }}
                onRenderGroup={e => {
                    e.events.forEach(ev => {
                        ev.target.style.cssText += ev.cssText;
                    });
                }}
            ></Moveable>
            <Selecto
                ref={selectoRef}
                dragContainer={window}
                selectableTargets={[".selecto-area .cube"]}
                hitRate={0}
                selectByClick={true}
                selectFromInside={false}
                toggleContinueSelect={["shift"]}
                ratio={0}
                onDragStart={e => {
                    const moveable = moveableRef.current!;
                    const target = e.inputEvent.target;
                    // Must have use deep flat
                    const flatted = targets.flat(3) as Array<HTMLElement | SVGElement>;
                    if (
                        moveable.isMoveableElement(target)
                        || flatted.some(t => t === target || t.contains(target))
                    ) {
                        e.stop();
                    }
                }}
                onSelectEnd={e => {
                    const {
                        isDragStart,
                        isClick,
                        added,
                        removed,
                        inputEvent,
                    } = e;
                    const moveable = moveableRef.current!;

                    if (isDragStart) {
                        inputEvent.preventDefault();

                        moveable.waitToChangeTarget().then(() => {
                            moveable.dragStart(inputEvent);
                        });
                    }
                    const groupManager = groupManagerRef.current!;
                    let nextTargets = targets;

                    if (isDragStart || isClick) {
                        if (isCommand) {
                            nextTargets = groupManager.selectSingleTargets(targets, added, removed);
                        } else {
                            nextTargets = groupManager.selectCompletedTargets(targets, added, removed, isShift);
                        }
                    } else {
                        nextTargets = groupManager.selectSameDepthTargets(targets, added, removed);
                    }
                    setSelectedTargets(nextTargets);
                }}
            ></Selecto>
            <p>[[0, 1], 2] is group</p>
            <p>[5, 6, 7] is group</p>

            <div className="elements selecto-area">
                {cubes.map(i => <div className="cube" key={i}>{i}</div>)}
            </div>
            <div className="empty elements"></div>
        </div>
    </div>;
}
