import { prefixCSS } from "framework-utils";

export const PREFIX = "moveable-";
export const MOVEABLE_CSS = prefixCSS(PREFIX, `
{
    position: fixed;
    width: 0;
    height: 0;
    left: 0;
    top: 0;
    z-index: 3000;
}
.line, .control {
    left: 0;
    top: 0;
}
.control {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-sizing: border-box;
    background: #4af;
    margin-top: -7px;
    margin-left: -7px;
}
.line {
    position: absolute;
    width: 1px;
    height: 1px;
    background: #4af;
    transform-origin: 0px 0.5px;
}
.line.rotation {
    height: 40px;
    width: 1px;
    transform-origin: 0.5px 39.5px;
}
.line.rotation .control {
    border-color: #4af;
    background:#fff;
    cursor: alias;
}
.control.e, .control.w {
    cursor: ew-resize;
}
.control.s, .control.n {
    cursor: ns-resize;
}
.control.nw, .control.se, :host.reverse .control.ne, :host.reverse .control.sw {
    cursor: nwse-resize;
}
.control.ne, .control.sw, :host.reverse .control.nw, :host.reverse .control.se {
    cursor: nesw-resize;
}
`);
