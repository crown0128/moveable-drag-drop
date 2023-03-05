export default {
    name: "",
    props: {
        target: Object,
        dragTarget: Object,
        container: Object,
        portalContainer: Object,
        rootContainer: Object,
        useResizeObserver: Boolean,
        zoom: Number,
        transformOrigin: Array,
        edge: Object,
        ables: Array,
        className: String,
        pinchThreshold: Number,
        pinchOutside: Boolean,
        triggerAblesSimultaneously: Boolean,
        checkInput: Boolean,
        cspNonce: String,
        translateZ: Number,
        hideDefaultLines: Boolean,
        props: Object,
        flushSync: Function,
        stopPropagation: Boolean,
        preventClickEventOnDrag: Boolean,
        preventClickDefault: Boolean,
        viewContainer: Object,
        persistData: Object,
        useAccuratePosition: Boolean,
        firstRenderState: Object,
        linePadding: Boolean,
        displayAroundControls: Boolean,
        controlPadding: Number,
        preventDefault: Boolean,
    } as const,
    events: {
        onChangeTargets: "changeTargets",
    } as const,
};
