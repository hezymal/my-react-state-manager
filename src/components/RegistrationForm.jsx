import { useMemo, useState } from "react";
import {
    getState,
    setState,
    waitState,
    waitTime,
    useGenerator,
} from "./useGenerator";

const STAGE_GENERAL = "GENERAL";
const STAGE_ADDRESS = "ADDRESS";
const STAGE_DONE = "DONE";

function fakeRequest(data, options = {}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (options.throwError) {
                reject(options.throwError);
            } else {
                resolve(options.response);
            }
        }, 1000);
    });
}

function isValidGeneral(user) {
    return !!user.name;
}

function isValidAddress(address) {
    return address.cityName.length > 3;
}

function saveGeneralInfo(user) {
    return fakeRequest(user);

    // throw error:
    // return fakeRequest(user, { throwError: new Error("Bad request") });
}

function checkAddress(address) {
    return fakeRequest(address, { response: "hash" });
}

function saveAddressInfo(address, checkingHash) {
    return fakeRequest({ ...address, checkingHash });
}

function* registryGeneralInfo(setGeneralInfo, setIsLoading, setError) {
    while (true) {
        yield waitState((state) => {
            console.log(state);
            return (
                isValidGeneral(state.generalInfo) &&
                state.generalInfo.isSubmitting
            );
        });

        setIsLoading(true);
        try {
            const state = yield getState();
            yield saveGeneralInfo(state);
            break;
        } catch (error) {
            setError(error.message);
            setGeneralInfo((state) => ({ ...state, isSubmitting: false }));
        } finally {
            setIsLoading(false);
        }
    }
}

function* registryAddressInfo(setAddressInfo, setIsLoading, setError) {
    while (true) {
        yield waitState(
            (state) =>
                isValidAddress(state.addressInfo) &&
                state.addressInfo.isSubmitting
        );

        setIsLoading(true);
        try {
            const state = yield getState();
            const checkingHash = yield checkAddress(state);
            yield saveAddressInfo(state, checkingHash);
            break;
        } catch (error) {
            setError(error.message);
            setAddressInfo((state) => ({ ...state, isSubmitting: false }));
        } finally {
            setIsLoading(false);
        }
    }
}

const useForm = () => {
    const [stage, setStage] = useState(STAGE_GENERAL);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [generalInfo, setGeneralInfo] = useState({
        name: "",
        isSubmitting: false,
    });
    const [addressInfo, setAddressInfo] = useState({
        cityName: "",
        isSubmitting: false,
    });

    const state = useMemo(
        () => ({ generalInfo, addressInfo }),
        [generalInfo, addressInfo]
    );

    useGenerator(function* registry() {
        yield* registryGeneralInfo(setGeneralInfo, setIsLoading, setError);
        setStage(STAGE_ADDRESS);

        yield* registryAddressInfo(setAddressInfo, setIsLoading, setError);
        setStage(STAGE_DONE);
    }, state);

    const submit = (event) => {
        event.preventDefault();

        switch (stage) {
            case STAGE_GENERAL:
                setGeneralInfo((state) => ({ ...state, isSubmitting: true }));
                break;

            case STAGE_ADDRESS:
                setAddressInfo((state) => ({ ...state, isSubmitting: true }));
                break;
        }
    };

    return {
        stage,
        isLoading,
        error,
        generalInfo,
        addressInfo,
        setGeneralInfo,
        setAddressInfo,
        submit,
    };
};

export const RegistrationForm = () => {
    const {
        stage,
        isLoading,
        error,
        generalInfo,
        addressInfo,
        setGeneralInfo,
        setAddressInfo,
        submit,
    } = useForm();

    const renderGeneralInfo = () => {
        return (
            <form onSubmit={submit}>
                <p>
                    <label>Your Name</label>
                    <input
                        type="text"
                        value={generalInfo.name}
                        onChange={(event) =>
                            setGeneralInfo((generalInfo) => ({
                                ...generalInfo,
                                name: event.target.value,
                            }))
                        }
                    />
                </p>
                {error && <p>{error}</p>}
                <p>
                    <button type="submit">Save General</button>
                </p>
            </form>
        );
    };

    const renderAddressInfo = () => {
        return (
            <form onSubmit={submit}>
                <p>
                    <label>City Name</label>
                    <input
                        type="text"
                        value={addressInfo.cityName}
                        onChange={(event) =>
                            setAddressInfo((addressInfo) => ({
                                ...addressInfo,
                                cityName: event.target.value,
                            }))
                        }
                    />
                </p>
                {error && <p>{error}</p>}
                <p>
                    <button type="submit">Save Address</button>
                </p>
            </form>
        );
    };

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (stage === STAGE_GENERAL) {
        return renderGeneralInfo();
    }

    if (stage === STAGE_ADDRESS) {
        return renderAddressInfo();
    }

    return <p>Conglaturation, you're registered!</p>;
};
