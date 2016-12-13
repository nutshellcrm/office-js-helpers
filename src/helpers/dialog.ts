/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */
import { Utilities } from './utilities';
import { DialogError } from '../errors/dialog';

interface DialogResult {
    type: 'string' | 'object' | null,
    value: any
}

/**
 * An optimized size object computed based on Screen Height & Screen Width
 */
export interface IDialogSize {
    /**
     * Max available width in pixels
     */
    width: number;

    /**
     * Max available width in percentage
     */
    width$: number;

    /**
     * Max available height in pixels
     */
    height: number;

    /**
     * Max available height in percentage
     */
    height$: number;
}

export class Dialog<T> {
    /**
     * @constructor
     *
     * @param url Url to be opened in the dialog.
     * @param width Width of the dialog.
     * @param height Height of the dialog.
    */
    constructor(
        public url: string = location.origin,
        private width?: number,
        private height?: number
    ) {
        if (!Utilities.isAddin) {
            throw new DialogError('This API cannot be used outside of Office.js');
        }

        if (!(/^https/.test(url))) {
            throw new DialogError('URL has to be loaded over HTTPS.');
        }

        this.size = this._optimizeSize(width, height);
    }

    private _result: Promise<T>;
    get result(): Promise<T> {
        if (this._result == null) {
            this._result = this._open();
        }

        return this._result;
    }

    size: IDialogSize;

    /**
     * Opens a new dialog and returns a promise.
     * The promise only resolves if the dialog was closed using the `close` function.
     * If the user dismisses the dialog, the promise rejects.
     */
    private _open(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            Office.context.ui.displayDialogAsync(this.url, { width: this.size.width$, height: this.size.height$ }, (result: Office.AsyncResult) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    throw new DialogError(result.error.message);
                }
                else {
                    let dialog = result.value as Office.DialogHandler;
                    dialog.addEventHandler(Office.EventType.DialogMessageReceived, args => {
                        try {
                            resolve(args.message);
                        }
                        catch (exception) {
                            reject(new DialogError('An unexpected error in the dialog has occured.', exception));
                        }
                        finally {
                            dialog.close();
                        }
                    });

                    dialog.addEventHandler(Office.EventType.DialogEventReceived, args => {
                        try {
                            reject(new DialogError(args.message, args.error));
                        }
                        catch (exception) {
                            reject(new DialogError('An unexpected error in the dialog has occured.', exception));
                        }
                        finally {
                            dialog.close();
                        }
                    });
                }
            });
        });
    }

    /**
     * Close any open dialog by providing an optional message.
     * If more than one dialogs are attempted to be opened
     * an expcetion will be created.
     */
    static close(message?: any) {
        if (!Utilities.isAddin) {
            throw new DialogError('This API cannot be used outside of Office.js');
        }

        let type;

        if (message == null) {
            type = null;
        }
        else if (typeof message === 'string') {
            type = 'string';
        }
        else if (typeof message === 'function') {
            throw new DialogError('Invalid message. Canno\'t pass functions as arguments');
        }
        else {
            type = 'object';
        }

        try {
            Office.context.ui.messageParent(JSON.stringify(<DialogResult>{ type, value: message }));
        }
        catch (error) {
            throw new DialogError('Canno\'t close dialog', error);
        }
    }

    private _getSize(width: number, height: number) {
        let screenWidth = window.screen.width;

        if (width && height) {
            return this._optimizeSize(width, height);
        }
        else if (screenWidth <= 640) {
            return this._optimizeSize(640, 480);
        }
        else if (screenWidth <= 1366) {
            return this._optimizeSize(1024, 768);
        }
        else if (screenWidth <= 1920) {
            return this._optimizeSize(1600, 900);
        }
    }

    private _optimizeSize(width: number, height: number): IDialogSize {
        let screenWidth = window.screen.width;
        let screenHeight = window.screen.height;

        let optimizedWidth = this._maxSize(width, screenWidth);
        let optimizedHeight = this._maxSize(height, screenHeight);

        return {
            width$: this._percentage(optimizedWidth, screenWidth),
            height$: this._percentage(optimizedHeight, screenHeight),
            width: optimizedWidth,
            height: optimizedHeight
        };
    }

    private _maxSize(value: number, max: number) {
        return value < (max - 30) ? value : max - 30;
    };

    private _percentage(value: number, max: number) {
        return (value * 100 / max);
    }

    private _safeParse(data: string) {
        try {
            let result = JSON.parse(data);
            return result;
        }
        catch (e) {
            return data;
        }
    }
}