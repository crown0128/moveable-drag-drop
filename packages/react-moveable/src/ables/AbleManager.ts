import { Able, DefaultProps } from "../types";

export function makeAble<
    Name extends string,
    AbleObject extends Partial<Able<any, any>>,
    Props extends DefaultProps<Name, AbleObject>,
>(name: Name, able: AbleObject) {
    return {
        events: {} as const,
        props: {
            [name]: Boolean,
        } as Props,
        name,
        ...able,
    } as const;
}
