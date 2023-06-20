const {
    ReactCroissant,
    VueWaffle,
    DefaultModulePrefixSirup,
    ModuleSirupFactory,
    TemplateSirupFactory,
    SvelteWaffle,
    ScriptWaffle,
    ScriptComponentSirupFactory,
    createInlineNewExpression,
    factory,
    AngularWaffle,
    LitWaffle,
    transform,
    copyJsxAttribute,
    copyJsxElement,
} = require("croffle");
const {
    cleanPaths,
} = require("@croffle/bakery");
const {
    decamelize,
} = require("@daybrush/utils");
const ts = require("typescript");

cleanPaths("stories/**/+([0-9A-Za-z])-*/{script,vue2,vue3,svelte,angular,lit}/");


const scriptMoveableScriptComponentSirup = ScriptComponentSirupFactory({
    path: ["moveable", "default"],
    isContainerInstance: true,
});

const scriptSelectoComponentSirup = ScriptComponentSirupFactory({
    path: ["selecto", "default"],
    instance(node) {
        const args = node.arguments;
        const elementNode = args[0];
        const optionsNode = args[1];

        return createInlineNewExpression(
            node.expression,
            [factory.createObjectLiteralExpression([
                factory.createPropertyAssignment("container", elementNode),
                ...optionsNode.properties,
            ])],
        );
    },
});

const ngxModuleSirup = ModuleSirupFactory(
    {
        module: /ngx-/g,
        name: "default",
    },
    {
        module: module => module,
        name: (_, binding) => `Ngx${binding}Component`,
    },
);

const ngxTemplateSirup = TemplateSirupFactory(
    /^Ngx(.+)Component$/g,
    text => decamelize(text.replace(/^Ngx/g, "ngx").replace(/Component$/g, ""), "-"),
);


function vueKeyconSirup(sirup) {
    sirup.requestId({
        path: [/vue[3]?-keycon/g, "useKeycon"],
        named: ["isKeydown"],
    }, node => {
        // use ref
        return sirup.utils.createInlinePropertyAccess(node, "value");
    });
}
function svelteKeyconSirup(sirup){
    sirup.requestId({
        path: [/svelte-keycon/g, "useKeycon"],
        named: ["isKeydown"],
    }, node => {
        // use writable
        return sirup.ts.factory.createIdentifier(`$${node.name.escapedText}`);
    });
}


const litTemplateAttributeSirup = sirup => {
    sirup.requestTemplate({
        module: /lit-moveable|lit-selecto/g,
        name: "default",
    }, info => {
        const nextOpeningElement = transform(info.openingElement, node => {
            if (!ts.isJsxAttribute(node)) {
                return;
            }
            const attrName = node.name.escapedText;

            if (attrName.match(/^on[A-Z]/g)) {
                return copyJsxAttribute(node, {
                    name: factory.createIdentifier(attrName.replace("on", "onLit")),
                });
            } else if (attrName === "draggable") {
                return copyJsxAttribute(node, {
                    name: factory.createIdentifier("litDraggable"),
                });
            }
        });

        const node = info.node;
        if (ts.isJsxElement(node)) {
            return copyJsxElement(node, {
                openingElement: nextOpeningElement,
            });
        } else {
            return nextOpeningElement;
        }
    });
};

const litTemplateSirup = TemplateSirupFactory(
    { module: /lit-/g, name: "default" },
    tagName => `lit-${decamelize(tagName).toLowerCase()}`,
);


/**
 * @param {import("croffle").Sirup} sirup
 */
function PreviewPropsSirup(sirup) {
    sirup.requestProps((node, { data }) => {
        if (!data.props) {
            data.props = [];
        }
        node.members.forEach(member => {
            const propName = member.name.escapedText;

            data.props.push(propName);
        });

        return sirup.utils.copyInterfaceDeclaration(node, { members: [] });
    });

    sirup.requestLifeCycle("created", (node, { data }) => {
        if (!data.props || !data.props.length) {
            return;
        }

        const statements = data.props.map(name => {
            return sirup.utils.createInlineCroffleAssignment(
                name,
                "Any",
                sirup.factory.createStringLiteral(`$preview_${name}`),
            );
        });
        const body = node.body;

        return sirup.utils.copyFunctionDeclaration(
            node,
            {
                body: sirup.factory.updateBlock(body, [
                    ...statements,
                    ...body.statements,
                ]),
            },
        );
    });
}

/**
 * @type {import("@croffle/bakery").CroffleConfig[]}
 */
const config = [
    {
        targets: "stories/**/+([0-9A-Za-z])-*/React*App.tsx",
        // targets: "stories/1-Basic/**/React*App.tsx",
        croissant: () => {
            const croissant = new ReactCroissant();

            croissant.addSirup(PreviewPropsSirup);
            croissant.addSirup(sirup => {
                sirup.convertImport("@/react-moveable", "react-moveable");
                sirup.convertImport("@/helper", "@moveable/helper");
            });
            croissant.addSirup(DefaultModulePrefixSirup);
            return croissant;
        },
        defrosted: (defrosted, croissant) => {
            const app = defrosted.app;
            const results = croissant.findUsedSpecifiers(app, "react-dom", "createPortal");

            return !results.length;
        },
        waffle: [
            // Vanilla
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];

                if (hasKeycon) {
                    return;
                }
                const waffle = new ScriptWaffle();

                waffle.addSirup(
                    scriptMoveableScriptComponentSirup,
                    scriptSelectoComponentSirup,
                );

                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
            // Vue 3
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];
                const waffle = new VueWaffle();


                if (hasKeycon) {
                    waffle.addSirup(
                        sirup => {
                            sirup.convertImport("vue3-keycon", "vue-keycon");
                        },
                        vueKeyconSirup,
                    );
                }
                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
            // Vue 2
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];
                const waffle = new VueWaffle({
                    useVue2: true,
                    useOptionsAPI: !hasKeycon,
                });

                if (hasKeycon) {
                    waffle.addSirup(
                        sirup => {
                            sirup.convertImport("vue-keycon", "vue2-keycon");
                        },
                        vueKeyconSirup,
                    );
                }
                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
            // Svelte
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];
                const waffle = new SvelteWaffle();

                if (hasKeycon) {
                    waffle.addSirup(svelteKeyconSirup);
                }
                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
            // Angular
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];

                if (hasKeycon) {
                    return;
                }
                const waffle = new AngularWaffle({
                    useTemplateUrl: true,
                });

                waffle.addSirup(
                    ngxModuleSirup,
                    ngxTemplateSirup,
                );

                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
            // Lit
            (defrosted) => {
                const hasKeycon = !!defrosted.allRequires["react-keycon"];

                if (hasKeycon) {
                    return;
                }
                const waffle = new LitWaffle();

                waffle.addSirup(
                    litTemplateAttributeSirup,
                    litTemplateSirup,
                );

                return {
                    dist: `./{type}/{name}/App{ext}`,
                    waffle,
                };
            },
        ],
    },
];


module.exports = config;
