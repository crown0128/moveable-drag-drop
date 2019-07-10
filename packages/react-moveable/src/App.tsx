import React from "react";
import Moveable from "./react-moveable";
import logo from "./logo.svg";
import "./App.css";
import { ref } from "framework-utils";

class App extends React.Component {
    public moveable: Moveable;
    public state = {
        target: null,
    };
    public deg = 18;
    public render() {
        const target = this.state.target;

        return (
            <div>
                <Moveable
                    target={target} ref={ref(this, "moveable")}
                    onRotate={({ delta, transform }) => {
                        target!.style.transform = transform;
                    }}
                    onDrag={({ transform, left, top }) => {
                        // target!.style.left = `${left}px`;
                        // target!.style.top = `${top}px`;
                        target!.style.transform = transform;
                    }}
                    onScale={({ transform }) => {
                        target!.style.transform = transform;
                    }}
                />
                <div className="App" onMouseDown={this.onClick}>

                    <header className="App-header">
                        <img src={logo} className="App-logo" alt="logo" />
                        <p>
                            Edit <code>src/App.tsx</code> and save to reload.
                        </p>
                        <a
                            className="App-link"
                            rel="noopener noreferrer"
                        >
                            Learn React
                        </a>
                    </header>
                </div>
            </div>
        );
    }
    public onClick = (e: any) => {
        console.log("?", e.target.className);
        e.preventDefault();
        if (!this.moveable.isMoveableElement(e.target)) {
            if (this.state.target === e.target) {
                this.moveable.updateRect();
            } else {
                this.setState({
                    target: e.target,
                });
            }
        }
    }
}

export default App;
