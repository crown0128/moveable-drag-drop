import * as React from "react";
import Moveable from "@/react-moveable";

export default function App(props: Record<string, any>) {
    const [translate, setTranslate]  = React.useState([0, 0]);
    const targetRef = React.useRef<HTMLDivElement>(null);
    const moveableRef = React.useRef<Moveable>(null);

    return (
        <div className="root">
            <div className="container" style={{
                transformOrigin: "0 0",
                transform: `scale(${props.containerScale})`,
            }}>
                <div style={{
                    position: "relative",
                    transform: "translate3d(0px, 0px, 100px)",
                }}>
                    <div className="target" ref={targetRef} style={{
                        transform: "translate(0px, 0px)",
                    }}>Target</div>
                </div>
                <Moveable
                    ref={moveableRef}
                    target={targetRef}
                    draggable={props.draggable}
                    throttleDrag={props.throttleDrag}
                    edgeDraggable={props.edgeDraggable}
                    startDragRotate={props.startDragRotate}
                    throttleDragRotate={props.throttleDragRotate}
                    rootContainer={document.body}
                    onDragStart={e => {
                        e.set(translate);
                    }}
                    onDrag={e => {
                        e.target.style.transform = `translate(${e.beforeTranslate[0]}px, ${e.beforeTranslate[1]}px)`;
                    }}
                    onDragEnd={e => {
                        const lastEvent = e.lastEvent;

                        if (lastEvent) {
                            setTranslate(lastEvent.beforeTranslate);
                        }
                    }}
                ></Moveable>
            </div>
        </div>
    );
}
