import { useEffect, useRef } from "react";

const PROCESS_STATE_DONE = "DONE";
const PROCESS_STATE_PROCESSING = "PROCESSING";

const OPERATOR_TYPE_WAIT_PROMISE = "WAIT_PROMISE";
const OPERATOR_TYPE_WAIT_STATE = "WAIT_STATE";
const OPERATOR_TYPE_WAIT_TIME = "WAIT_TIME";
const OPERATOR_TYPE_GET_STATE = "GET_STATE";
const OPERATOR_TYPE_DONE = "DONE";

const isFunction = (obj) => typeof obj === "function";

const isPromise = (obj) => obj && isFunction(obj.then);

const sleep = (timeInMs) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs);
    });
};

export const waitPromise = (promise) => {
    return {
        type: OPERATOR_TYPE_WAIT_PROMISE,
        payload: { promise },
    };
};

export const waitState = (predicate) => {
    return {
        type: OPERATOR_TYPE_WAIT_STATE,
        payload: { predicate },
    };
};

export const waitTime = (timeInMs) => {
    return {
        type: OPERATOR_TYPE_WAIT_TIME,
        payload: { timeInMs },
    };
};

export const getState = () => {
    return { type: OPERATOR_TYPE_GET_STATE };
};

export const done = () => {
    return { type: OPERATOR_TYPE_DONE };
};

const logOperator = (generator, operator, state) => {
    console.debug(generator.name + "::" + operator.type, {
        payload: operator.payload,
        state,
    });
};

export const useGenerator = (generator, state) => {
    const processStateRef = useRef(PROCESS_STATE_DONE);
    const iteratorRef = useRef(null);
    const operatorRef = useRef(null);

    useEffect(() => {
        const process = async () => {
            if (processStateRef.current === PROCESS_STATE_PROCESSING) {
                return;
            }

            processStateRef.current = PROCESS_STATE_PROCESSING;

            if (!iteratorRef.current) {
                iteratorRef.current = generator();
            }

            const iterator = iteratorRef.current;
            let operator = operatorRef.current;

            let returnValue = null;
            let throwError = null;

            while (true) {
                if (!operator) {
                    let result;

                    if (throwError) {
                        result = iterator.throw(throwError);
                        throwError = null;
                    } else {
                        result = iterator.next(returnValue);
                        returnValue = null;
                    }

                    if (result.done) {
                        operator = done();
                    } else if (isPromise(result.value)) {
                        operator = waitPromise(result.value);
                    } else {
                        operator = result.value;
                    }
                }

                logOperator(generator, operator, state);

                if (operator.type === OPERATOR_TYPE_WAIT_PROMISE) {
                    const { promise } = operator.payload;
                    try {
                        returnValue = await promise;
                    } catch (error) {
                        throwError = error;
                    }
                }

                if (operator.type === OPERATOR_TYPE_WAIT_STATE) {
                    const { predicate } = operator.payload;
                    if (!predicate(state)) {
                        break;
                    }
                }

                if (operator.type === OPERATOR_TYPE_WAIT_TIME) {
                    const { timeInMs } = operator.payload;
                    await sleep(timeInMs);
                }

                if (operator.type === OPERATOR_TYPE_GET_STATE) {
                    returnValue = state;
                }

                if (operator.type === OPERATOR_TYPE_DONE) {
                    break;
                }

                operator = null;
            }

            operatorRef.current = operator;
            processStateRef.current = PROCESS_STATE_DONE;
        };

        process();
    }, [generator, state]);
};
