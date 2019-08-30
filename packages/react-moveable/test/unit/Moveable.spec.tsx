import * as React from "react";
import * as ReactDOM from "react-dom";
import MoveableExample from "./MoveableExample";
import { wait } from "./TestHelper";

describe("test Moveable", () => {
    beforeEach(() => {
        document.documentElement.style.cssText = "position: relative;height: 100%; width: 100%;margin: 0; padding: 0;";
        document.body.style.cssText = "position: relative;height: 100%; width: 100%;margin: 0;padding: 0;";
        document.body.innerHTML = `<div class="container"></div>`;
    });
    afterEach(() => {
        const container = document.querySelector(".container");

        if (container) {
            // ReactDOM.unmountComponentAtNode(container);
        }
    });
    it("test Moveable isInside", async () => {
        let moveable!: MoveableExample;

        // 300 x 220
        ReactDOM.render(<MoveableExample ref={e => {
            if (e) {
                moveable = e as any;
            }
        }}/>, document.querySelector(".container"));

        await wait(300);

        const state = moveable.innerMoveable.moveable.state;
        expect(state.width).to.be.equals(302);
        expect(state.height).to.be.equals(222);
        expect(moveable.innerMoveable.isInside(40, 40)).to.be.true;
        expect(moveable.innerMoveable.isInside(300, 40)).to.be.true;
        expect(moveable.innerMoveable.isInside(-40, 40)).to.be.false;
        expect(moveable.innerMoveable.isInside(340, 40)).to.be.false;
        expect(moveable.innerMoveable.isInside(340, 40)).to.be.false;
    });
    it("test Moveable isMoveableElement", async () => {
        let moveable!: MoveableExample;

        // Given
        // 302 x 222
        ReactDOM.render(<MoveableExample ref={e => {
            if (e) {
                moveable = e as any;
            }
        }}/>, document.querySelector(".container"));

        await wait(300);

        const isMoveable1 =
            moveable.innerMoveable.moveable.isMoveableElement(document.querySelector(".container"));
        const isMoveable2 =
            moveable.innerMoveable.moveable.isMoveableElement(document.querySelector(".moveable-control-box"));

        expect(isMoveable1).to.be.false;
        expect(isMoveable2).to.be.true;
    });
    // it("test Moveable updateTarget", async () => {
    //     let moveable!: MoveableExample;

    //     // Given
    //     // 302 x 222
    //     ReactDOM.render(<MoveableExample ref={e => {
    //         if (e) {
    //             moveable = e as any;
    //         }
    //     }}/>, document.querySelector(".container"));

    //     await wait(300);
    //     const left1 = moveable.innerMoveable.moveable.state.left;
    //     const top1 = moveable.innerMoveable.moveable.state.top;

    //     // When
    //     // document.querySelector<HTMLElement>(".c2")!.style.left = "100px";
    //     // document.querySelector<HTMLElement>(".c2")!.style.top = "100px";
    //     document.querySelector<HTMLElement>("svg")!.style.left = "100px";

    //     console.log("?");
    //     moveable.innerMoveable.moveable.updateTarget();

    //     const left2 = moveable.innerMoveable.moveable.state.left;
    //     const top2 = moveable.innerMoveable.moveable.state.top;

    //     await wait(3000);

    //     // console,l
    //     // Then
    //     expect(left2).to.be.equals(left1 + 100);
    //     expect(top2).to.be.equals(top1);
    // });
    // it("test Moveable updateRect", async () => {
    //     let moveable!: MoveableExample;

    //     // Given
    //     // 302 x 222
    //     ReactDOM.render(<MoveableExample ref={e => {
    //         if (e) {
    //             moveable = e as any;
    //         }
    //     }}/>, document.querySelector(".container"));

    //     await wait(300);
    //     const left1 = moveable.innerMoveable.moveable.state.left;
    //     const top1 = moveable.innerMoveable.moveable.state.top;

    //     // When
    //     document.querySelector<HTMLElement>(".c2")!.style.left = "100px";
    //     document.querySelector<HTMLElement>(".c2")!.style.top = "100px";
    //     document.querySelector<HTMLElement>("svg")!.style.left = "100px";

    //     moveable.innerMoveable.moveable.updateRect();

    //     const left2 = moveable.innerMoveable.moveable.state.left;
    //     const top2 = moveable.innerMoveable.moveable.state.top;

    //     await wait(3000);

    //     // Then
    //     expect(left2).to.be.equals(left1 + 200);
    //     expect(top2).to.be.equals(top1 + 100);
    // });
});
