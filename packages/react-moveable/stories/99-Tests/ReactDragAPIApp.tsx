import React, { useEffect, useRef, useState } from "react";
import Moveable from "@/react-moveable";


export default function App() {
    const moveableRef = useRef<Moveable>(null);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    return (
        <div className="container">
            <div style={{
                width: "500px",
                height: "500px",
                border: "1px solid black",
            }} onDragEnter={e => {
                const nativeEvent = e.nativeEvent;

                if (!target) {
                    moveableRef.current!.waitToChangeTarget().then(() => {
                        moveableRef.current!.dragStart(nativeEvent);
                    });
                    setTarget(document.querySelector<HTMLElement>("#drag1"));
                }
            }}></div>
            <img
                id="drag1"
                src="https://www.w3schools.com/html/img_w3slogo.gif"
                draggable="true"
                onDragOver={e => {
                    e.preventDefault();
                }}
            />
            <Moveable
                ref={moveableRef}
                target={target}
                draggable={true}
                preventDefault={false}
                onDrag={e => {
                    e.target.style.cssText += e.cssText;
                }}
            />
        </div>
    );
}
