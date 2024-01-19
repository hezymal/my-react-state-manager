import { useEffect, useRef, useState } from "react";

const PROCESS_STATE_DONE = "DONE";
const PROCESS_STATE_PROCESSING = "PROCESSING";

const OPERATOR_TYPE_SET_INITIAL_STATE = "SET_INITIAL_STATE";
const OPERATOR_TYPE_WAIT_CALL = "WAIT_CALL";
const OPERATOR_TYPE_WAIT_STATE = "WAIT_STATE";
const OPERATOR_TYPE_WAIT_TIME = "WAIT_TIME";
const OPERATOR_TYPE_GET_STATE = "GET_STATE";
const OPERATOR_TYPE_SET_STATE = "SET_STATE";
const OPERATOR_TYPE_DONE = "DONE";

const sleep = (timeInMs) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs);
    });
};

export const setInitialState = (state) => {
    return {
        type: OPERATOR_TYPE_SET_INITIAL_STATE,
        payload: { state },
    };
};

export const waitCall = (func, ...args) => {
    return {
        type: OPERATOR_TYPE_WAIT_CALL,
        payload: { func, args },
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

export const setState = (callback) => {
    return {
        type: OPERATOR_TYPE_SET_STATE,
        payload: { callback },
    };
};

const done = () => {
    return { type: OPERATOR_TYPE_DONE };
};

const logOperator = (generator, operator, state) => {
    console.debug(generator.name + "::" + operator.type, {
        payload: operator.payload,
        state,
    });
};

export const useGenerator = (generator) => {
    const processStateRef = useRef(PROCESS_STATE_DONE);
    const instanceRef = useRef(null);
    const operatorRef = useRef(null);

    const [state, setState] = useState(() => {
        const instance = generator();
        instanceRef.current = instance;

        const result = instance.next();
        const operator = result.value;
        operatorRef.current = operator;

        if (operator.type !== OPERATOR_TYPE_SET_INITIAL_STATE) {
            throw new Error(
                `First operator should be: ${OPERATOR_TYPE_SET_INITIAL_STATE}`
            );
        }

        const state = operator.payload.state;
        logOperator(generator, operator, state);

        return state;
    });

    useEffect(() => {
        const process = async () => {
            if (processStateRef.current === PROCESS_STATE_PROCESSING) {
                return;
            }

            processStateRef.current = PROCESS_STATE_PROCESSING;

            let operator = operatorRef.current;
            if (operator?.type === OPERATOR_TYPE_DONE) {
                return;
            }

            const instance = instanceRef.current;
            let returnValue = null;
            let throwError = null;

            while (true) {
                if (!operator) {
                    let result;

                    if (throwError) {
                        result = instance.throw(throwError);
                        throwError = null;
                    } else {
                        result = instance.next(returnValue);
                        returnValue = null;
                    }

                    if (result.done) {
                        operator = done();
                    } else {
                        operator = result.value;
                    }

                    logOperator(generator, operator, state);
                }

                if (operator.type === OPERATOR_TYPE_WAIT_CALL) {
                    const { func, args } = operator.payload;
                    try {
                        returnValue = await func(...args);
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

                if (operator.type === OPERATOR_TYPE_SET_STATE) {
                    const { callback } = operator.payload;
                    setState(callback);
                    operator = null;
                    break;
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

    return [state, setState];
};
