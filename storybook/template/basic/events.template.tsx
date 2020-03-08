import { previewFunction } from "storybook-addon-preview";

export const DRAG_START_TEMPLATE = previewFunction(`function onDragStart({ set }) {
    set(this.frame.translate);
}`);
export const DRAG_TEMPLATE = previewFunction(`function onDrag({ target, beforeTranslate }) {
    this.frame.translate = beforeTranslate;
    target.style.transform = ${"`"}translate(${"$"}{beforeTranslate[0]}px, ${"$"}{beforeTranslate[1]}px)${"`"};
}`);

export const RESIZE_START_TEMPLATE = previewFunction(`function onResizeStart({ setOrigin, dragStart }) {
    setOrigin(["%", "%"]);
    dragStart && dragStart.set(this.frame.translate);
}`);
export const RESIZE_TEMPLATE = previewFunction(`function onResize({ target, width, height, drag }) {
    const beforeTranslate = drag.beforeTranslate;

    this.frame.translate = beforeTranslate;
    target.style.width = ${"`"}${"$"}{width}px${"`"};
    target.style.height = ${"`"}${"$"}{height}px${"`"};
    target.style.transform = ${"`"}translate(${"$"}{beforeTranslate[0]}px, ${"$"}{beforeTranslate[1]}px)${"`"};
}`);

export const SCALE_START_TEMPLATE = previewFunction(`function onScaleStart({ set, dragStart }) {
    set(this.frame.scale);
    dragStart && dragStart.set(this.frame.translate);
}`);
export const SCALE_TEMPLATE = previewFunction(`function onScale({ target, scale, drag }) {
    const beforeTranslate = drag.beforeTranslate;

    this.frame.translate = beforeTranslate;
    this.frame.scale = scale;
    target.style.transform = ${"`"}translate(${"$"}{beforeTranslate[0]}px, ${"$"}{beforeTranslate[1]}px) scale(${"$"}{scale[0]}, ${"$"}{scale[1]})${"`"};
}`);

export const ROTATE_START_TEMPLATE = previewFunction(`function onRotateStart({ set }) {
    set(this.frame.rotate);
}`);
export const ROTATE_TEMPLATE = previewFunction(`function onRotate({ beforeRotate }) {
    this.frame.rotate = beforeRotate;
    target.style.transform = ${"`"}rotate(${"$"}{beforeRotate}deg)${"`"};
}`);

export const WARP_START_TEMPLATE = previewFunction(`function onWarpStart({ set }) {
    set(this.frame.matrix);
}`);
export const WARP_TEMPLATE = previewFunction(`function onWarp({ matrix }) {
    this.frame.matrix = matrix;
    target.style.transform = ${"`"}matrix3d(${"$"}{matrix.join(",")})${"`"};
}`);
