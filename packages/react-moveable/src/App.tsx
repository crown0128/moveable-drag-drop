import React from "react";
import Moveable from "./react-moveable";
import logo from "./logo.svg";
import "./App.css";
import { ref } from "framework-utils";
import KeyController from "keycon";
import { setAlias, Frame } from "scenejs";
import { IObject } from "@daybrush/utils";


setAlias("tx", ["transform", "translateX"]);
setAlias("ty", ["transform", "translateY"]);
setAlias("tz", ["transform", "translateZ"]);
setAlias("rotate", ["transform", "rotate"]);
setAlias("sx", ["transform", "scaleX"]);
setAlias("sy", ["transform", "scaleY"]);
setAlias("matrix3d", ["transform", "matrix3d"]);

class App extends React.Component {
    public moveable: Moveable;
    public state = {
        target: null,
        isResizable: true,
        item: null,
    } as {
        target: any,
        isResizable: boolean,
        item: Frame,
    };
    private items: IObject<Frame> = {};
    public render() {
        const selectedTarget = this.state.target;
        const isResizable = this.state.isResizable;
        const item = this.state.item;
        (window as any).a = this;
        return (
            <div>
                <Moveable
                    target={selectedTarget}
                    container={document.body}
                    ref={ref(this, "moveable")}
                    keepRatio={false}

                    draggable={true}
                    // scalable={!isResizable}
                    // resizable={isResizable}
                    warpable={true}
                    throttleDrag={0}
                    throttleScale={0}
                    throttleResize={0}
                    throttleRotate={0}
                    rotatable={true}
                    onRotate={({ target, beforeDelta }) => {
                        item.set("rotate", `${parseFloat(item.get("rotate")) + beforeDelta}deg`);
                        target.style.cssText += item.toCSS();
                    }}
                    onDrag={({ target, beforeDelta }) => {

                        item.set("tx", `${parseFloat(item.get("tx")) + beforeDelta[0]}px`);
                        item.set("ty", `${parseFloat(item.get("ty")) + beforeDelta[1]}px`);
                        // target!.style.left = `${left}px`;
                        // target!.style.top = `${top}px`;
                        target.style.cssText += item.toCSS();
                    }}
                    onScale={({ target, dist }) => {
                        // console.log(delta);
                        item.set("sx", item.get("sx") * dist[0]);
                        item.set("sy", item.get("sy") * dist[1]);

                        target.style.cssText += item.toCSS();
                    }}
                    onResize={({ target, width, height, delta }) => {
                        delta[0] && (target!.style.width = `${width}px`);
                        delta[1] && (target!.style.height = `${height}px`);
                    }}
                    onWarp={({ target, delta, multiply }) => {
                        const matrix3d = item.get("matrix3d");

                        if (!matrix3d) {
                            item.set("matrix3d", delta);
                        } else {
                            item.set("matrix3d", multiply(item.get("matrix3d"), delta, 4));
                        }
                        target.style.cssText += item.toCSS();
                    }}
                />
                <div className="App" onMouseDown={this.onClick} data-target="app">

                    <header className="App-header" data-target="header">
                        <img src={logo} className="App-logo" alt="logo" data-target="logo" />
                        <p data-target="p">
                            Edit <code data-target="code">src/App.tsx</code> and save to reload.
                        </p>
                        <a
                            className="App-link"
                            rel="noopener noreferrer"
                            data-target="link"
                        >
                            Learn React
                        </a>
                    </header>
                </div>
            </div>
        );
    }
    public onClick = (e: any) => {
        const target = e.target;
        const id = target.getAttribute("data-target");
        e.preventDefault();

        const keycon = new KeyController(window);

        keycon.keydown("shift", () => {
            this.setState({ isResizable: false });
        }).keyup("shift", () => {
            this.setState({ isResizable: true });
        });

        if (!id) {
            return;
        }
        const items = this.items;
        if (!items[id]) {
            items[id] = new Frame({
                tz: "5px",
                tx: "0px",
                ty: "0px",
                rotate: "0deg",
                sx: 1,
                sy: 1,
            });
        }

        if (!this.moveable.isMoveableElement(e.target)) {
            if (this.state.target === e.target) {
                this.moveable.updateRect();
            } else {
                this.setState({
                    target: e.target,
                    item: items[id],
                });
            }
        }
    }
}

export default App;
