declare module 'react-bootstrap' {
    import {ComponentType} from 'react';

    type ModalType = ComponentType<any> & {
        Header: ComponentType<any>;
        Title: ComponentType<any>;
        Body: ComponentType<any>;
        Footer: ComponentType<any>;
    };

    export const Modal: ModalType;
}
