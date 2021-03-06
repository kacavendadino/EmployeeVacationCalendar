import 'isomorphic-fetch';

export interface IBasicFetchOptions {
    jsonResponseExpected?: boolean;
    requestInit?: RequestInit;
    responseActionPayloadMapper?(responsePayload): any;
}

export interface IReduxFetchOptions extends IBasicFetchOptions {
    action: string;
    requestActionPayload?: any;
}

export class Fetcher {
    private readonly init: RequestInit = {
        mode: 'cors',
        method: 'GET',
        credentials: 'include',
        // X-Requested-With serves so ASP.NET Core wont return 302, but 401 on unauthorized
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };

    public fetch = (url: string, fetchOptions: IBasicFetchOptions) => {
        const options = { ...fetchOptions };
        const newInit: RequestInit = {
            ...this.init,
            ...options.requestInit
        };

        return Promise.resolve(this.fetchImplementation(url, newInit, options));
    }

    public reduxFetch = (url: string, reduxFetchOptions: IReduxFetchOptions, dispatch: any) => {
        dispatch({
            type: actionUtils.requestAction(reduxFetchOptions.action),
            payload: reduxFetchOptions.requestActionPayload
        });

        return this.fetch(url, reduxFetchOptions).then(result => {
            dispatch({
                type: actionUtils.responseAction(reduxFetchOptions.action),
                payload: result
            });

            return Promise.resolve(result);
        }).catch(error => {
            dispatch({
                type: actionUtils.errorAction(reduxFetchOptions.action),
                payload: error
            });

            throw error;
        });
    }

    private fetchImplementation = (fullUrl: string, newInit: RequestInit, options: IBasicFetchOptions) => {
        return fetch(fullUrl, newInit)
            .then(response => {
                if (response.ok) {
                    if (options.jsonResponseExpected) {
                        return response.json().then(jsonResponse => {
                            return Promise.resolve(options.responseActionPayloadMapper ? options.responseActionPayloadMapper(jsonResponse) : jsonResponse);
                        });
                    }

                    return Promise.resolve();
                } else {
                    let payload = { status: response.status, body: null };
                    return response
                        .json()
                        .then(errorResponse => {
                            payload = { ...payload, body: errorResponse };
                            return Promise.reject(payload);
                        })
                        .catch(err => Promise.reject(payload));
                }
            });
    }
}

export const actionUtils = {
    requestAction(action: string): string {
        return `${action}_REQUEST`;
    },

    responseAction(action: string): string {
        return `${action}_RESPONSE`;
    },

    errorAction(action: string): string {
        return `${action}_ERROR`;
    },
};

const fetcher = new Fetcher();
export default fetcher;
